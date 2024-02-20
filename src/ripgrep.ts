import * as cp from "child_process";
import { arch, platform } from "node:process";
import path from "path";
import { quote } from "shell-quote";
import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import { QuickPickItemResults, QuickPickItemRgData, RgQuery, RgSummaryData } from "./model/ripgrep";
import { getSelectionText } from "./utils/editor";
import logger from "./utils/logger";
import { notifyMessageWithTimeout } from "./utils/vsc";

const MAX_BUF_SIZE = 200000 * 1024;

const emptyRgData: QuickPickItemResults = {
    total: 0,
    items: []
};

export class RipgrepSearch {

    private workspaceFolders: string[];
    private projectRoot: string;
    private rgPath;
    private query: string[] = [];
    private scrollBack: QuickPickItemRgData[] = [];
    private rgDefOption: string;

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
        this.projectRoot = this.workspaceFolders[0] || ".";
        this.rgPath = this.getRgPath(context.extensionUri.fsPath);
        this.rgDefOption = FindSuiteSettings.defaultOption;
    }

    public async execInteract(rgQuery: RgQuery) {
        const quickPick = vscode.window.createQuickPick<QuickPickItemRgData>();
        quickPick.title = 'RipGrep: Search text';
        quickPick.placeholder = 'Please enter the string to search';
        quickPick.ignoreFocusOut = true;
        quickPick.matchOnDetail = true;
        // quickPick.matchOnDescription = true;

        const isOption = (s: string) => /^--?[a-z]+/.test(s);
        const isWordQuoted = (s: string) => /^".*"/.test(s);
        quickPick.items = this.scrollBack;

        if (rgQuery.replaceQuery) {
            quickPick.value = rgQuery.opt;
            rgQuery.opt = '';
        } else {
            const txt = getSelectionText();
            if (txt) {
                quickPick.value = txt;
            }
        }

        quickPick.onDidChangeValue(async (item) => {
            if (!item || item === "") {
                return;
            }
            this.query = item.split(/\s/).reduce((acc, curr, index) => {
                if (index === 0 || isOption(curr) || isOption(acc[acc.length - 1])) {
                    if (!isWordQuoted(curr) && !isOption(curr)) {
                        acc.push(curr);
                        return acc;
                    }

                    acc.push(rgQuery.skipQuote ? curr : curr.replace(/"/g, ""));
                    return acc;
                }
                acc[acc.length - 1] = acc[acc.length - 1] + ` ${curr}`;
                return acc;
            }, [] as string[]);

            quickPick.items = [];
            try {
                if (!rgQuery.srchPath) {
                    rgQuery.srchPath = this.projectRoot;
                }
                let result: QuickPickItemResults;
                if (rgQuery.skipQuote) {
                    result = await this.fetchGrepItems([this.rgPath, this.rgDefOption, ...this.query].join(' '), rgQuery);
                } else {
                    result = await this.fetchGrepItems([this.rgPath, this.rgDefOption, quote([...this.query])].join(' '), rgQuery);
                }
                quickPick.items = result.items;
                // quickPick.items = await this.fetchGrepItems([this.rgPath, item.option, quote([...item.label.split(/\s/)]), rgQuery.srchPath].join(' '), '', path);
                quickPick.title = `RipGrep: Search ${rgQuery.title} <${this.query}> :: Results <${quickPick.items.length} / ${result.total}>`;
            } catch (error: any) {
                console.log(`fetchGrepItems() - Error: ${error.message}`);
                logger.error(`fetchGrepItems() - Error: ${error.message}`);
            }
        });

        quickPick.onDidAccept(async () => {
            const item = quickPick.selectedItems[0] as QuickPickItemRgData;
            if (!item) {
                return;
            }
            const scrollBackItem = {
                label: this.query.join(" "),
                description: "History",
                line_number: this.scrollBack.length + 1,
                start: 0,
                end: 0,
                option: item.option,
                replaceQuery: rgQuery.replaceQuery,
                skipQuote: rgQuery.skipQuote
            };

            if (this.scrollBack.length > 10) {
                this.scrollBack.shift();
            }
            this.scrollBack.unshift(scrollBackItem);

            if (item.description === "History") {
                const history = item.label.split(/\s/);
                const result = await this.fetchGrepItems([this.rgPath, item.option, history, rgQuery.srchPath].join(' '), rgQuery);
                quickPick.items = result.items;
                // quickPick.items = await this.fetchGrepItems([this.rgPath, item.option, quote([...item.label.split(/\s/)]), rgQuery.srchPath].join(' '), '', this.projectRoot);
                quickPick.title = `RipGrep: Search text <${item.label}> :: Results <${quickPick.items.length} / ${result.total}>`;
                return;
            }

            await this.openChoiceFile(item);
            quickPick.dispose();
        });

        quickPick.show();
    }

    public async execute(rgQuery: RgQuery) {
        const txt = getSelectionText();
        if (!txt) {
            const mesg = 'Ripgrep: Query is empty';
            logger.error(mesg);
            notifyMessageWithTimeout(mesg);
            return;
        }

        const result = await this.fetchGrepItems([this.rgPath, txt].join(' '), rgQuery);
        await vscode.window.showQuickPick(result.items, {
            title: `RipGrep: Search text <${rgQuery.title}> :: Results <${result.items.length} / ${result.total}>`,
            placeHolder: txt,
            matchOnDetail: true,
            matchOnDescription: true
        }).then(async (item) => {
            if (item) {
                await this.openChoiceFile(item);
            }
        });
    }

    private async fetchGrepItems(command: string, rgQuery: RgQuery): Promise<QuickPickItemResults> {
        if (!rgQuery.opt) {
            rgQuery.opt = this.rgDefOption;
        }
        const cmd = `${command} ${rgQuery.opt} "${rgQuery.srchPath ?? this.projectRoot}" --json`;
        console.log(`command <${command}> opt <${rgQuery.opt}>`);
        console.log(`cmd <${cmd}>`);
        logger.debug(`cmd <${cmd}>`);

        return new Promise((resolve, reject) => {
            cp.exec(cmd, { cwd: ".", maxBuffer: MAX_BUF_SIZE }, (err, stdout, stderr) => {
                console.log(`error <${err}> stderr <${stderr}>`);
                if (stderr) {
                    logger.error(stderr);
                    vscode.window.showErrorMessage(stderr);
                    return resolve(emptyRgData);
                }
                const lines = stdout.split(/\n/).filter((l) => l !== "");
                console.log(`lines <${lines?.length ?? 0}>`);

                if (!lines.length) {
                    return resolve(emptyRgData);
                }

                let cnt = 0;
                const results = lines.map((line) => {
                    return JSON.parse(line);
                }).filter((json) => {
                    if (cnt < FindSuiteSettings.rgCount && json.type === 'match') {
                        cnt++;
                        return true;
                    }
                    return false;
                }).map((json) => {
                    const data = json.data;
                    return {
                        label: `${path.basename(data.path.text)}:${data.line_number}:${data.submatches[0].start}`,
                        description: data.path.text.replace(/\\/g, '/'),
                        detail: `${data.lines.text.trim()} `,
                        start: data.submatches[0].start,
                        end: data.submatches[0].end,
                        line_number: Number(data.line_number),
                        option: rgQuery.opt,
                        replaceQuery: rgQuery.replaceQuery,
                        skipQuote: rgQuery.skipQuote
                    };
                });

                let summary: RgSummaryData | undefined = undefined;
                if (lines && lines.length > 0) {
                    summary = JSON.parse(lines[lines.length - 1]) as RgSummaryData;
                }

                console.log(`results <${results?.length ?? 0}> summary <${summary?.data.stats.matched_lines ?? 0} / ${summary?.data.stats.matches ?? 0}>`);
                return resolve({
                    total: summary?.data.stats.matched_lines ?? 0,
                    items: results
                });
            });
        });
    }

    private async openChoiceFile(item: QuickPickItemRgData) {
        const doc = await vscode.workspace.openTextDocument(item.description!);
        const editor = await vscode.window.showTextDocument(doc);
        if (!vscode.window.activeTextEditor) {
            vscode.window.showErrorMessage("No active editor");
            return;
        }

        const line = item.line_number - 1;
        const selection = new vscode.Selection(~~line, item.start, ~~line, item.start);
        editor.selection = selection;
        editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    }

    private getRgPath(rgExtPath: string) {
        const rgVer = "14_1_0";
        const basePath = `${rgExtPath}/bin/${rgVer}`;
        switch (platform) {
            case "win32":
                return `${rgExtPath}\\bin\\${rgVer}\\${platform}\\rg.exe`;
            case "darwin":
                return `${basePath}/${platform}/rg`;
            case "linux":
                if (arch === "arm" || arch === "arm64") {
                    return `${basePath}/${platform}-armv7/rg`;
                } else {
                    return `${basePath}/${platform}/rg`;
                }
            default:
                return "rg";
        }
    }

}
