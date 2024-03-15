import { ExtensionContext, commands } from "vscode";
import FindSuiteSettings from "../config/settings";
import { RgQuery, rgInitQuery } from "../model/ripgrep";
import { RipgrepSearch } from "../svc/ripgrep";
import { getEditorFsPath } from "../utils/editor";
import { vscExtension } from "../vsc-ns";

export function registerRg(context: ExtensionContext, rg: RipgrepSearch) {
    context.subscriptions.push(
        commands.registerCommand('findsuite.rg', async () => {
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

async function preferExecuteQuery(rg: RipgrepSearch, rgQuery: { title: string; srchPath: string | undefined; isMany: boolean; opt: string; replaceQuery: boolean; prompt: string }) {
    const prefer = FindSuiteSettings.rgInputPreferType;
    if (prefer === 'Input') {
        await rg.execute(rgQuery);
    } else {
        await rg.interact(rgQuery);
    }
}
