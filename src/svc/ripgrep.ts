import * as cp from "child_process";
import * as fs from 'fs';
import { arch, platform } from "node:process";
import path from "path";
import { quote } from "shell-quote";
import { v4 as uuidv4 } from 'uuid';
import * as vscode from "vscode";
import FindSuiteSettings from "../config/settings";
import { rgHeaderButtons, searchButtons, searchHeaderButtons } from "../model/button";
import { QuickPickItemResults } from "../model/fd";
import { QuickPickItemRgData, RgQuery, RgSummaryData, rgInitQuery } from "../model/ripgrep";
import { notifyWithProgress, showInfoMessageWithTimeout } from "../ui/ui";
import { copyClipboardFilePath, copyClipboardFiles, getSelectionText, openRevealFile } from "../utils/editor";
import logger from "../utils/logger";
import { executeFavoriteWindow, executeHistoryWindow, notifyMessageWithTimeout } from "../utils/vsc";
import { vscExtension } from "../vsc-ns";
import { Constants } from "./constants";
import { showMultipleDiffs2 } from "./diff";

const MAX_BUF_SIZE = 200000 * 1024;

const emptyRgData: QuickPickItemResults<QuickPickItemRgData> = {
    total: 0,
    matches: 0,
    items: []
};

export class RipgrepSearch {

    private _workspaceFolders: string[];

    private rgProgram;
    private rgDefOption: string;

    private _currentDecoration: vscode.TextEditorDecorationType | null = null;
    private _bgColor!: string;

    private _checked: boolean = false;

    constructor(private context: vscode.ExtensionContext) {
        this._workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
        this.rgDefOption = FindSuiteSettings.defaultOption;
        this.rgProgram = this.getRipgrep(context.extensionUri.fsPath);
        const currentTheme = vscode.window.activeColorTheme.kind;
        this.bgColor = this.getColorForTheme(currentTheme);
    }

    public get workspaceFolders(): string[] {
        return this._workspaceFolders;
    }

