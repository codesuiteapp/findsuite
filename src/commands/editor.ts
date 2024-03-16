import * as fs from 'fs';
import path from "path";
import { ExtensionContext, QuickPickItem, QuickPickItemKind, commands, window, workspace } from "vscode";
import { editorButtons, editorHeaderButtons } from "../model/button";
import { Constants } from "../svc/constants";
import { showMultipleDiffs2 } from "../svc/diff";
import { copyClipboardFilePath, copyClipboardFiles, getIconByExt } from "../utils/editor";
import { executeFavoriteWindow, executeHistoryWindow } from "../utils/vsc";
import { vscExtension } from "../vsc-ns";

export function registerEditor(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('findsuite.editors', async () => {
            openFavorites();
        })
    );
}

type FileItems = { [extension: string]: QuickPickItem[] };

export function getOpenEditors(): QuickPickItem[] {
    const fileItemsMap: FileItems = {};

    const activeEditor = window.activeTextEditor;
    const current = activeEditor?.document.uri.fsPath;
    const editors = workspace.textDocuments;
    editors.forEach(d => {
        const fspath = d.uri.fsPath;
        if (!fs.existsSync(fspath) || fspath.startsWith('\\settings') || fspath.startsWith('\\')) {
            console.log(`filename <${fspath}>`);
            return;
        }

        const extension = path.extname(fspath);
        const label = `${current === fspath ? '$(sync~spin)' : ''} ${getIconByExt(extension)} ${path.basename(fspath)}`;
        const description = fspath;

        if (!fileItemsMap[extension]) {
            fileItemsMap[extension] = [];
        }

        fileItemsMap[extension].push({
            label,
            description,
            buttons: editorButtons
        });
    });

    const items: QuickPickItem[] = [];
    Object.keys(fileItemsMap).forEach((extension) => {
        items.push({ label: extension, kind: QuickPickItemKind.Separator });
        items.push(...fileItemsMap[extension]);
    });
    return items;
}

function openFavorites() {
    const quickPick = window.createQuickPick<QuickPickItem>();
    quickPick.canSelectMany = true;
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.buttons = editorHeaderButtons;
    quickPick.ignoreFocusOut = true;
    quickPick.items = getOpenEditors();
    //quickPick.title = `Editor List ${quickPick.items?.length > 0 ? ':: <' + quickPick.items.length + '>' : ''}`;
    quickPick.title = `Editor List`;

    quickPick.onDidAccept(async () => {
        const items = quickPick.selectedItems as QuickPickItem[];
        if (!items || items.length === 0) {
            return;
        }

        if (items[0].description) {
            await switchEditor(items[0].description);
        }
        quickPick.dispose();
    });

    quickPick.onDidTriggerButton(async (e) => {
        const items = quickPick.selectedItems as unknown as QuickPickItem[];
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
        } else if (e.tooltip === Constants.CLOSE_BUTTON) {
            items.forEach(async (item) => {
                const document = await workspace.openTextDocument(item.description!);
                await window.showTextDocument(document);
                await commands.executeCommand('workbench.action.closeActiveEditor');
            });
            quickPick.items = getOpenEditors();
        }
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === Constants.VIEW_BUTTON) {
            await switchEditor(e.item.description!);
        } else if (e.button.tooltip === Constants.CLIP_COPY_BUTTON) {
            copyClipboardFilePath(e.item.description!);
        } else if (e.button.tooltip === Constants.ADD_CLIP_BUTTON) {
            copyClipboardFilePath(e.item.description!, true);
        } else if (e.button.tooltip === Constants.FAVORITE_BUTTON) {
            vscExtension.favoriteManager.addItem(e.item.description!);
        } else if (e.button.tooltip === Constants.CLOSE_BUTTON) {
            const document = await workspace.openTextDocument(e.item.description!);
            await window.showTextDocument(document);
            await commands.executeCommand('workbench.action.closeActiveEditor');
        }
        quickPick.items = getOpenEditors();
    });

    quickPick.show();
}

async function switchEditor(filename: string) {
    const document = await workspace.openTextDocument(filename);
    await window.showTextDocument(document);
}
