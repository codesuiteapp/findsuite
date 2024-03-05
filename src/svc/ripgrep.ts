import * as cp from "child_process";
import * as fs from 'fs';
import { arch, platform } from "node:process";
import path from "path";
import { quote } from "shell-quote";
import * as vscode from "vscode";
import FindSuiteSettings from "../config/settings";
import { QuickPickItemResults, QuickPickItemRgData, RgQuery, RgSummaryData } from "../model/ripgrep";
import { getSelectionText } from "../utils/editor";
import logger from "../utils/logger";
import { notifyMessageWithTimeout } from "../utils/vsc";

const MAX_BUF_SIZE = 200000 * 1024;

const emptyRgData: QuickPickItemResults = {
    total: 0,
    items: []
};

export class RipgrepSearch {

    private _workspaceFolders: string[];

    private projectRoot: string;
    private rgProgram;
    private query: string[] = [];
    // private scrollBack: QuickPickItemRgData[] = [];
    private rgDefOption: string;

    private _checked: boolean = false;

    public get checked(): boolean {
        return this._checked;
    }
    public set checked(value: boolean) {
        this._checked = value;
    }

    private _currentDecoration: vscode.TextEditorDecorationType | null = null;

    public get currentDecoration(): vscode.TextEditorDecorationType | null {
        return this._currentDecoration;
    }

    public set currentDecoration(value: vscode.TextEditorDecorationType | null) {
        this._currentDecoration = value;
    }

    constructor(private context: vscode.ExtensionContext) {
        this._workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
        this.projectRoot = this.workspaceFolders[0] || ".";
        this.rgDefOption = FindSuiteSettings.defaultOption;
        this.rgProgram = this.getRipgrep(context.extensionUri.fsPath);
    }

    public get workspaceFolders(): string[] {
        return this._workspaceFolders;
    }

