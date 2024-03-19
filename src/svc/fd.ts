import * as cp from "child_process";
import * as fs from 'fs';
import { platform } from "node:process";
import * as os from 'os';
import path from "path";
import { quote } from "shell-quote";
import * as vscode from "vscode";
import FindSuiteSettings from "../config/settings";
import { fdButtons, searchHeaderButtons, wsButtons } from "../model/button";
import { FdQuery, QuickPickItemResults } from "../model/fd";
import { notifyWithProgress } from "../ui/ui";
import { copyClipboardFilePath, getIconByExt, getSelectionText, openWorkspace } from "../utils/editor";
import logger from "../utils/logger";
import { executeFavoriteWindow, executeHistoryWindow, notifyMessageWithTimeout } from "../utils/vsc";
import { vscExtension } from "../vsc-ns";
import { Constants } from "./constants";

const MAX_BUF_SIZE = 200 * 1024 * 1024;

export class FdFind {

    private _workspaceFolders: string[];

    private projectRoot: string[];
    private fdProgram;
    private fdDefOption: string;

    private _checked: boolean = false;

    private favoriteManager = vscExtension.favoriteManager;

    constructor(private context: vscode.ExtensionContext) {
        this.fdDefOption = FindSuiteSettings.fdDefaultOption;
        this.fdProgram = this.getFd(context.extensionUri.fsPath);
        this._workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
        if (this._workspaceFolders.length === 0) {
            this.projectRoot = [os.homedir()];
        } else {
            this.projectRoot = this.workspaceFolders;
        }
    }

    public async execute(fdQuery: FdQuery, isOpen: boolean = true, required: boolean = false) {
        try {
            this.checkingProgram();
        } catch (error: any) {
            notifyMessageWithTimeout(error.message);
            return;
        }

        let txt = getSelectionText();
        if (!fdQuery.srchPath && !txt || required) {
            txt = await vscode.window.showInputBox({
                title: `Fd:: ${fdQuery.title ?? 'Search name'}`,
                placeHolder: 'Please enter filename to search',
                prompt: fdQuery.fileType === 'file' ? 'Usage: [Filename] or [-g "**/*.txt"]' : ''
            }).then(res => {
                return res ?? '';
            });
        }

        if (!fdQuery.srchPath && !txt) {
            return;
        }

        let cmd = '';
        let mesg = `${txt ? '<' + txt + '>' : ''}`;
        if (fdQuery.fileType === 'dir') {
            cmd = `${this.fdProgram} -a ${fdQuery.opt} ${this.fdDefOption} ${txt} ${this.getPlatformPath()}`;
        } else if (fdQuery.fileType === 'diffWs') {
            cmd = `${this.fdProgram} -a ${fdQuery.opt} ${this.fdDefOption} ${txt} --full-path ${quote(this._workspaceFolders)}`;
        } else if (fdQuery.fileType === 'fileWs') {
            cmd = `${this.fdProgram} -a -g "**/*" ${fdQuery.opt} ${this.fdDefOption} ${txt} --full-path ${quote(this._workspaceFolders)}`;
            mesg = '<Files in Workspace>';
        } else {
            let command = [this.fdProgram, txt].join(' ');
            let path = fdQuery.srchPath ? `-g "**/*" --full-path ${quote([fdQuery.srchPath])}` : this.getPlatformPath();
            cmd = `${command} -a ${fdQuery.opt} ${this.fdDefOption} ${path}`;
        }

        const cmdOpt = cmd + FindSuiteSettings.fdExcludePatterns.filter(f => f).map(pattern => { return ` -E "${pattern}"`; }).join('');
        console.log(`cmd <${cmdOpt}>`);

        const result = await notifyWithProgress(`Searching ${mesg?.trim()}`, async () => {
            return await this.fdItems(cmdOpt, fdQuery.fileType);
        });
        if (result === undefined) {
            return;
        }
        if (fdQuery.isMany) {
            const items = await vscode.window.showQuickPick(result.items, {
                title: `Fd :: File ${mesg} :: Results <${result.total}>`,
                placeHolder: txt,
                canPickMany: true,
                matchOnDetail: true,
                matchOnDescription: true
            });

            if (items) {
                if (isOpen) {
                    items.forEach(async (item) => {
                        await this.openChoiceFile(item);
                    });
                } else {
                    return items;
                }
            }
        } else {
            const selectedItem = await vscode.window.showQuickPick<vscode.QuickPickItem>(result.items, {
                title: `Fd :: ${fdQuery.fileType} ${mesg} :: Results <${result.total}>`,
                placeHolder: txt,
                ignoreFocusOut: true,
                matchOnDetail: true,
                matchOnDescription: true,
                // onDidSelectItem: async (item: vscode.QuickPickItem) => {
                //     await this.openChoiceFile(item);
                // }
            }).then(async (item) => {
                return item;
            });

            if (selectedItem && isOpen) {
                await this.openChoiceFile(selectedItem);
            } else if (selectedItem) {
                return selectedItem;
            }
        }
        return;
    }

