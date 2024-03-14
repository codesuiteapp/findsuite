import path from "path";
import { ExtensionContext, QuickPickItem, QuickPickItemKind, commands, window, workspace } from "vscode";
import { favorButtons, favorHeaderButtons } from "../model/button";
import { FavoritesEntries } from "../model/favorites";
import { Constants } from "../svc/constants";
import { showMultipleDiffs2 } from "../svc/diff";
import { FavoriteFiles } from '../svc/favorite-files';
import { openFile } from "../utils/editor";
import { notifyMessageWithTimeout } from "../utils/vsc";

export function registerFavor(context: ExtensionContext) {
    const favoriteFiles = FavoriteFiles.getInstance(context);
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
                notifyMessageWithTimeout(`Add to Favorites <${path.basename(uri.fsPath)}>`);
            }
        })
    );

    return favoriteFiles;
}

function openFavorites(favoriteFiles: FavoriteFiles, fileType: string | undefined = undefined) {
    const quickPick = window.createQuickPick<QuickPickItem>();
    quickPick.title = `Favorite Files`;
    quickPick.placeholder = 'Select file';
    quickPick.canSelectMany = fileType === 'file' ? false : true;
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.buttons = favorHeaderButtons;
    quickPick.items = convertFileAsPickItem(favoriteFiles.favoriteFiles, fileType);

    quickPick.onDidAccept(async () => {
        const items = quickPick.selectedItems as QuickPickItem[];
        if (!items || items.length === 0) {
            return;
        }

        items.forEach(async (item) => {
            await openChoiceFile(item);
        });
        quickPick.dispose();
    });

    quickPick.onDidTriggerButton(async (e) => {
        const items = quickPick.selectedItems as unknown as QuickPickItem[];
        if (e.tooltip === Constants.DIFF_BUTTON) {
            await showMultipleDiffs2(items, 'file');
        } else if (e.tooltip === Constants.REFRESH_BUTTON) {
            favoriteFiles.refresh();
            quickPick.items = convertFileAsPickItem(favoriteFiles.favoriteFiles, fileType);
        } else if (e.tooltip === Constants.OPEN_FAVORITE_BUTTON) {
            await openFile(favoriteFiles.filePath);
            quickPick.dispose();
        }
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === Constants.VIEW_BUTTON) {
            await openChoiceFile(e.item);
        } else if (e.button.tooltip === Constants.REMOVE_BUTTON) {
            favoriteFiles.delete(e.item.description!);
        }
    });

    quickPick.show();
}

async function openChoiceFile(item: QuickPickItem) {
    const doc = await workspace.openTextDocument(item.description!);
    await window.showTextDocument(doc);
}

function convertFileAsPickItem(items: FavoritesEntries, fileType: string | undefined = undefined): readonly QuickPickItem[] {
    const quickItems: QuickPickItem[] = [];

    let total = 0;
    if (fileType === undefined || fileType === 'dir') {
        const dirs = items.dir;
        dirs.forEach((favor, index) => {
            quickItems.push({
                label: `$(folder) ${favor.name}`,
                description: favor.path,
                buttons: favorButtons,
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
        const files = items.files;
        files.forEach((favor, index) => {
            quickItems.push({
                label: `$(file-code) ${favor.name}`,
                description: favor.path,
                buttons: favorButtons,
            });
            total++;

            if (total % 5 === 0 && index !== files.length - 1) {
                quickItems.push({
                    label: '',
                    kind: QuickPickItemKind.Separator
                });
            }
        });
    }

    return quickItems;
}
