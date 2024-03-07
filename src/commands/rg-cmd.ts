import { ExtensionContext, commands } from "vscode";
import FindSuiteSettings from "../config/settings";
import { RgQuery, rgInitQuery } from "../model/ripgrep";
import { RipgrepSearch } from "../svc/ripgrep";
import { getEditorFsPath } from "../utils/editor";

export function registerRg(context: ExtensionContext, rg: RipgrepSearch) {
    context.subscriptions.push(
        commands.registerCommand('findsuite.rg', async () => {
            await preferExecuteQuery(rg, rgInitQuery);
        })
        , commands.registerCommand('findsuite.rgFolder', async () => {
            const rgQuery = {
                ...rgInitQuery,
                title: 'Current Folder',
                srchPath: getEditorFsPath(true),
                isMany: false
            };

            await preferExecuteQuery(rg, rgQuery);
        })
        , commands.registerCommand('findsuite.rgws', async () => {
            const rgQuery = {
                ...rgInitQuery,
                title: 'Workspace',
                srchPath: `"${rg.workspaceFolders.join(' ')}"`,
                isMany: false
            };

            await preferExecuteQuery(rg, rgQuery);
        })
        , commands.registerCommand('findsuite.rgFile', async () => {
            await rg.interact({
                ...rgInitQuery,
                title: 'Current File',
                srchPath: getEditorFsPath(),
                isMany: false
            });
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

async function preferExecuteQuery(rg: RipgrepSearch, rgQuery: { title: string; srchPath: string | undefined; isMany: boolean; opt: string; replaceQuery: boolean; skipQuote: boolean; }) {
    const prefer = FindSuiteSettings.rgInputPreferType;
    if (prefer === 'Input') {
        await rg.execute(rgQuery);
    } else {
        await rg.interact(rgQuery);
    }
};
