import { ExtensionContext, QuickInputButtons, QuickPickItem, commands, window } from "vscode";
import FindSuiteSettings from "../config/settings";
import { hisDetailHeaderButtons, historyButtons, historyHeaderButtons } from "../model/button";
import { HistoryFileEntry } from "../model/history";
import { QuickPickItemData, QuickPickItemRgData, RgQuery, rgInitQuery } from "../model/ripgrep";
import { Constants } from "../svc/constants";
import { RipgrepSearch } from "../svc/ripgrep";
import { copyClipboardFilePath, getEditorFsPath, openFile, openRevealFile } from "../utils/editor";
import { executeFavoriteWindow, executeHistoryDetailWindow, executeHistoryWindow, executeRgWindow, switchWindowByBtn } from "../utils/vsc";
import { vscExtension } from "../vsc-ns";

export function registerRg(context: ExtensionContext, rg: RipgrepSearch) {
    context.subscriptions.push(
        commands.registerCommand('findsuite.rgHistory', async () => {
            openHistoryWindow();
        })
        , commands.registerCommand('findsuite.rgHistoryDetail', async (model, total) => {
            if (model) {
                openHistoryDetailWindow(model, total);
            }
        })
        , commands.registerCommand('findsuite.rg', async () => {
            await rg.execute1(rgInitQuery);
        })
        , commands.registerCommand('findsuite.rgre', async () => {
            await rg.execute1({
                ...rgInitQuery,
                title: 'Regex',
                prompt: 'Usage: (Get|Post)'
            }, undefined, true);
        })
        , commands.registerCommand('findsuite.rgDirectory', async () => {
            const rgQuery = {
                ...rgInitQuery,
                title: 'Current Folder',
                srchPath: getEditorFsPath(true),
                isMany: false
            };

            await rg.execute1(rgQuery);
        })
        , commands.registerCommand('findsuite.rgws', async () => {
            const rgQuery = {
                ...rgInitQuery,
                title: 'Workspace',
                srchPath: `${rg.workspaceFolders.join(' ')}`,
                isMany: false
            };

            await rg.execute1(rgQuery);
        })
        , commands.registerCommand('findsuite.rgFile', async () => {
            await rg.interact({
                ...rgInitQuery,
                title: 'Current File',
                srchPath: getEditorFsPath(),
                isMany: false
            });
        })
        , commands.registerCommand('findsuite.rgFavorites', async () => {
            const rgQuery = {
                ...rgInitQuery,
                title: 'Favorites',
                srchPath: `${vscExtension.favoriteManager.getItems().join(' ')}`
            };

            await rg.interact(rgQuery);
        })
        , commands.registerCommand('findsuite.rg1', async () => {
            const rgQuery: RgQuery = {
                ...rgInitQuery,
                opt: FindSuiteSettings.custom1
            };
            await rg.interact(rgQuery);
        })
        , commands.registerCommand('findsuite.rg2', async () => {
            const rgQuery: RgQuery = {
                ...rgInitQuery,
                opt: FindSuiteSettings.custom2
            };
            await rg.interact(rgQuery);
        })
        , commands.registerCommand('findsuite.rg3', async () => {
            const rgQuery: RgQuery = {
                ...rgInitQuery,
                opt: FindSuiteSettings.custom3
            };
            await rg.interact(rgQuery);
        })
    );
}

function openHistoryDetailWindow(model: HistoryFileEntry[], total: string) {
    const quickPick = window.createQuickPick<QuickPickItemRgData>();
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.ignoreFocusOut = true;
    quickPick.items = model as QuickPickItemRgData[];
    quickPick.buttons = hisDetailHeaderButtons;
    quickPick.title = `History Details ${total ? ':: <' + total + '>' : ''}`;

    quickPick.onDidAccept(async () => {
        const items = quickPick.selectedItems;
        if (!items || items.length === 0) {
            return;
        }

        await openRevealFile(items[0]);
        quickPick.dispose();
    });

    quickPick.onDidTriggerButton(async (button) => {
        if (button === QuickInputButtons.Back) {
            quickPick.dispose();
            await executeHistoryWindow();
        } else {
            await switchWindowByBtn(button);
        }
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === Constants.VIEW_BUTTON) {
            await openFile(e.item.description!);
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

export function getHistoryList(): QuickPickItemData<QuickPickItem[]>[] {
    const items: QuickPickItemData<QuickPickItem[]>[] = [];
    Array.from(vscExtension._historyMap.values()).sort((a, b) => {
        if (a.timestamp < b.timestamp) { return 1; }
        if (a.timestamp > b.timestamp) { return -1; }
        return 0;
    }).forEach((it, idx) => items.push({
        label: `${idx + 1} ${it.query!}`,
        description: it.total.toString(),
        detail: it.timestamp.toDateString(),
        id: it.id,
        model: it.fileEntries as unknown as QuickPickItem[],
        buttons: historyButtons
    }));
    return items;
}

function openHistoryWindow() {
    const quickPick = window.createQuickPick<QuickPickItemData<QuickPickItem[]>>();
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.ignoreFocusOut = true;
    quickPick.buttons = historyHeaderButtons;
    quickPick.items = getHistoryList();
    quickPick.title = `Ripgrep History List ${quickPick.items?.length > 0 ? ':: <' + quickPick.items.length + '>' : ''}`;

    quickPick.onDidAccept(async () => {
        const items = quickPick.selectedItems as QuickPickItemData<QuickPickItem[]>[];
        if (!items || items.length === 0) {
            return;
        }

        if (items[0].model) {
            await executeHistoryDetailWindow(items[0].model, items[0].description!);
        }
        quickPick.dispose();
    });

    quickPick.onDidChangeActive(async (e) => {
        const item = e[0].label;
        const entry = Array.from(vscExtension._historyMap.values()).find(it => it.query === item);
        if (entry) {
            quickPick.title = `History List <${entry.total}>`;
            quickPick.placeholder = item;
        }
    });

    quickPick.onDidTriggerButton(async (button) => {
        if (button.tooltip === Constants.RG_WINDOW_BUTTON) {
            await executeRgWindow();
        } else if (button.tooltip === Constants.FAVOR_WINDOW_BUTTON) {
            await executeFavoriteWindow();
        }
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === Constants.REMOVE_BUTTON) {
            vscExtension._historyMap.delete(e.item.id);
        }
        quickPick.items = getHistoryList();
        quickPick.title = `Ripgrep History List :: <${quickPick.items.length}>`;
    });

    quickPick.show();
}
