import { ExtensionContext } from "vscode";
import { FavoriteManager } from './svc/favorite-files';

export namespace vscExtension {

    export let context: ExtensionContext;

    export let globalHomeDir: string;

    export let favoriteFiles: FavoriteManager;

}
