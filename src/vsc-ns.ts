import { ExtensionContext } from "vscode";
import { FavoriteFiles } from "./svc/favorite-files";

export namespace vscExtension {

    export let context: ExtensionContext;

    export let globalHomeDir: string;

    export let favoriteFiles: FavoriteFiles;

}
