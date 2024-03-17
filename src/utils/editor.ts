import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { QuickPickItemRgData } from '../model/ripgrep';
import { showInfoMessageWithTimeout } from '../ui/ui';

export function getEditorFsPath(dir: boolean = false) {
    let uri;
    const e = vscode.window.activeTextEditor;
    if (e) {
        uri = dir ? path.dirname(e.document.uri.fsPath) : e.document.uri.fsPath;
    }
    return uri;
}

export function getSelectionText(positionWord: boolean = false) {
    const e = vscode.window.activeTextEditor;
    let content: string = '';
    if (e) {
        const selection: vscode.Selection = e.selection;
        if (!selection.isEmpty) {
            content = e.document.getText(selection);
        } else if (positionWord && selection.active) {
            let wordRange = e.document.getWordRangeAtPosition(selection.active);
            content = wordRange ? e.document.getText(wordRange) : '';
        }
    }
    return content;
}

export async function getSelectionTextOrClip() {
    const e = vscode.window.activeTextEditor;
    let content: string = '';
    if (e) {
        const selection: vscode.Selection = e.selection;
        if (!selection.isEmpty) {
            content = e.document.getText(selection);
        } else {
            content = await vscode.env.clipboard.readText();
        }
    }
    return content;
}

export async function openEditorWithNew(languageId: string = 'xml') {
    const document = await vscode.workspace.openTextDocument({ content: '' });
    await vscode.languages.setTextDocumentLanguage(document, languageId);
    await vscode.window.showTextDocument(document);
    return vscode.window.activeTextEditor;
}

export async function openRevealFile(item: QuickPickItemRgData, options?: vscode.TextDocumentShowOptions) {
    const doc = await vscode.workspace.openTextDocument(item.description!);
    const editor = await vscode.window.showTextDocument(doc, options);

    if (!vscode.window.activeTextEditor) {
        vscode.window.showErrorMessage("No active editor");
        return;
    }

    const line = item.line_number - 1;
    const selection = new vscode.Selection(~~line, item.start, ~~line, item.start);
    editor.selection = selection;
    editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    return editor;
}

export async function openFile(filepath: string, makeFile: boolean = false) {
    if (!fs.existsSync(filepath) && makeFile) {
        fs.writeFileSync(filepath, '', 'utf8');
    }
    if (!fs.existsSync(filepath)) {
        throw new Error('File is not exist');
    }
    const document = await vscode.workspace.openTextDocument(filepath);
    await vscode.window.showTextDocument(document);
    return vscode.window.activeTextEditor;
}

export async function getDocument(languageId: string = 'xml') {
    const e = vscode.window.activeTextEditor;
    if (e) {
        const document = e.document;
        await vscode.languages.setTextDocumentLanguage(document, languageId);
        return document;
    }
    return null;
}

export function revealEditor(revealType: vscode.TextEditorRevealType = vscode.TextEditorRevealType.AtTop) {
    const e = vscode.window.activeTextEditor;
    if (e) {
        e.revealRange(e.selection, revealType);
    }
}

export async function copyClipboard(txt: string, cnt: number = 1, append: boolean = false) {
    const old = append ? await vscode.env.clipboard.readText() + '\n' : '';
    const last = old.trim().split('\n').pop();
    let mesg;
    if (last === txt) {
        mesg = 'It is the same as the last input.';
    } else {
        await vscode.env.clipboard.writeText(old + txt);
        mesg = `<${cnt}> ${append ? 'Added' : 'Copied'} to clipboard`;
    }
    showInfoMessageWithTimeout(mesg);
}

export function copyClipboardFilePath(item: string, append: boolean = false) {
    if (item) {
        copyClipboard(item, 1, append);
    }
}

export function copyClipboardFiles(items: vscode.QuickPickItem[], append: boolean = false) {
    if (items && items.length > 0) {
        const files = items.map(item => item.description).join('\n');
        copyClipboard(files, items.length, append);
    }
}

export function copyClipboardWithFile(file: any, append: boolean = false) {
    if (!file) {
        return;
    }

    const fullname = path.join(file.path, file.name);
    copyClipboard(fullname, 1, append);
}

export async function openWorkspace(file: string, isNew: boolean = true) {
    let uri = vscode.Uri.file(file);
    await vscode.commands.executeCommand('vscode.openFolder', uri, isNew);
}

export function getIconByExt(extension: string) {
    let icon = '$(file)';
    if (extension === '.java' || extension === '.jsp' || extension === '.kt') {
        icon = '$(coffee)';
    } else if (extension === '.dart' || extension === '.c' || extension === '.h' || extension === '.cpp' || extension === '.js' || extension === '.jsx' || extension === '.ts' || extension === '.tsx' || extension === '.groovy' || extension === '.go' || extension === '.py' || extension === '.html' || extension === '.htm' || extension === '.xml' || extension === '.rs') {
        icon = '$(code)';
    } else if (extension === '.sh' || extension === '.ksh' || extension === '.bash' || extension === '.jkssh' || extension === '.jsh' || extension === '.cmd' || extension === '.ps1' || extension === '.bat') {
        icon = '$(console)';
    } else if (extension === '.sql' || extension === '.csv' || extension === '.ini') {
        icon = '$(database)';
    } else if (extension === '.json' || extension === '.yml' || extension === '.yaml') {
        icon = '$(json)';
    } else if (extension === '.properties' || extension === '.cfg') {
        icon = '$(gear)';
    } else if (extension === '.git' || extension === '.gitignore' || extension === '.gitkeep' || extension === '.vscodeignore') {
        icon = '$(exclude)';
    } else if (extension === '.jar' || extension === '.war' || extension === '.ear') {
        icon = '$(file-binary)';
    } else if (extension === '.pdf') {
        icon = '$(file-pdf)';
    } else if (extension === '.md') {
        icon = '$(file-code)';
    } else if (extension === '.txt' || extension === '.text') {
        icon = '$(file-txt)';
    }
    return icon;
}