    public async interact(rgQuery: RgQuery) {
        const quickPick = vscode.window.createQuickPick<QuickPickItemRgData>();
        quickPick.title = 'RipGrep: Text';
        quickPick.placeholder = 'Please enter the string to search';
        quickPick.canSelectMany = rgQuery.isMany;
        quickPick.ignoreFocusOut = true;
        quickPick.matchOnDetail = true;
        quickPick.matchOnDescription = true;
        if (rgQuery.isMany) {
            quickPick.buttons = rgHeaderButtons;
        }

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

            quickPick.items = [];
            try {
                if (!rgQuery.srchPath) {
                    rgQuery.srchPath = quote(this._workspaceFolders);
                }

                const result = await this.fetchGrepItems(this.rgProgram, quickPick.value, rgQuery);
                quickPick.items = result.items;
                // quickPick.items = await this.fetchGrepItems([this.rgPath, item.option, quote([...item.label.split(/\s/)]), rgQuery.srchPath].join(' '), '', path);
                quickPick.title = `RipGrep: ${rgQuery.title} <${quickPick.value}> :: Files <${result.total}>`;
            } catch (error: any) {
                console.log(`fetchGrepItems() - Error: ${error.message}`);
                logger.error(`fetchGrepItems() - Error: ${error.message}`);
                notifyMessageWithTimeout(error.message);
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

        quickPick.onDidTriggerButton(async (e) => {
            const items = quickPick.selectedItems as unknown as vscode.QuickPickItem[];
            if (e.tooltip === Constants.DIFF_BUTTON) {
                await showMultipleDiffs2(items, 'file');
            } else if (e.tooltip === Constants.CLIP_COPY_BUTTON) {
                copyClipboardFiles(items);
            } else if (e.tooltip === Constants.ADD_CLIP_BUTTON) {
                copyClipboardFiles(items, true);
            } else if (e.tooltip === Constants.FAVOR_WINDOW_BUTTON) {
                await executeFavoriteWindow();
            } else if (e.tooltip === Constants.HISTORY_WINDOW_BUTTON) {
                await executeHistoryWindow();
            }
        });

        quickPick.onDidTriggerItemButton(async (e) => {
            if (e.button.tooltip === Constants.VIEW_BUTTON) {
                await this.openChoiceFile(e.item);
            } else if (e.button.tooltip === Constants.CLIP_COPY_BUTTON) {
                copyClipboardFilePath(e.item.description!);
            } else if (e.button.tooltip === Constants.ADD_CLIP_BUTTON) {
                copyClipboardFilePath(e.item.description!, true);
            } else if (e.button.tooltip === Constants.FAVORITE_BUTTON) {
                vscExtension.favoriteManager.addItem(e.item.description!);
            }
        });

        quickPick.onDidHide(() => {
            const e = vscode.window.activeTextEditor;
            e && this.clearDecoration(e);
        });

        quickPick.show();
    }

    public async execute1(rgQuery: RgQuery, query: string | undefined = undefined, isRegex: boolean = false) {
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
                placeHolder: 'Please enter filename to search',
                prompt: rgQuery.prompt,
            }).then(res => {
                return res ?? '';
            });
        }

        if (!txt) {
            this.notifyEmptyQuery('Ripgrep: Query is empty');
            return;
        }

        const result = await notifyWithProgress(`Searching <${txt?.trim()}>`, async () => {
            return await this.fetchGrepItems(this.rgProgram, txt, rgQuery, isRegex);
        });
        if (result === undefined) {
            return;
        }

        const historyMap = vscExtension._historyMap;
        const historyMayArray = historyMap.values();
        const existEntry = Array.from(historyMayArray).find(entry => entry.query === txt);
        if (existEntry) {
            console.log(`exist:: id <${existEntry.id}>`);
            historyMap.delete(existEntry.id);
        }

        if (historyMap.size >= Constants.HISTORY_MAX) {
            const historyEntries = Array.from(historyMayArray).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            const entry = historyEntries.shift();
            entry && historyMap.delete(entry?.id);
        }

        const id = uuidv4();
        historyMap.set(id, {
            id,
            query: txt,
            timestamp: new Date(),
            total: result.total,
            fileEntries: result.items,
        });

        const quickPick = vscode.window.createQuickPick<QuickPickItemRgData>();
        quickPick.title = `RipGrep: Text <${rgQuery.title}> :: Files <${result.total}> Matches <${result.matches}>`;
        quickPick.canSelectMany = rgQuery.isMany;
        quickPick.matchOnDetail = true;
        quickPick.matchOnDescription = true;
        quickPick.buttons = searchHeaderButtons;
        quickPick.items = result.items;

        quickPick.onDidAccept(async () => {
            const items = quickPick.selectedItems as QuickPickItemRgData[];
            if (!items || items.length === 0) {
                return;
            }

            if (vscode.window.activeTextEditor) {
                this.clearDecoration(vscode.window.activeTextEditor);
            }
            items.forEach(async (item) => {
                await this.openChoiceFile(item);
            });
            quickPick.dispose();
        });

        quickPick.onDidTriggerButton(async (e) => {
            // const items = quickPick.selectedItems as unknown as vscode.QuickPickItem;
            if (e.tooltip === Constants.FAVOR_WINDOW_BUTTON) {
                await executeFavoriteWindow();
            } else if (e.tooltip === Constants.HISTORY_WINDOW_BUTTON) {
                await executeHistoryWindow();
            }
        });

        quickPick.onDidTriggerItemButton(async (e) => {
            if (e.button.tooltip === Constants.VIEW_BUTTON) {
                await this.openChoiceFile(e.item);
            } else if (e.button.tooltip === Constants.CLIP_COPY_BUTTON) {
                copyClipboardFilePath(e.item.description!);
            } else if (e.button.tooltip === Constants.ADD_CLIP_BUTTON) {
                copyClipboardFilePath(e.item.description!, true);
            } else if (e.button.tooltip === Constants.FAVORITE_BUTTON) {
                vscExtension.favoriteManager.addItem(e.item.description!);
            }
        });

        quickPick.show();
    }

    public async execute(rgQuery: RgQuery, query: string | undefined = undefined, isRegex: boolean = false) {
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
                placeHolder: 'Please enter filename to search',
                prompt: rgQuery.prompt
            }).then(res => {
                return res ?? '';
            });
        }

        await this.executeItem(rgQuery, txt, isRegex);
    }

    private async executeItem(rgQuery: RgQuery, query: string | undefined = undefined, isRegex: boolean = false) {
        if (!query) {
            this.notifyEmptyQuery('Ripgrep: Query is empty');
            return;
        }

        const result = await notifyWithProgress(`Searching <${query?.trim()}>`, async () => {
            return await this.fetchGrepItems(this.rgProgram, query, rgQuery, isRegex);
        });
        if (result === undefined) {
            return;
        }

        if (rgQuery.isMany) {
            const items = await vscode.window.showQuickPick(result.items, {
                title: `RipGrep: Text <${rgQuery.title}> :: Results <${result.total}>`,
                placeHolder: query,
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
                title: `RipGrep: Text <${rgQuery.title}> :: Results <${result.total}>`,
                placeHolder: query,
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

    public async executeWs(rgQuery: RgQuery, query: string | undefined = undefined, isRegex: boolean = false) {
        try {
            this.checkingProgram();
        } catch (error: any) {
            notifyMessageWithTimeout(error.message);
            return;
        }

        const quickPick = vscode.window.createQuickPick<QuickPickItemRgData>();
        quickPick.title = `RipGrep: Text`;
        quickPick.placeholder = query ?? getSelectionText(true);
        quickPick.value = query ?? getSelectionText(true);
        quickPick.canSelectMany = rgQuery.isMany;
        quickPick.ignoreFocusOut = true;
        quickPick.matchOnDetail = true;
        quickPick.matchOnDescription = true;
        quickPick.buttons = searchHeaderButtons;
        // quickPick.items = convertQuickPickItem(vscExtension.historyManager.historyMap);

        quickPick.onDidChangeValue(async (item) => {
            if (!item || item === "") {
                return;
            }

            const result = await notifyWithProgress(`Searching <${item}>`, async () => {
                return await this.fetchGrepItems(this.rgProgram, item, rgQuery, isRegex);
            });
            if (result !== undefined) {
                quickPick.items = result.items;
                quickPick.title = `Ripgrep: <${item}> :: Results <${result.total}>`;
            }
        });

        quickPick.onDidChangeActive(async (item) => {
            console.log(`item <${item}>`);
        });

        quickPick.onDidAccept(async () => {
            const items = quickPick.selectedItems as QuickPickItemRgData[];
            if (!items || items.length === 0) {
                return;
            }

            if (vscode.window.activeTextEditor) {
                this.clearDecoration(vscode.window.activeTextEditor);
            }
            items.forEach(async (item) => {
                await this.openChoiceFile(item);
            });
            quickPick.dispose();
        });

        quickPick.onDidTriggerButton(async (e) => {
            // const items = quickPick.selectedItems as unknown as vscode.QuickPickItem;
            if (e.tooltip === Constants.FAVOR_WINDOW_BUTTON) {
                await executeFavoriteWindow();
            }
        });

        quickPick.onDidTriggerItemButton(async (e) => {
            if (e.button.tooltip === Constants.VIEW_BUTTON) {
                await this.openChoiceFile(e.item);
            } else if (e.button.tooltip === Constants.CLIP_COPY_BUTTON) {
                copyClipboardFilePath(e.item.description!);
            } else if (e.button.tooltip === Constants.ADD_CLIP_BUTTON) {
                copyClipboardFilePath(e.item.description!, true);
            } else if (e.button.tooltip === Constants.FAVORITE_BUTTON) {
                vscExtension.favoriteManager.addItem(e.item.description!);
            }
        });

        quickPick.show();
    }

    private async executeRegex(rgQuery: RgQuery, query: string | undefined = undefined) {
        if (!query) {
            this.notifyEmptyQuery('Ripgrep: Query is empty');
            return;
        }

        const result = await notifyWithProgress(`Searching <${query?.trim()}>`, async () => {
            return await this.fetchGrepItems(this.rgProgram, query, rgQuery);
        });
        if (result === undefined) {
            return;
        }

        if (rgQuery.isMany) {
            const items = await vscode.window.showQuickPick(result.items, {
                title: `RipGrep: Text <${rgQuery.title}> :: Files <${result.total}>`,
                placeHolder: query,
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
                title: `RipGrep: Text <${rgQuery.title}> :: Files <${result.total}>`,
                placeHolder: query,
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

    private notifyEmptyQuery(mesg: string) {
        console.log(mesg);
        notifyMessageWithTimeout(mesg);
    }

    private makeRgPath(file: string) {
        const stats = fs.statSync(file);
        let filepath = file;
        if (stats.isDirectory()) {
            filepath += '.';
        }
        return filepath;
    }

    public async executeAfterFind(results: vscode.QuickPickItem[]) {
        if (!results || results.length === 0) {
            notifyMessageWithTimeout('Results is empty');
            return;
        }

        const query = await vscode.window.showInputBox({
            title: `Ripgrep :: Enter text to search Files <${results.length}>`,
            prompt: 'Please enter filename to search',
            value: getSelectionText(true)
        }).then(res => {
            return res ?? '';
        });

        const rgQuery = {
            ...rgInitQuery,
            replaceQuery: true,
            opt: query,
            srchPath: `${FindSuiteSettings.isWindows ? results.map(item => '"' + this.makeRgPath(item.detail!) + '"').join(' ') : results.map(item => quote([item.detail!])).join(' ')}`
        };

        await this.interact(rgQuery);
    }

    private replaceQuery(txt: string) {
        const chars = /([\\\/\(\)\[\]\{\}\?\+\*\|\^\$\.\-'"])/g;
        const lineChars = /(\r\n|\n)/g;
        return txt.replace(chars, '\\$1').replace(lineChars, ' ').trim();
    }

    private async fetchGrepItems(command: string, query: string, rgQuery: RgQuery, isRegex: boolean = false): Promise<QuickPickItemResults<QuickPickItemRgData>> {
        if (!rgQuery.opt) {
            rgQuery.opt = this.rgDefOption;
        }
        const excludes = FindSuiteSettings.rgExcludePatterns.length > 0 ? '-g "!{' + FindSuiteSettings.rgExcludePatterns.join(',') + '}"' : '';
        const cmd = `${command} "${isRegex ? query : this.replaceQuery(query)}" -n ${rgQuery.opt} ${excludes} ${rgQuery.srchPath ?? quote(this._workspaceFolders)} --json`;
        console.log(`ripgrep(): ${cmd}`);
        logger.debug(`ripgrep(): ${cmd}`);

        return new Promise((resolve, reject) => {
            cp.exec(cmd, { cwd: ".", maxBuffer: MAX_BUF_SIZE }, (err, stdout, stderr) => {
                console.log(`error <${err}> stderr <${stderr}>`);
                if (stderr) {
                    logger.error(stderr);
                    showInfoMessageWithTimeout(stderr);
                    return resolve(emptyRgData);
                }
                const lines: string[] = stdout.split(/\n/).filter((l) => l !== "");
                console.log(`ripgrep(): lines <${lines?.length}>`);
                logger.debug(`ripgrep(): lines <${lines?.length}>`);

                if (!lines.length) {
                    return resolve(emptyRgData);
                }

                let total = 0;
                let matches = 0;
                const results = lines.map((line) => {
                    return JSON.parse(line);
                }).filter((json) => {
                    if (total > FindSuiteSettings.rgCount || !json.type) {
                        return false;
                    } else if (json.type === 'begin') {
                        total++;
                    }
                    return true;
                }).map((json) => {
                    const data = json.data;
                    if (json.type === 'match') {
                        matches++;
                        return {
                            label: `$(file) ${path.basename(data.path.text)}:${data.line_number}:${data.submatches[0].start}`,
                            description: FindSuiteSettings.isWindows ? data.path.text.replace(/\\\\/g, '\\') : data.path.text.replace(/\\/g, '/'),
                            detail: data.lines.text?.trim(),
                            buttons: searchButtons,
                            start: data.submatches[0].start,
                            end: data.submatches[0].end,
                            line_number: Number(data.line_number ?? 1),
                        };
                    } else {
                        return {
                            label: data?.path ? `:: ${path.dirname(data.path.text).split(path.sep).pop()} ::` : '',
                            kind: vscode.QuickPickItemKind.Separator,
                            start: 0,
                            end: 0,
                            line_number: 0,
                        };
                    }
                });

                let summary: RgSummaryData | undefined = undefined;
                if (lines && lines.length > 0) {
                    summary = JSON.parse(lines[lines.length - 1]) as RgSummaryData;
                }

                console.log(`ripgrep(): summary <${total} / ${summary?.data.stats.matches ?? 0} / ${matches}>`);
                return resolve({ total: total, matches: matches, items: results });
            });
        });
    }

    private clearDecoration(editor: vscode.TextEditor) {
        if (editor && this.currentDecoration) {
            editor.setDecorations(this.currentDecoration, []);
        }
    }

    private async openChoiceFile(item: QuickPickItemRgData, options?: vscode.TextDocumentShowOptions) {
        const editor = await openRevealFile(item, options);
        if (!editor) {
            vscode.window.showErrorMessage("No active editor");
            return;
        }
        this.clearDecoration(editor);

        if (options) {
            this.currentDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: this._bgColor
            });

            const line = item.line_number - 1;
            const range = new vscode.Range(line, item.start, line, item.end);
            editor.setDecorations(this.currentDecoration, [range]);
        }
    }

    public getColorForTheme(theme: vscode.ColorThemeKind) {
        if (theme === vscode.ColorThemeKind.Light) {
            return FindSuiteSettings.matchColorLightTheme;
        } else {
            return FindSuiteSettings.matchColorDarkTheme;
        }
    }

    public setColorForTheme(theme: vscode.ColorThemeKind) {
        this._bgColor = this.getColorForTheme(theme);
    }

    private getRipgrep(rgExtPath: string) {
        if (FindSuiteSettings.rgInternalEnabled) {
            let basePath = `${rgExtPath}/bin/${platform}/${Constants.rgVer}/rg`;
            if (platform === 'win32') {
                basePath = `${rgExtPath}\\bin\\${platform}\\${Constants.rgVer}\\rg.exe`;
            } else if (platform === 'linux') {
                if (arch === "arm" || arch === "arm64") {
                    basePath = `${basePath}/${platform}-armv7/rg`;
                }
            }
            return basePath;
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

    public get bgColor() {
        return this._bgColor;
    }
    public set bgColor(value) {
        this._bgColor = value;
    }

    public get currentDecoration(): vscode.TextEditorDecorationType | null {
        return this._currentDecoration;
    }

    public set currentDecoration(value: vscode.TextEditorDecorationType | null) {
        this._currentDecoration = value;
    }

    public get checked(): boolean {
        return this._checked;
    }

    public set checked(value: boolean) {
        this._checked = value;
    }

}
