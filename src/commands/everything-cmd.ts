import { ExtensionContext, Uri, commands } from "vscode";
import FindSuiteSettings from "../config/settings";
import { showMultipleDiffs } from "../svc/diff";
import { Everything } from "../svc/everything";
import { RipgrepSearch } from "../svc/ripgrep";
import { notifyMessageWithTimeout } from "../utils/vsc";

export function registerEverything(context: ExtensionContext, everything: Everything, rg: RipgrepSearch) {
    const isWin = FindSuiteSettings.isWindows;
    context.subscriptions.push(
        commands.registerCommand('findsuite.everything', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            await everything.execute('files');
        })
        , commands.registerCommand('findsuite.incrementalEverything', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            await everything.interact('files');
        })
        , commands.registerCommand('findsuite.everything#folder', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            await everything.execute("folder");
        })
        , commands.registerCommand('findsuite.everything#workspace', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            await everything.execute("workspace");
        })
        , commands.registerCommand('findsuite.everything#path', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            await everything.execute("path");
        })
        , commands.registerCommand('findsuite.everything#folderFiles', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            const result = await everything.execute("folderFiles", false);
            if (result && !Array.isArray(result)) {
                await everything.execute("path", true, result.detail + ' files:');
            }
        })
        , commands.registerCommand('findsuite.everything#codeWorkspace', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            const result = await everything.execute("code-workspace", false);
            if (result && !Array.isArray(result)) {
                let uri = Uri.file(result.detail!);
                await commands.executeCommand('vscode.openFolder', uri, true);
            }
        })
        , commands.registerCommand('findsuite.everything#diff', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            const result = await everything.execute("diffFiles", false);
            if (result && Array.isArray(result)) {
                await showMultipleDiffs(result, 'dir');
            }
        })
        , commands.registerCommand('findsuite.everything#diffFolder', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            const result = await everything.execute("diffFolder", false);
            if (result && Array.isArray(result)) {
                await showMultipleDiffs(result, 'dir');
            }
        })
        , commands.registerCommand('findsuite.rgWithEverything', async () => {
            if (!checkPlatform(isWin)) {
                return;
            }
            const results = await everything.execute('filesPipe', false);
            if (results) {
                await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
            }
        })
    );
}

function checkPlatform(isWin: boolean) {
    if (!isWin) {
        notifyMessageWithTimeout('This feature requires Windows.');
    }
    return isWin;
}
