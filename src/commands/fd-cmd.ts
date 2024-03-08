import { ExtensionContext, commands } from "vscode";
import { fdInitQuery } from "../model/fd";
import { showMultipleDiffs } from "../svc/diff";
import { FdFind } from "../svc/fd";

export function registerFd(context: ExtensionContext, fd: FdFind) {
    context.subscriptions.push(
        commands.registerCommand('findsuite.fd', async () => {
            await fd.execute({ ...fdInitQuery, ...{ opt: '-t f' } });
        })
        , commands.registerCommand('findsuite.fdFile', async () => {
            await fd.execute({ ...fdInitQuery, ...{ opt: '-t f', isMany: false } });
        })
        , commands.registerCommand('findsuite.fdWs', async () => {
            await fd.execute({ ...fdInitQuery, ...{ opt: '-t f', fileType: 'fileWs', srchPath: '.', isMany: true } });
        })
        , commands.registerCommand('findsuite.fdFolder', async () => {
            const result = await fd.execute({ ...fdInitQuery, ...{ title: 'Directory to search', opt: '-t d', fileType: 'dir', isMany: false } }, false);
            if (result) {
                await fd.execute({ ...fdInitQuery, ...{ opt: '-t f', srchPath: Array.isArray(result) ? result[0].detail! : result.detail } });
            }
        })
        , commands.registerCommand('findsuite.fd#diff', async () => {
            const result = await fd.execute({ ...fdInitQuery, ...{ title: 'Select Files to Diff', opt: '-t f' } }, false);
            if (result && Array.isArray(result)) {
                await showMultipleDiffs(result);
            }
        })
        , commands.registerCommand('findsuite.fd#diffWs', async () => {
            const result = await fd.execute({ ...fdInitQuery, ...{ title: 'Select Files to Diff', opt: '-t f', fileType: 'diffWs' } }, false);
            if (result && Array.isArray(result)) {
                await showMultipleDiffs(result);
            }
        })
        , commands.registerCommand('findsuite.fd#diffFolder', async () => {
            const result = await fd.execute({ ...fdInitQuery, ...{ opt: '-t d' } }, false);
            if (result && Array.isArray(result)) {
                await showMultipleDiffs(result);
            }
        })
    );
}
