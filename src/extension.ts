import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import { EverythingSearcher } from "./everything";
import { RgQuery } from "./model/ripgrep";
import { RipgrepSearch } from "./ripgrep";
import { getEditorFsPath, getSelectionText } from "./utils/editor";
import { notifyMessageWithTimeout } from "./utils/vsc";

const initialRgQuery: RgQuery = {
  title: 'text',
  opt: '',
  srchPath: undefined,
  replaceQuery: false,
  skipQuote: true,
  isMany: true
};

export function activate(context: vscode.ExtensionContext) {
  const rg = new RipgrepSearch(context);
  const evtSearcher = new EverythingSearcher();

  context.subscriptions.push(
    vscode.commands.registerCommand('utocode.everything', async () => {
      await evtSearcher.execute('defFilter');
    })
    , vscode.commands.registerCommand('utocode.everything#folder', async () => {
      await evtSearcher.execute("folder");
    })
    , vscode.commands.registerCommand('utocode.rgThruEverything', async () => {
      const results = await evtSearcher.execute('defFilter', false);
      if (results) {
        const query = await vscode.window.showInputBox({
          title: `Ripgrep :: Enter text to search`,
          prompt: 'Please enter filename to search',
          value: getSelectionText()
        }).then(res => {
          return res ?? '';
        });

        if (!query) {
          const mesg = 'Ripgrep: Query is empty';
          console.log(mesg);
          notifyMessageWithTimeout(mesg);
          return;
        }
        const rgQuery: RgQuery = {
          ...initialRgQuery,
          srchPath: `"${results.map(item => item.detail).join(' ')}"`
        };
        await rg.execute(rgQuery, query);
      }
    })
    , vscode.commands.registerCommand('utocode.rgThruEverythingWs', async () => {
      return;
    })
    , vscode.commands.registerCommand('utocode.rg', async () => {
      await rg.execute(initialRgQuery);
    })
    , vscode.commands.registerCommand('utocode.rgws', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        title: 'Workspace',
        srchPath: `"${rg.workspaceFolders.join(' ')}"`
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rgFile', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        isMany: false,
        title: 'Current File',
        srchPath: getEditorFsPath()
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rgFolder', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        isMany: false,
        title: 'Current Folder',
        srchPath: getEditorFsPath(true)
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg1', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom1
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg2', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom2
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg3', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom3
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg4', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom4
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.rg5', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
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
    , vscode.commands.registerCommand('utocode.spring.mappings', () => {
      vscode.commands.executeCommand('spring.mappings.find');
    })
    , vscode.workspace.onDidChangeConfiguration(() => {
      // config = vscode.workspace.getConfiguration('findsuite');
    })
  );
}

export function deactivate() {
}