    public async execute1(fdQuery: FdQuery) {
        try {
            this.checkingProgram();
        } catch (error: any) {
            notifyMessageWithTimeout(error.message);
            return;
        }

        let txt = getSelectionText();
        if (!fdQuery.srchPath && !txt) {
            txt = await vscode.window.showInputBox({
                title: `Fd:: ${fdQuery.title ?? 'Search name'}`,
                placeHolder: 'Please enter filename to search',
                prompt: fdQuery.fileType === 'file' ? 'Usage: [Filename] or [-g "**/*.txt"]' : ''
            }).then(res => {
                return res ?? '';
            });
        }

        if (!fdQuery.srchPath && !txt) {
            return;
        }

        let cmd = '';
        let mesg = `${txt ? '<' + txt + '>' : ''}`;
        if (fdQuery.fileType === 'dir') {
            cmd = `${this.fdProgram} -a ${fdQuery.opt} ${this.fdDefOption} ${txt} ${this.getPlatformPath()}`;
        } else if (fdQuery.fileType === 'diffWs') {
            cmd = `${this.fdProgram} -a ${fdQuery.opt} ${this.fdDefOption} ${txt} --full-path ${quote(this._workspaceFolders)}`;
        } else if (fdQuery.fileType === 'fileWs') {
            cmd = `${this.fdProgram} -a -g "**/*" ${fdQuery.opt} ${this.fdDefOption} ${txt} --full-path ${quote(this._workspaceFolders)}`;
            mesg = '<Files in Workspace>';
        } else {
            let command = [this.fdProgram, txt].join(' ');
            let path = fdQuery.srchPath ? `-g "**/*" --full-path ${quote([fdQuery.srchPath])}` : this.getPlatformPath();
            cmd = `${command} -a ${fdQuery.opt} ${this.fdDefOption} ${path}`;
        }

        const cmdOpt = cmd + FindSuiteSettings.fdExcludePatterns.filter(f => f).map(pattern => { return ` -E "${pattern}"`; }).join('');
        console.log(`cmd <${cmdOpt}>`);

        const result = await notifyWithProgress(`Searching ${mesg}`, async () => {
            return await this.fdItems(cmdOpt, fdQuery.fileType, fdButtons);
        });
        if (!result) {
            return;
        }

        const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
        quickPick.title = `Fd ${mesg} :: Results <${result.total}>`;
        quickPick.placeholder = txt;
        quickPick.canSelectMany = fdQuery.isMany;
        quickPick.matchOnDetail = true;
        quickPick.matchOnDescription = true;
        quickPick.buttons = searchHeaderButtons;
        quickPick.items = result.items;

        quickPick.onDidAccept(async () => {
            const items = quickPick.selectedItems as vscode.QuickPickItem[];
            if (!items || items.length === 0) {
                return;
            }

            items.forEach(async (item) => {
                await this.openChoiceFile(item);
            });
            quickPick.dispose();
        });

        quickPick.onDidTriggerButton(async (e) => {
            if (e.tooltip === Constants.FAVOR_WINDOW_BUTTON) {
                await executeFavoriteWindow();
            }
        });

        quickPick.onDidTriggerItemButton(async (e) => {
            if (e.button.tooltip === Constants.VIEW_BUTTON) {
                await this.openChoiceFile(e.item);
            } else if (e.button.tooltip === Constants.CLIP_COPY_BUTTON) {
                copyClipboardFilePath(e.item.detail!);
            } else if (e.button.tooltip === Constants.ADD_CLIP_BUTTON) {
                copyClipboardFilePath(e.item.detail!, true);
            } else if (e.button.tooltip === Constants.FAVORITE_BUTTON) {
                this.favoriteManager.addItem(e.item.detail!);
            }
        });

        quickPick.show();
    }

    public async executeCodeWorkspace() {
        try {
            this.checkingProgram();
        } catch (error: any) {
            notifyMessageWithTimeout(error.message);
            return;
        }

        let cmd = `${this.fdProgram} -a -g "**/*.code-workspace" -t f ${this.fdDefOption} --full-path ${this.getPlatformPath()}`;
        const cmdOpt = cmd + FindSuiteSettings.fdExcludePatterns.filter(f => f).map(pattern => { return ` -E "${pattern}"`; }).join('');
        console.log(`cmd <${cmdOpt}>`);

        const mesg = '<Code-Workspace>';
        const result = await notifyWithProgress(`Searching ${mesg}`, async () => {
            return await this.fdItems(cmdOpt, 'code-workspace', wsButtons);
        });
        if (!result) {
            return;
        }

        const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
        quickPick.title = `Fd ${mesg} :: Results <${result.total}>`;
        quickPick.placeholder = 'Select to Open workspace';
        quickPick.matchOnDetail = true;
        quickPick.matchOnDescription = true;
        quickPick.buttons = searchHeaderButtons;
        quickPick.items = result.items;

        quickPick.onDidAccept(async () => {
            const item = quickPick.selectedItems[0] as vscode.QuickPickItem;
            if (!item) {
                return;
            }

            await openWorkspace(item.detail!, false);
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
            if (e.button.tooltip === Constants.WINDOW_BUTTON) {
                await openWorkspace(e.item.detail!, true);
                quickPick.dispose();
            }
        });

        quickPick.show();
    }

