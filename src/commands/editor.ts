import path from "path";
import { ExtensionContext, QuickPickItem, commands, window, workspace } from "vscode";
import { editorButtons, editorHeaderButtons } from "../model/button";
import { Constants } from "../svc/constants";
import { showMultipleDiffs2 } from "../svc/diff";
import { copyClipboardFilePath, copyClipboardFiles } from "../utils/editor";
import { executeFavoriteWindow } from "../utils/vsc";
import { vscExtension } from "../vsc-ns";

export function registerEditor(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('findsuite.editors', async () => {
            openFavorites();
        })
    );
}

export function getOpenEditors(): QuickPickItem[] {
    const activeEditor = window.activeTextEditor;
    const current = activeEditor?.document.uri.fsPath;
    const editors = workspace.textDocuments;
    let quickItems = editors.map(d => {
        const fspath = d.uri.fsPath;
        return {
            label: `$(${current === fspath ? 'eye' : 'file-code'}) ${path.basename(fspath)}`,
            description: fspath,
            buttons: editorButtons
        };
    });
    return quickItems;
}

function openFavorites() {
    const quickPick = window.createQuickPick<QuickPickItem>();
    quickPick.title = `Editor List`;
    quickPick.placeholder = `Select files`;
    quickPick.canSelectMany = true;
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.buttons = editorHeaderButtons;
    quickPick.ignoreFocusOut = true;
    quickPick.items = getOpenEditors();

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
        } else if (e.tooltip === Constants.COPY_BUTTON) {
            copyClipboardFiles(items);
        } else if (e.tooltip === Constants.ADD_CLIP_BUTTON) {
            copyClipboardFiles(items, true);
        } else if (e.tooltip === Constants.FAVOR_WINDOW_BUTTON) {
            await executeFavoriteWindow();
        }
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === Constants.VIEW_BUTTON) {
            await switchEditor(e.item.description!);
        } else if (e.button.tooltip === Constants.COPY_BUTTON) {
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
