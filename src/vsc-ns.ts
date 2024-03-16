import { ExtensionContext } from "vscode";
import { HistoryEntry, HistoryFileEntry } from "./model/history";
import { FavoriteManager } from './svc/favorite-manager';

export namespace vscExtension {

    export let context: ExtensionContext;

    export let globalHomeDir: string;

    export let _historyMap: Map<string, HistoryEntry<HistoryFileEntry[]>> = new Map();

    export let favoriteManager: FavoriteManager;

}
