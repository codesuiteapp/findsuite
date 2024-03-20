import * as fs from 'fs';
import path from "path";
import { ExtensionContext, QuickPickItem, QuickPickItemKind, TextDocument, commands, window, workspace } from "vscode";
import { editorButtons, editorHeaderButtons } from "../model/button";
import { Constants } from "../svc/constants";
import { showMultipleDiffs2 } from "../svc/diff";
import { copyClipboardFilePath, copyClipboardFiles, getIconByExt } from "../utils/editor";
import { switchWindowByBtn } from "../utils/vsc";
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
    const editors = workspace.textDocuments.filter(doc => !doc.isClosed);
    console.log(`editors <${editors?.length}>`);

    editors.forEach(d => {
        const fspath = d.uri.fsPath;
        if (!fs.existsSync(fspath) || fspath.startsWith('\\settings') || fspath.startsWith('\\') || d.isClosed) {
            console.log(`filename <${fspath}> closed <${d.isClosed}>`);
            return;
        }
        console.log(`fspath <${fspath}> closed <${d.isClosed}>`);

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
    quickPick.title = `Editor List ${quickPick.items?.length > 0 ? ':: <' + quickPick.items.filter(it => it.kind !== QuickPickItemKind.Separator).length + '>' : ''}`;

    quickPick.onDidAccept(async () => {
        const items = quickPick.selectedItems as QuickPickItem[];
        if (!items || items.length === 0) {
            return;
        }

        console.log(`items <${items?.length}>`);
        if (items[0].description) {
            await switchEditor(items[0].description);
        }
        quickPick.dispose();
    });

    quickPick.onDidTriggerButton(async (button) => {
        const items = quickPick.selectedItems as unknown as QuickPickItem[];
        if (button.tooltip === Constants.DIFF_BUTTON) {
            await showMultipleDiffs2(items, 'file');
        } else if (button.tooltip === Constants.CLIP_COPY_BUTTON) {
            copyClipboardFiles(items);
        } else if (button.tooltip === Constants.ADD_CLIP_BUTTON) {
            copyClipboardFiles(items, true);
        } else if (button.tooltip === Constants.CLOSE_BUTTON) {
            items.forEach(async (item) => {
                workspace.textDocuments.filter(d => !d.isClosed && d.fileName === item.description!).forEach(d => {
                    window.showTextDocument(d).then(async (e) => {
                        return await commands.executeCommand('workbench.action.closeActiveEditor');
                    });
                });
            });
            quickPick.dispose();
        } else {
            await switchWindowByBtn(button);
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
            const document = workspace.textDocuments.filter(d => !d.isClosed).find(doc => doc.fileName === e.item.description!);
            await closeDocument(document);
            quickPick.items = getOpenEditors();
        }
    });

    quickPick.show();
}

async function switchEditor(filename: string) {
    const document = await workspace.openTextDocument(filename);
    await window.showTextDocument(document);
}

async function closeDocument(document: TextDocument | undefined) {
    if (document) {
        try {
            window.showTextDocument(document, { preserveFocus: true }).then(async (e) => {
                await commands.executeCommand('workbench.action.closeActiveEditor');
            });
        } catch (error: any) {
            console.error(`error: ${error.message}`);
        }
    }
}
