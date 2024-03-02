import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';

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
