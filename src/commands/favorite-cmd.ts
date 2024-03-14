import path from "path";
import { ExtensionContext, QuickPickItem, QuickPickItemKind, commands, window, workspace } from "vscode";
import { favorButtons, favorHeaderButtons, favorUndelButtons } from "../model/button";
import { FavoriteEntry, FavoritesEntries, QuickPickFavorItem } from "../model/favorites";
import { Constants } from "../svc/constants";
import { showMultipleDiffs2 } from "../svc/diff";
import { FavoriteManager } from '../svc/favorite-files';
import { openFile } from "../utils/editor";
import { notifyMessageWithTimeout } from "../utils/vsc";

export function registerFavor(context: ExtensionContext) {
    const favoriteFiles = FavoriteManager.getInstance(context);
    context.subscriptions.push(
        commands.registerCommand('findsuite.favorites', async () => {
            openFavorites(favoriteFiles, undefined);
        })
        , commands.registerCommand('findsuite.favoritesFile', async () => {
            openFavorites(favoriteFiles, "file");
        })
        , commands.registerCommand('findsuite.clearFavorites', async () => {
            favoriteFiles.clearAllFiles();
            notifyMessageWithTimeout('Clear Favorites');
        })
        , commands.registerCommand('findsuite.addFavorite', async () => {
            const e = window.activeTextEditor;
            if (e) {
                const uri = e.document.uri;
                favoriteFiles.addItem(uri.fsPath);
            }
        })
    );

    return favoriteFiles;
}

function openFavorites(favoriteFiles: FavoriteManager, fileType: string | undefined = undefined) {
    const quickPick = window.createQuickPick<QuickPickFavorItem>();
    quickPick.title = `Favorite Files`;
    quickPick.placeholder = 'Select file';
    quickPick.canSelectMany = fileType === 'file' ? false : true;
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.buttons = favorHeaderButtons;
    quickPick.items = convertFileAsPickItem(favoriteFiles.favoriteEntries, fileType);

    quickPick.onDidAccept(async () => {
        const items = quickPick.selectedItems as QuickPickFavorItem[];
        if (!items || items.length === 0) {
            return;
        }

        items.forEach(async (item) => {
            await openChoiceFile(item);
        });
        quickPick.dispose();
    });

    quickPick.onDidTriggerButton(async (e) => {
        const items = quickPick.selectedItems as unknown as QuickPickFavorItem[];
        if (e.tooltip === Constants.DIFF_BUTTON) {
            await showMultipleDiffs2(items, 'file');
        } else if (e.tooltip === Constants.OPEN_FAVORITE_BUTTON) {
            await openFile(favoriteFiles.filePath);
            quickPick.dispose();
        } else if (e.tooltip === Constants.REFRESH_BUTTON) {
            favoriteFiles.refresh();
            quickPick.items = convertFileAsPickItem(favoriteFiles.favoriteEntries, fileType);
        }
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        let reload = false;
        if (e.button.tooltip === Constants.VIEW_BUTTON) {
            await openChoiceFile(e.item);
        } else if (e.button.tooltip === Constants.SHIELD_BUTTON) {
            favoriteFiles.update(e.item.id!);
            reload = true;
        } else if (e.button.tooltip === Constants.REMOVE_BUTTON) {
            favoriteFiles.update(e.item.id!, true);
            reload = true;
        }
        if (reload) {
            quickPick.items = convertFileAsPickItem(favoriteFiles.favoriteEntries, fileType);
        }
    });

    quickPick.show();
}

async function openChoiceFile(item: QuickPickItem) {
    const doc = await workspace.openTextDocument(item.description!);
    await window.showTextDocument(doc);
}

function convertFileAsPickItem(favorEntries: FavoritesEntries, fileType: string | undefined = undefined): readonly QuickPickFavorItem[] {
    let quickItems: QuickPickFavorItem[] = [];
    let total = 0;
    if (fileType === undefined || fileType === 'dir') {
        const dirs = favorEntries.directories;
        dirs.forEach((entry, index) => {
            quickItems.push({
                label: ':: Directory ::',
                kind: QuickPickItemKind.Separator
            });
            quickItems.push({
                label: `$(folder) ${entry.name}`,
                description: entry.path,
                buttons: entry.protect ? favorButtons : favorUndelButtons,
                id: entry.id
            });
            total++;

            if (total % 5 === 0 && index !== dirs.length - 1) {
                quickItems.push({
                    label: '',
                    kind: QuickPickItemKind.Separator
                });
            }
        });
    }

    quickItems.push({
        label: '',
        kind: QuickPickItemKind.Separator
    });

    if (fileType === undefined || fileType === 'file') {
        const categoriesMap = new Map<string, FavoriteEntry[]>();

        favorEntries.files.forEach(entry => {
            const category = entry.category;
            if (!categoriesMap.has(category)) {
                categoriesMap.set(category, []);
            }
            categoriesMap.get(category)?.push(entry);
        });

        const categories = Array.from(categoriesMap.keys()).sort();
        categories.forEach(category => {
            quickItems.push({
                label: `:: ${category} ::`,
                kind: QuickPickItemKind.Separator
            });
            const sortedEntries = categoriesMap.get(category)?.sort((a, b) => {
                if (a.name < b.name) { return -1; }
                if (a.name > b.name) { return 1; }
                return 0;
            });
            if (sortedEntries) {
                quickItems = quickItems.concat(sortedEntries.map(entry => ({
                    label: '$(file-code) ' + entry.name,
                    description: entry.path,
                    buttons: entry.protect ? favorButtons : favorUndelButtons,
                    id: entry.id
                })));
            }
        });
    }

    return quickItems;
}
