import { platform } from "node:process";
import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import { FdQuery } from "./model/fd";
import { RgQuery } from "./model/ripgrep";
import { showMultipleDiffs } from "./svc/diff";
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
  title: 'Filename to search',
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
    vscode.commands.registerCommand('findsuite.everything', async () => {
      everything && await everything.execute('files');
    })
    , vscode.commands.registerCommand('findsuite.incrementalEverything', async () => {
      everything && await everything.interact('files');
    })
    , vscode.commands.registerCommand('findsuite.everything#folder', async () => {
      everything && await everything.execute("folder");
    })
    , vscode.commands.registerCommand('findsuite.everything#path', async () => {
      if (!everything) {
        return;
      }
      await everything.execute("path");
    })
    , vscode.commands.registerCommand('findsuite.everything#folderFiles', async () => {
      if (!everything) {
        return;
      }
      const result = await everything.execute("folderFiles", false);
      if (result && !Array.isArray(result)) {
        await everything.execute("path", true, result.detail + ' files:');
      }
    })
    , vscode.commands.registerCommand('findsuite.everything#workspace', async () => {
      if (!everything) {
        return;
      }
      const result = await everything.execute("code-workspace", false);
      if (result && !Array.isArray(result)) {
        let uri = vscode.Uri.file(result.detail!);
        await vscode.commands.executeCommand('vscode.openFolder', uri, true);
      }
    })
    , vscode.commands.registerCommand('findsuite.everything#diff', async () => {
      if (!everything) {
        return;
      }
      const result = await everything.execute("files", false);
      if (result && Array.isArray(result)) {
        await showMultipleDiffs(result, 'dir');
      }
    })
    , vscode.commands.registerCommand('findsuite.everything#diffFolder', async () => {
      if (!everything) {
        return;
      }
      const result = await everything.execute("diffFolder", false);
      if (result && Array.isArray(result)) {
        await showMultipleDiffs(result, 'dir');
      }
    })
    , vscode.commands.registerCommand('findsuite.fd', async () => {
      await fd.execute({ ...fdInitQuery, ...{ opt: '-t f' } });
    })
    , vscode.commands.registerCommand('findsuite.fdFile', async () => {
      await fd.execute({ ...fdInitQuery, ...{ opt: '-t f', isMany: false } });
    })
    , vscode.commands.registerCommand('findsuite.fdFolder', async () => {
      const result = await fd.execute({ ...fdInitQuery, ...{ title: 'Directory to search', opt: '-t d', fileType: 'dir', isMany: false } }, false);
      if (result) {
        await fd.execute({ ...fdInitQuery, ...{ opt: '-t f', srchPath: Array.isArray(result) ? result[0].detail! : result.detail } });
      }
    })
    , vscode.commands.registerCommand('findsuite.fd#diff', async () => {
      const result = await fd.execute({ ...fdInitQuery, ...{ opt: '-t f' } }, false);
      if (result && Array.isArray(result)) {
        await showMultipleDiffs(result);
      }
    })
    , vscode.commands.registerCommand('findsuite.fd#diffFolder', async () => {
      const result = await fd.execute({ ...fdInitQuery, ...{ opt: '-t d' } }, false);
      if (result && Array.isArray(result)) {
        await showMultipleDiffs(result);
      }
    })
    , vscode.commands.registerCommand('findsuite.rgThruFd', async () => {
      const results = await fd.execute({ ...fdInitQuery, ...{ opt: '-t f' } }, false);
      if (results) {
        await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
      }
    })
    , vscode.commands.registerCommand('findsuite.rgThruEverything', async () => {
      const results = await everything.execute('files', false);
      if (results) {
        await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
      }
    })
    , vscode.commands.registerCommand('findsuite.rg', async () => {
      await rg.execute(rgInitQuery);
    })
    , vscode.commands.registerCommand('findsuite.rgFile', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        title: 'Current File',
        srchPath: getEditorFsPath(),
        isMany: false
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('findsuite.rgFolder', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        title: 'Current Folder',
        srchPath: getEditorFsPath(true),
        isMany: false
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('findsuite.rgws', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        title: 'Workspace',
        srchPath: `"${rg.workspaceFolders.join(' ')}"`
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('findsuite.rg1', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom1
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('findsuite.rg2', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom2
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('findsuite.rg3', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom3
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('findsuite.rg4', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom4
      };
      await rg.interact(rgQuery);
    })
    , vscode.commands.registerCommand('findsuite.rg5', async () => {
      const rgQuery: RgQuery = {
        ...rgInitQuery,
        opt: FindSuiteSettings.custom5
      };
      await rg.interact(rgQuery);
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
