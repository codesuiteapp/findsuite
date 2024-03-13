import path from "path";
import { ExtensionContext, QuickPickItem, QuickPickItemKind, commands, window, workspace } from "vscode";
import { favorButtons, favorHeaderButtons } from "../model/button";
import { showMultipleDiffs2 } from "../svc/diff";
import { FavoriteFiles } from "../svc/favorite-files";
import { notifyMessageWithTimeout } from "../utils/vsc";

export function registerFavor(context: ExtensionContext) {
    const favoriteFiles = new FavoriteFiles();
    context.subscriptions.push(
        commands.registerCommand('findsuite.favorites', async () => {
            openFavorites(favoriteFiles);
        })
        , commands.registerCommand('findsuite.clearFavorites', async () => {
            favoriteFiles.clearAllFiles();
            notifyMessageWithTimeout('Clear Favorites');
        })
        , commands.registerCommand('findsuite.addFavorite', async () => {
            const e = window.activeTextEditor;
            if (e) {
                const uri = e.document.uri;
                favoriteFiles.addFile(uri.fsPath);
                notifyMessageWithTimeout(`Add to Favorites <${path.basename(uri.fsPath)}>`);
            }
        })
    );

    return favoriteFiles;
}

function openFavorites(favoriteFiles: FavoriteFiles) {
    const quickPick = window.createQuickPick<QuickPickItem>();
    quickPick.title = `Favorite Files`;
    quickPick.placeholder = 'Select file';
    quickPick.canSelectMany = true;
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.buttons = favorHeaderButtons;
    quickPick.items = convertFileAsPickItem(favoriteFiles.getAllFiles());

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
        if (e.tooltip === 'Diff') {
            await showMultipleDiffs2(items, 'file');
        }
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === 'View') {
            await openChoiceFile(e.item);
        }
    });

    quickPick.show();
}

async function openChoiceFile(item: QuickPickItem) {
    const doc = await workspace.openTextDocument(item.description!);
    await window.showTextDocument(doc);
}

function convertFileAsPickItem(files: string[]): readonly QuickPickItem[] {
    const quickItems: QuickPickItem[] = [];

    files.forEach((file, index) => {
        quickItems.push({
            label: '$(file) ' + path.basename(file),
            description: file,
            buttons: favorButtons
        });

        if ((index + 1) % 5 === 0 && index !== files.length - 1) {
            quickItems.push({
                label: '',
                kind: QuickPickItemKind.Separator
            });
        }
    });

    return quickItems;
}