    public async interact(rgQuery: RgQuery) {
        const quickPick = vscode.window.createQuickPick<QuickPickItemRgData>();
        quickPick.title = 'RipGrep: Text';
        quickPick.placeholder = 'Please enter the string to search';
        quickPick.ignoreFocusOut = true;
        quickPick.matchOnDetail = true;
        // quickPick.matchOnDescription = true;

        const isOption = (s: string) => /^--?[a-z]+/.test(s);
        const isWordQuoted = (s: string) => /^".*"/.test(s);
        // quickPick.items = this.scrollBack;

        if (rgQuery.replaceQuery) {
            quickPick.value = rgQuery.opt;
            rgQuery.opt = '';
        } else {
            const txt = getSelectionText(true);
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
                    result = await this.fetchGrepItems([this.rgProgram, ...this.query].join(' '), rgQuery);
                } else {
                    result = await this.fetchGrepItems([this.rgProgram, quote([...this.query])].join(' '), rgQuery);
                }
                quickPick.items = result.items;
                // quickPick.items = await this.fetchGrepItems([this.rgPath, item.option, quote([...item.label.split(/\s/)]), rgQuery.srchPath].join(' '), '', path);
                quickPick.title = `RipGrep: ${rgQuery.title} <${this.query}> :: Results <${quickPick.items.length} / ${result.total}>`;
            } catch (error: any) {
                console.log(`fetchGrepItems() - Error: ${error.message}`);
                logger.error(`fetchGrepItems() - Error: ${error.message}`);
            }
        });

        quickPick.onDidChangeActive(async (selection) => {
            if (selection && selection.length > 0) {
                const item = selection[0] as QuickPickItemRgData;
                await this.openChoiceFile(item, { preserveFocus: true, preview: true });
            }
        });

        quickPick.onDidAccept(async () => {
            const item = quickPick.selectedItems[0] as QuickPickItemRgData;
            if (!item) {
                return;
            }

            await this.openChoiceFile(item);
            quickPick.dispose();
        });

        quickPick.show();
    }

    public async execute(rgQuery: RgQuery, query: string | undefined = undefined) {
        try {
            this.checkingProgram();
        } catch (error: any) {
            notifyMessageWithTimeout(error.message);
            return;
        }

        let txt = query ?? getSelectionText(true);
        if (!txt) {
            txt = await vscode.window.showInputBox({
                title: `RipGrep: Text to search`,
                placeHolder: 'Please enter filename to search'
            }).then(res => {
                return res ?? '';
            });
        }
        if (!txt) {
            const mesg = 'Ripgrep: Query is empty';
            logger.error(mesg);
            notifyMessageWithTimeout(mesg);
            return;
        }

        const result = await this.fetchGrepItems([this.rgProgram, `"${txt}"`].join(' '), rgQuery);
        if (rgQuery.isMany) {
            const items = await vscode.window.showQuickPick(result.items, {
                title: `RipGrep: Text <${rgQuery.title}> :: Results <${result.items.length} / ${result.total}>`,
                placeHolder: txt,
                canPickMany: true,
                matchOnDetail: true,
                matchOnDescription: true
            });

            if (items) {
                items.forEach(async (item) => {
                    await this.openChoiceFile(item);
                });
            }
        } else {
            await vscode.window.showQuickPick<QuickPickItemRgData>(result.items, {
                title: `RipGrep: Text <${rgQuery.title}> :: Results <${result.items.length} / ${result.total}>`,
                placeHolder: txt,
                ignoreFocusOut: true,
                matchOnDetail: true,
                matchOnDescription: true,
                onDidSelectItem: async (item: QuickPickItemRgData) => {
                    await this.openChoiceFile(item, { preserveFocus: true, preview: true });
                }
            }).then(async (item) => {
                if (item) {
                    await this.openChoiceFile(item);
                } else if (vscode.window.activeTextEditor) {
                    this.clearDecoration(vscode.window.activeTextEditor);
                }
            });
        }
    }

    public async executeAfterFind(results: vscode.QuickPickItem[]) {
        if (results) {
            const query = await vscode.window.showInputBox({
                title: `Ripgrep :: Enter text to search Files <${results.length}>`,
                prompt: 'Please enter filename to search',
                value: getSelectionText(true)
            }).then(res => {
                return res ?? '';
            });

            if (!query) {
                const mesg = 'Ripgrep: Query is empty';
                console.log(mesg);
                notifyMessageWithTimeout(mesg);
                return;
            }

            const rgQuery: RgQuery = {
                title: 'text',
                opt: '',
                srchPath: `${results.map(item => '"' + item.detail + '"').join(' ')}`,
                replaceQuery: false,
                skipQuote: true,
                isMany: true
            };
            await this.execute(rgQuery, query);
        }
    }

    private async fetchGrepItems(command: string, rgQuery: RgQuery): Promise<QuickPickItemResults> {
        if (!rgQuery.opt) {
            rgQuery.opt = this.rgDefOption;
        }
        const cmd = `${command} -n ${rgQuery.opt} ${rgQuery.srchPath ?? this.projectRoot} --json`;
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
                        label: `$(file) ${path.basename(data.path.text)}:${data.line_number}:${data.submatches[0].start}`,
                        description: data.path.text.replace(/\\/g, '/'),
                        detail: data.lines.text.trim(),
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

    private clearDecoration(editor: vscode.TextEditor) {
        if (editor && this.currentDecoration) {
            editor.setDecorations(this.currentDecoration, []);
        }
    }

    private async openChoiceFile(item: QuickPickItemRgData, options?: vscode.TextDocumentShowOptions) {
        const doc = await vscode.workspace.openTextDocument(item.description!);
        const editor = await vscode.window.showTextDocument(doc, options);
        this.clearDecoration(editor);

        if (!vscode.window.activeTextEditor) {
            vscode.window.showErrorMessage("No active editor");
            return;
        }

        const line = item.line_number - 1;
        const selection = new vscode.Selection(~~line, item.start, ~~line, item.start);
        editor.selection = selection;
        editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);

        if (options) {
            this.currentDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'yellow'
            });
            const range = new vscode.Range(line, item.start, line, item.end);
            editor.setDecorations(this.currentDecoration, [range]);
        }
    }

    private getRipgrep(rgExtPath: string) {
        if (FindSuiteSettings.rgInternalEnabled) {
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
        } else {
            switch (platform) {
                case "win32": return FindSuiteSettings.rgWin32Program;
                case "darwin": return FindSuiteSettings.rgMacProgram;
                default: return FindSuiteSettings.rgLinuxProgram;
            }
        }
    }

    private checkingProgram() {
        if (this._checked) {
            return;
        }

        const programName = this.rgProgram;
        if (platform !== 'win32') {
            cp.exec(`which ${programName}`, (error, stdout, stderr) => {
                if (error) {
                    throw new Error(`Error checking for ${programName}: ${error.message}`);
                }
                if (stderr) {
                    throw new Error(`Error checking for ${programName}: ${stderr}`);
                }
                const programPath = stdout.trim();
                if (!programPath) {
                    throw new Error(`${programName} is not installed.`);
                }
                console.log(`${programName} is installed at:`, programPath);
            });
        }

        if (FindSuiteSettings.rgInternalEnabled && platform !== 'win32') {
            fs.chmod(programName, '755', (err: any) => {
                if (err) {
                    console.error('Error adding execute permission:', err);
                    return;
                }
                console.log(programName + ' permission added successfully.');
            });
        }
        this._checked = true;
    }

}
