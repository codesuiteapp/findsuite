import * as cp from "child_process";
import { arch, platform } from "node:process";
import path from "path";
import { quote } from "shell-quote";
import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import logger from "./utils/logger";

const MAX_DESC_LENGTH = 128;
const MAX_BUF_SIZE = 200000 * 1024;

export class RipgrepSearch {

    private workspaceFolders: string[];
    private projectRoot: string;
    private rgPath;
    private query: string[] = [];
    private scrollBack: QuickPickItemWithLine[] = [];
    private rgDefOption: string;

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
        this.projectRoot = this.workspaceFolders[0] || ".";
        this.rgPath = this.getRgPath(context.extensionUri.fsPath);
        this.rgDefOption = FindSuiteSettings.defaultOption;
    }

    public async execute(opt: string, replaceQuery: boolean = false, skipQuote: boolean = false) {
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = 'RipGrep: Search text';
        quickPick.placeholder = 'Please enter the string to search';
        quickPick.ignoreFocusOut = true;
        quickPick.matchOnDescription = true;

        const isOption = (s: string) => /^--?[a-z]+/.test(s);
        const isWordQuoted = (s: string) => /^".*"/.test(s);
        quickPick.items = this.scrollBack;

        if (replaceQuery) {
            quickPick.value = opt;
            opt = '';
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

                    acc.push(skipQuote ? curr : curr.replace(/"/g, ""));
                    return acc;
                }
                acc[acc.length - 1] = acc[acc.length - 1] + ` ${curr}`;
                return acc;
            }, [] as string[]);

            if (skipQuote) {
                quickPick.items = await this.fetchGrepItems([this.rgPath, this.rgDefOption, ...this.query, "."].join(' '), opt, this.projectRoot, replaceQuery, skipQuote);
            } else {
                quickPick.items = await this.fetchGrepItems([this.rgPath, this.rgDefOption, quote([...this.query]), "."].join(' '), opt, this.projectRoot, replaceQuery, skipQuote);
            }
            quickPick.title = `RipGrep: Search text <${this.query}> Results <${quickPick.items.length}>`;
        });

        quickPick.onDidAccept(async () => {
            const item = quickPick.selectedItems[0] as QuickPickItemWithLine;
            if (!item) {
                return;
            }
            const scrollBackItem = {
                label: this.query.join(" "),
                description: "History",
                num: this.scrollBack.length + 1,
                option: item.option,
                replaceQuery: replaceQuery,
                skipQuote: skipQuote
            };

            // Scrollback history is limited to 10 items
            if (this.scrollBack.length > 10) {
                this.scrollBack.shift();
            }
            this.scrollBack.unshift(scrollBackItem);

            if (item.description === "History") {
                const history = item.label.split(/\s/);
                quickPick.items = await this.fetchGrepItems([this.rgPath, item.option, history, "."].join(' '), opt, this.projectRoot, replaceQuery, skipQuote);
                // quickPick.items = await this.fetchGrepItems([this.rgPath, item.option, quote([...item.label.split(/\s/)]), "."].join(' '), '', this.projectRoot);
                quickPick.title = `RipGrep: Search text <${item.label}> Results <${quickPick.items.length}>`;
                return;
            }

            await this.openChoiceFile(item);
            quickPick.dispose();
        });

        quickPick.onDidChangeActive(async () => {
            const item = quickPick.selectedItems[0] as QuickPickItemWithLine;
            if (!item) {
                return;
            }

            await this.openChoiceFile(item);
        });

        quickPick.show();
    }

    private async fetchGrepItems(command: string, opt: string, projectRoot: string, replaceQuery: boolean = false, skipQuote: boolean = false): Promise<QuickPickItemWithLine[]> {
        console.log(`command <${command}> opt <${opt}>`);
        const cmd = `${command} ${opt}`;
        logger.debug(cmd);

        const grepPromise: Promise<QuickPickItemWithLine[]> = new Promise((resolve, reject) => {
            cp.exec(cmd, { cwd: projectRoot, maxBuffer: MAX_BUF_SIZE }, (err, stdout, stderr) => {
                console.log(`error <${err}> stderr <${stderr}>`);
                if (stderr) {
                    logger.error(stderr);
                    vscode.window.showErrorMessage(stderr);
                    return resolve([]);
                }
                const lines = stdout.split(/\n/).filter((l) => l !== "");
                console.log(`lines <${lines?.length ?? 0}>`);

                if (!lines.length) {
                    return resolve([]);
                }

                const results = lines.map((line) => {
                    const [fullPath, num, ...desc] = line.split(":");
                    const description = desc.join(":").trim();
                    return {
                        label: `${path.basename(fullPath)}:${num}`,
                        detail: fullPath.replace(/\\/g, '/'),
                        description: description.length > MAX_DESC_LENGTH ? description.substring(0, MAX_DESC_LENGTH) : description,
                        num: Number(num),
                        option: opt + ' ' + this.rgDefOption,
                        replaceQuery: replaceQuery,
                        skipQuote: skipQuote
                    };
                });

                console.log(`results <${results?.length ?? 0}>`);
                return resolve(results);
            });
        });

        grepPromise.catch((error: any) => {
            console.error('An error occurred while reading the file:', error.message);
        });
        return grepPromise;
    }

    private async openChoiceFile(item: QuickPickItemWithLine) {
        const { detail, num } = item;
        const doc = await vscode.workspace.openTextDocument(this.projectRoot + "/" + detail);

        const editor = await vscode.window.showTextDocument(doc);
        if (!vscode.window.activeTextEditor) {
            vscode.window.showErrorMessage("No active editor.");
            return;
        }

        const line = num - 1;
        const selection = new vscode.Selection(~~line, 0, ~~line, 0);
        editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
        editor.selection = selection;
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

// export async function registerRipgrep(rgExtPath: string, query: string[], scrollBack: QuickPickItemWithLine[]) {
//     const rgPath = getRgPath(rgExtPath);
//     const quickPick = vscode.window.createQuickPick();
//     quickPick.title = 'RipGrep: Search text';
//     quickPick.placeholder = 'Please enter the string to search';
//     quickPick.matchOnDescription = true;

//     const isOption = (s: string) => /^--?[a-z]+/.test(s);
//     const isWordQuoted = (s: string) => /^".*"/.test(s);
//     quickPick.items = scrollBack;

//     quickPick.onDidChangeValue(async (item) => {
//         if (!item || item === "") {
//             return;
//         }
//         query = item.split(/\s/).reduce((acc, curr, index) => {
//             console.log(`acc <${acc}> curr <${curr}> index <${index}>`);
//             if (index === 0 || isOption(curr) || isOption(acc[acc.length - 1])) {
//                 if (!isWordQuoted(curr) && !isOption(curr)) {
//                     acc.push('-i', curr);
//                     return acc;
//                 }
//                 acc.push(curr.replace(/"/g, "")); // remove quotes
//                 return acc;
//             }
//             acc[acc.length - 1] = acc[acc.length - 1] + ` ${curr}`;
//             return acc;
//         }, [] as string[]);

//         quickPick.items = await fetchGrepItems(quote([rgPath, this.defaultOption, ...query, "."]), '', projectRoot);
//         quickPick.title = `RipGrep: Search text <${query[1]}> Results <${quickPick.items.length}>`;
//     });

//     quickPick.onDidAccept(async () => {
//         const scrollBackItem = {
//             label: query.join(" "),
//             description: "History",
//             num: scrollBack.length + 1,
//         };

//         // Scrollback history is limited to 10 items
//         if (scrollBack.length > 10) {
//             scrollBack.shift();
//         }
//         scrollBack.unshift(scrollBackItem);

//         const item = quickPick.selectedItems[0] as QuickPickItemWithLine;
//         if (!item) {
//             return;
//         }
//         if (item.description === "History") {
//             // Add ability to select history item to replace current search
//             quickPick.items = await fetchGrepItems(quote([rgPath, this.defaultOption, ...item.label.split(/\s/), "."]), '', projectRoot);
//             return;
//         }

//         await openChoiceFile(item);
//     });

//     quickPick.onDidChangeActive(async () => {
//         const item = quickPick.selectedItems[0] as QuickPickItemWithLine;
//         if (!item) {
//             return;
//         }

//         await openChoiceFile(item);
//     });

//     quickPick.show();
// }

// export async function openChoiceFile(item: QuickPickItemWithLine) {
//     const { detail, num } = item;
//     const doc = await vscode.workspace.openTextDocument(
//         projectRoot + "/" + detail
//     );

//     const editor = await vscode.window.showTextDocument(doc);
//     if (!vscode.window.activeTextEditor) {
//         vscode.window.showErrorMessage("No active editor.");
//         return;
//     }

//     const line = num - 1;
//     const selection = new vscode.Selection(~~line, 0, ~~line, 0);
//     editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
//     editor.selection = selection;
// }

// export function getRgPath(rgExtPath: string) {
//     const rgVer = "14_1_0";
//     const basePath = `${rgExtPath}/bin/${rgVer}`;
//     switch (platform) {
//         case "win32":
//             return `${basePath}/${platform}/rg.exe`;
//         case "darwin":
//             return `${basePath}/${platform}/rg`;
//         case "linux":
//             if (arch === "arm" || arch === "arm64") {
//                 return `${basePath}/${platform}-armv7/rg`;
//             } else {
//                 return `${basePath}/${platform}/rg`;
//             }
//         default:
//             return "rg";
//     }
// }

// export function fetchGrepItems(command: string, opt: string, projectRoot: string): Promise<QuickPickItemWithLine[]> {
//     console.log(`command <${command}> opt <${opt}>`);
//     const cmd = `${command} ${opt}`;
//     logger.debug(cmd);

//     return new Promise((resolve, reject) => {
//         cp.exec(cmd, { cwd: projectRoot, maxBuffer: MAX_BUF_SIZE }, (err, stdout, stderr) => {
//             console.log(`error <${err}> stderr <${stderr}>`);
//             if (stderr) {
//                 logger.error(stderr);
//                 vscode.window.showErrorMessage(stderr);
//                 return resolve([]);
//             }
//             const lines = stdout.split(/\n/).filter((l) => l !== "");
//             console.log(`lines <${lines}>`);

//             if (!lines.length) {
//                 return resolve([]);
//             }

//             return resolve(lines
//                 .map((line) => {
//                     const [fullPath, num, ...desc] = line.split(":");
//                     const description = desc.join(":").trim();
//                     return {
//                         fullPath,
//                         num: Number(num),
//                         line,
//                         description,
//                     };
//                 })
//                 .filter(({ description, num }) =>
//                     description.length < MAX_DESC_LENGTH && !!num
//                 )
//                 .map(({ fullPath, num, line, description }) => {
//                     const path1 = fullPath.split("/");
//                     return {
//                         label: `${path.basename(path1[path1.length - 1])}:${num}`,
//                         description,
//                         detail: fullPath,
//                         num,
//                     };
//                 })
//             );
//         }
//         );
//     });
// }

export interface QuickPickItemWithLine extends vscode.QuickPickItem {
    num: number;
    option: string;
    replaceQuery: boolean;
    skipQuote: boolean;
}
