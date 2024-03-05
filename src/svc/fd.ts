import * as cp from "child_process";
import * as fs from 'fs';
import { platform } from "node:process";
import * as os from 'os';
import path from "path";
import { quote } from "shell-quote";
import * as vscode from "vscode";
import FindSuiteSettings from "../config/settings";
import { FdQuery } from "../model/fd";
import { getSelectionText } from "../utils/editor";
import logger from "../utils/logger";
import { notifyMessageWithTimeout } from "../utils/vsc";

const MAX_BUF_SIZE = 200000 * 1024;

export class FdFind {

    private _workspaceFolders: string[];

    private projectRoot: string[];
    private fdProgram;
    private fdDefOption: string;

    private _checked: boolean = false;

    public get checked(): boolean {
        return this._checked;
    }
    public set checked(value: boolean) {
        this._checked = value;
    }

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

    public get workspaceFolders(): string[] {
        return this._workspaceFolders;
    }

    public async execute(fdQuery: FdQuery, isOpen: boolean = true) {
        try {
            this.checkingProgram();
        } catch (error: any) {
            notifyMessageWithTimeout(error.message);
            return;
        }

        let txt = getSelectionText();
        if (!fdQuery.srchPath && !txt) {
            txt = await vscode.window.showInputBox({
                title: `Fd: ${fdQuery.title ?? 'Filename to search'}`,
                placeHolder: 'Please enter filename to search',
                prompt: fdQuery.fileType === 'file' ? 'Usage: [Filename] or [-g "**/*.sh"]' : ''
            }).then(res => {
                return res ?? '';
            });
        }

        if (!fdQuery.srchPath && !txt) {
            return;
        }

        let cmd = '';
        if (fdQuery.fileType === 'dir') {
            cmd = `${this.fdProgram} -a ${fdQuery.opt} ${this.fdDefOption} ${txt} ${this.getPlatformPath()}`;
        } else {
            let command = [this.fdProgram, txt].join(' ');
            let path = fdQuery.srchPath ? `-g "**/*" --full-path ${quote([fdQuery.srchPath])}` : this.getPlatformPath();
            cmd = `${command} -a ${fdQuery.opt} ${this.fdDefOption} ${path}`;
        }
        console.log(`cmd <${cmd}>`);
        logger.debug(`cmd <${cmd}>`);

        const result = await this.fdItems(cmd, fdQuery.fileType);
        if (fdQuery.isMany) {
            const items = await vscode.window.showQuickPick(result, {
                title: `Fd: File <${txt}> :: Results <${result.length}>`,
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
            const selectedItem = await vscode.window.showQuickPick<vscode.QuickPickItem>(result, {
                title: `Fd: ${fdQuery.fileType} <${txt}> :: Results <${result.length}>`,
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

    private async fdItems(cmd: string, fileType: string): Promise<vscode.QuickPickItem[]> {
        return new Promise((resolve, reject) => {
            cp.exec(cmd, { cwd: ".", maxBuffer: MAX_BUF_SIZE }, (err, stdout, stderr) => {
                console.log(`error <${err}> stderr <${stderr}>`);
                if (stderr) {
                    logger.error(stderr);
                    vscode.window.showErrorMessage(stderr);
                    return resolve([]);
                }
                const lines = Array.from(new Set(stdout.split(/\n/).filter((l) => l !== "")));
                console.log(`lines <${lines?.length ?? 0}>`);

                if (!lines.length) {
                    return resolve([]);
                }

                const results = lines.map((line) => {
                    return {
                        label: fileType === 'file' ? '$(file)' : '$(folder)',
                        description: path.basename(line),
                        detail: line
                    };
                });

                return resolve(results);
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
            case "win32": path = FindSuiteSettings.fdPathWind32; break;
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

}