    private async fdItems(cmd: string, fileType: string, buttons: vscode.QuickInputButton[] | undefined = undefined): Promise<QuickPickItemResults<vscode.QuickPickItem>> {
        logger.debug('fd():', cmd);
        let label: string;
        if (fileType === 'dir') {
            label = '$(dir)';
        } else if (fileType === 'code-workspace') {
            label = '$(record)';
        } else {
            label = '$(file)';
        }
        return new Promise((resolve, reject) => {
            cp.exec(cmd, { cwd: ".", maxBuffer: MAX_BUF_SIZE }, (err, stdout, stderr) => {
                console.log(`error <${err}> stderr <${stderr}>`);
                if (stderr) {
                    logger.error(stderr);
                    notifyMessageWithTimeout(stderr);
                    return resolve({ total: 0, matches: 0, items: [] });
                }
                const lines = Array.from(new Set(stdout.split(/\n/).filter((l) => l !== "")));
                console.log(`fd:: results <${lines?.length ?? 0}>`);

                if (!lines.length) {
                    return resolve({ total: 0, matches: 0, items: [] });
                }

                let total = 0;
                const results: vscode.QuickPickItem[] = [];
                let currentDir: string | undefined = undefined;

                lines.forEach((line) => {
                    const dirName = path.dirname(line);
                    if (dirName !== currentDir) {
                        if (currentDir !== undefined) {
                            const shortDir = dirName?.split(path.sep).pop();
                            results.push({ label: `:: ${shortDir} ::`, kind: vscode.QuickPickItemKind.Separator });
                        }
                        currentDir = dirName;
                    }
                    const desc = path.basename(line);

                    results.push({
                        label: fileType === 'code-workspace' ? label + ' ' + desc.split('.').shift() : getIconByExt(path.extname(desc)),
                        description: desc,
                        detail: line,
                        buttons: buttons
                    });
                    total++;
                });
                return resolve({ total: total, matches: total, items: results });
            });
        });
    }

    private async openChoiceFile(item: vscode.QuickPickItem) {
        const doc = await vscode.workspace.openTextDocument(item.detail!);
        await vscode.window.showTextDocument(doc);
    }

    private getFd(fdExtPath: string) {
        if (FindSuiteSettings.fdInternalEnabled) {
            const fdVer = "9_0_0";
            const basePath = `${fdExtPath}/bin/${fdVer}`;
            switch (platform) {
                case "win32":
                    return `${fdExtPath}\\bin\\${fdVer}\\${platform}\\fd.exe`;
                case "darwin":
                    return `${basePath}/${platform}/fd`;
                case "linux":
                    return `${basePath}/${platform}/fd`;
                default:
                    return "fd";
            }
        } else {
            switch (platform) {
                case "win32": return FindSuiteSettings.fdWin32Program;
                case "darwin": return FindSuiteSettings.fdMacProgram;
                default: return FindSuiteSettings.fdLinuxProgram;
            }
        }
    }

    private getPlatformPath() {
        let path = this.getPlatformFdPath();
        return ['--full-path', quote(path), quote(this.projectRoot)].join(' ');
    }

    private getPlatformFdPath() {
        let path;
        switch (platform) {
            case "win32": path = FindSuiteSettings.fdPathWin32; break;
            case "darwin": path = FindSuiteSettings.fdPathDarwin; break;
            default: path = FindSuiteSettings.fdPathLinux; break;
        }
        return path;
    }

    private checkingProgram() {
        if (this._checked) {
            return;
        }

        const programName = this.fdProgram;
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
                console.log(`${programName} is installed at `, programPath);
            });
        }

        if (FindSuiteSettings.fdInternalEnabled && platform !== 'win32') {
            fs.chmod(programName, '755', (err: any) => {
                if (err) {
                    console.error('Error adding execute permission:', err);
                    return;
                }
                console.log(programName + ' permission added successfully.');
            });
        }

        if (this.getPlatformFdPath().length === 0) {
            notifyMessageWithTimeout(`Please set "findsuite.fd.path.${platform}" for more searching`);
        }
        this._checked = true;
    }

    public get workspaceFolders(): string[] {
        return this._workspaceFolders;
    }

    public get checked(): boolean {
        return this._checked;
    }

    public set checked(value: boolean) {
        this._checked = value;
    }

}
