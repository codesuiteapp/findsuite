import { ExtensionContext, Uri, commands } from "vscode";
import { showMultipleDiffs } from "../svc/diff";
import { Everything } from "../svc/everything";
import { RipgrepSearch } from "../svc/ripgrep";

export function registerEverything(context: ExtensionContext, everything: Everything, rg: RipgrepSearch) {
    if (!everything) {
        return;
    }

    context.subscriptions.push(
        commands.registerCommand('findsuite.everything', async () => {
            everything && await everything.execute('files');
        })
        , commands.registerCommand('findsuite.incrementalEverything', async () => {
            everything && await everything.interact('files');
        })
        , commands.registerCommand('findsuite.everything#folder', async () => {
            everything && await everything.execute("folder");
        })
        , commands.registerCommand('findsuite.everything#path', async () => {
            if (!everything) {
                return;
            }
            await everything.execute("path");
        })
        , commands.registerCommand('findsuite.everything#folderFiles', async () => {
            if (!everything) {
                return;
            }
            const result = await everything.execute("folderFiles", false);
            if (result && !Array.isArray(result)) {
                await everything.execute("path", true, result.detail + ' files:');
            }
        })
        , commands.registerCommand('findsuite.everything#workspace', async () => {
            if (!everything) {
                return;
            }
            const result = await everything.execute("code-workspace", false);
            if (result && !Array.isArray(result)) {
                let uri = Uri.file(result.detail!);
                await commands.executeCommand('vscode.openFolder', uri, true);
            }
        })
        , commands.registerCommand('findsuite.everything#diff', async () => {
            if (!everything) {
                return;
            }
            const result = await everything.execute("files", false);
            if (result && Array.isArray(result)) {
                await showMultipleDiffs(result, 'dir');
            }
        })
        , commands.registerCommand('findsuite.everything#diffFolder', async () => {
            if (!everything) {
                return;
            }
            const result = await everything.execute("diffFolder", false);
            if (result && Array.isArray(result)) {
                await showMultipleDiffs(result, 'dir');
            }
        })
        , commands.registerCommand('findsuite.rgThruEverything', async () => {
            const results = await everything.execute('files', false);
            if (results) {
                await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
            }
        })
    );
}
