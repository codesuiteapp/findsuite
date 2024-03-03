import { platform } from "node:process";
import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import { FdQuery } from "./model/fd";
import { RgQuery } from "./model/ripgrep";
import { EverythingSearcher as Everything } from "./svc/everything";
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

let fd: FdFind;
let rg: RipgrepSearch;
let everything: Everything;

export function activate(context: vscode.ExtensionContext) {
  fd = new FdFind(context);
  rg = new RipgrepSearch(context);
  if (platform === 'win32') {
    everything = new Everything();
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('utocode.everything', async () => {
      everything && await everything.execute('files');
    })
    , vscode.commands.registerCommand('utocode.incrementalEverything', async () => {
      everything && await everything.interact('files');
    })
    , vscode.commands.registerCommand('utocode.everything#folder', async () => {
      everything && await everything.execute("folder");
    })
    , vscode.commands.registerCommand('utocode.everything#path', async () => {
      everything && await everything.execute("path");
    })
    , vscode.commands.registerCommand('utocode.everything#folderFiles', async () => {
      if (!everything) {
        return;
      }
      const result = await everything.execute("folderFiles", false);
      if (result && !Array.isArray(result)) {
        await everything.execute("path", true, result.detail + ' files:');
      }
    })
    , vscode.commands.registerCommand('utocode.everything#workspace', async () => {
      if (!everything) {
        return;
      }
      const result = await everything.execute("code-workspace", false);
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
      const results = await everything.execute('defFilter', false);
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
      await rg.interact(rgQuery);
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
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg2', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom2
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg3', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom3
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg4', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom4
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg5', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom5
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.search#filter1', async () => {
      await everything.executeFilter("filter1");
    })
    , vscode.commands.registerCommand('utocode.search#filter2', async () => {
      await everything.executeFilter("filter2");
    })
    , vscode.commands.registerCommand('utocode.search#filter3', async () => {
      await everything.executeFilter("filter3");
    })
    , vscode.commands.registerCommand('utocode.search#filter4', async () => {
      await everything.executeFilter("filter4");
    })
    , vscode.commands.registerCommand('utocode.search#filter5', async () => {
      await everything.executeFilter("filter5");
    })
    , vscode.workspace.onDidChangeConfiguration(() => handleConfigChange)
  );
}

export function deactivate() {
}

async function handleConfigChange(event: vscode.ConfigurationChangeEvent) {
  if (event.affectsConfiguration('findsuite.everythingConfig')) {
    console.log('Configuration has been changed.');
  }
  fd.checked = false;
  rg.checked = false;
}
