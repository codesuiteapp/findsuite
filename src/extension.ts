import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import { FdQuery } from "./model/fd";
import { RgQuery } from "./model/ripgrep";
import { EverythingSearcher } from "./svc/everything";
import { FdFind } from "./svc/fd";
import { RipgrepSearch } from "./svc/ripgrep";
import { getEditorFsPath } from "./utils/editor";
import { notifyMessageWithTimeout } from "./utils/vsc";

const rgInitQuery: RgQuery = {
  title: 'text',
  opt: '',
  srchPath: undefined,
  replaceQuery: false,
  skipQuote: true,
  isMany: true
};

const fdInitQuery: FdQuery = {
  title: 'file',
  opt: '',
  fileType: 'file',
  srchPath: undefined,
  isMany: true
};

export function activate(context: vscode.ExtensionContext) {
  const fd = new FdFind(context);
  const rg = new RipgrepSearch(context);
  const evtSearcher = new EverythingSearcher();

  context.subscriptions.push(
    vscode.commands.registerCommand('utocode.everything', async () => {
      await evtSearcher.execute('files');
    })
    , vscode.commands.registerCommand('utocode.everything#folder', async () => {
      await evtSearcher.execute("folder");
    })
    , vscode.commands.registerCommand('utocode.everything#path', async () => {
      await evtSearcher.execute("path");
    })
    , vscode.commands.registerCommand('utocode.everything#folderFiles', async () => {
      const result = await evtSearcher.execute("folderFiles", false);
      if (result && !Array.isArray(result)) {
        await evtSearcher.execute("path", true, result.detail + ' files:');
      }
    })
    , vscode.commands.registerCommand('utocode.everything#workspace', async () => {
      const result = await evtSearcher.execute("code-workspace", false);
      if (result && !Array.isArray(result)) {
        let uri = vscode.Uri.file(result.detail!);
        await vscode.commands.executeCommand('vscode.openFolder', uri, true);
      }
    })
    , vscode.commands.registerCommand('utocode.fd', async () => {
      await fd.execute({ ...fdInitQuery, ...{ opt: '-t f' } });
    })
    , vscode.commands.registerCommand('utocode.fdFile', async () => {
      await fd.execute({ ...fdInitQuery, ...{ opt: '-t f' } });
    })
    , vscode.commands.registerCommand('utocode.fdFolder', async () => {
      const result = await fd.execute({ ...fdInitQuery, ...{ opt: '-t d', fileType: 'dir', isMany: false } }, false);
      if (result) {
        await fd.execute({ ...fdInitQuery, ...{ opt: '-t f', srchPath: Array.isArray(result) ? result[0].detail! : result.detail } });
      }
    })
    , vscode.commands.registerCommand('utocode.rgThruFd', async () => {
      const results = await fd.execute({ ...fdInitQuery, ...{ opt: '-t f' } }, false);
      if (results) {
        await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
      }
    })
    , vscode.commands.registerCommand('utocode.rgThruEverything', async () => {
      const results = await evtSearcher.execute('defFilter', false);
      if (results) {
        await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
      }
    })
    , vscode.commands.registerCommand('utocode.rgThruEverythingWs', async () => {
      return;
    })
    , vscode.commands.registerCommand('utocode.rg', async () => {
      await rg.execute(rgInitQuery);
    })
    , vscode.commands.registerCommand('utocode.rgws', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        title: 'Workspace',
        srchPath: `"${rg.workspaceFolders.join(' ')}"`
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rgFile', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        isMany: false,
        title: 'Current File',
        srchPath: getEditorFsPath()
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rgFolder', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        isMany: false,
        title: 'Current Folder',
        srchPath: getEditorFsPath(true)
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg1', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom1
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg2', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom2
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg3', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom3
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg4', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom4
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg5', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom5
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.search#filter1', async () => {
      await evtSearcher.searchAndOpen("filter1");
    })
    , vscode.commands.registerCommand('utocode.search#filter2', async () => {
      await evtSearcher.searchAndOpen("filter2");
    })
    , vscode.commands.registerCommand('utocode.search#filter3', async () => {
      await evtSearcher.searchAndOpen("filter3");
    })
    , vscode.commands.registerCommand('utocode.search#filter4', async () => {
      await evtSearcher.searchAndOpen("filter4");
    })
    , vscode.commands.registerCommand('utocode.search#filter5', async () => {
      await evtSearcher.searchAndOpen("filter5");
    })
    , vscode.commands.registerCommand('utocode.search#filter6', async () => {
      await evtSearcher.searchAndOpen("filter6");
    })
    , vscode.commands.registerCommand('utocode.search#filter7', async () => {
      await evtSearcher.searchAndOpen("filter7");
    })
    , vscode.commands.registerCommand('utocode.search#filter8', async () => {
      await evtSearcher.searchAndOpen("filter8");
    })
    , vscode.commands.registerCommand('utocode.search#filter9', async () => {
      await evtSearcher.searchAndOpen("filter9");
    })
    , vscode.workspace.onDidChangeConfiguration(() => {
      // config = vscode.workspace.getConfiguration('findsuite');
    })
  );
}

export function deactivate() {
}
