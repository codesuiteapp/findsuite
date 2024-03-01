import * as cp from "child_process";
import { platform } from "node:process";
import path from "path";
import * as vscode from "vscode";
import FindSuiteSettings from "../config/settings";
import { FdQuery } from "../model/fd";
import { getSelectionText } from "../utils/editor";
import logger from "../utils/logger";
import { notifyMessageWithTimeout } from "../utils/vsc";

const MAX_BUF_SIZE = 200000 * 1024;

export class FdFind {

    private _workspaceFolders: string[];

    private projectRoot: string;
    private fdProgram;
    private fdDefOption: string;

    constructor(private context: vscode.ExtensionContext) {
        this._workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
        this.projectRoot = this.workspaceFolders[0] || ".";
        this.fdDefOption = FindSuiteSettings.fdDefaultOption;
        this.fdProgram = this.getFd(context.extensionUri.fsPath);
    }

    public get workspaceFolders(): string[] {
        return this._workspaceFolders;
    }

    public async execute(fdQuery: FdQuery, isOpen: boolean = true) {
        let txt = getSelectionText();
        if (!fdQuery.srchPath && !txt) {
            txt = await vscode.window.showInputBox({
                title: `Fd: filename to search`,
                placeHolder: 'Please enter filename to search'
            }).then(res => {
                return res ?? '';
            });
        }

        let cmd = '';
        if (fdQuery.fileType === 'dir') {
            cmd = `${this.fdProgram} -a ${fdQuery.opt} ${this.fdDefOption} ${txt} . ${FindSuiteSettings.fdPath.join(' ')} ${this.projectRoot}`;
        } else {
            let command = [this.fdProgram, txt].join(' ');
            let path = fdQuery.srchPath ? fdQuery.srchPath : `${FindSuiteSettings.fdPath.join(' ')} ${this.projectRoot}`;
            cmd = `${command} -a ${fdQuery.opt} ${this.fdDefOption} . ${path}`;
        }
        console.log(`cmd <${cmd}>`);
        logger.debug(`cmd <${cmd}>`);

        const result = await this.fdItems(cmd, fdQuery.fileType);
        if (fdQuery.isMany) {
            const items = await vscode.window.showQuickPick(result, {
                title: `Fd: Text <${fdQuery.title}> :: Results <${result.length}>`,
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
            return await vscode.window.showQuickPick<vscode.QuickPickItem>(result, {
                title: `Fd: Type <${fdQuery.fileType}> :: Results <${result.length}>`,
                placeHolder: txt,
                ignoreFocusOut: true,
                matchOnDetail: true,
                matchOnDescription: true,
                onDidSelectItem: async (item: vscode.QuickPickItem) => {
                    await this.openChoiceFile(item);
                }
            }).then(async (item) => {
                return item;
            });
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
                const lines = stdout.split(/\n/).filter((l) => l !== "");
                console.log(`lines <${lines?.length ?? 0}>`);

                if (!lines.length) {
                    return resolve([]);
                }

                const results = lines.map((line) => {
                    return {
                        label: fileType === 'file' ? '$(file)' : '$(folder)',
                        description: `${path.basename(line)}`,
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

}
