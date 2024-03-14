import { ExtensionContext } from "vscode";
import { FavoriteManager } from './svc/favorite-manager';

export namespace vscExtension {

    export let context: ExtensionContext;

    export let globalHomeDir: string;

    export let favoriteManager: FavoriteManager;

}
