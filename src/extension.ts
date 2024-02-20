import { endianness } from "os";
import path from "path";
import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import { EverythingSearcher } from "./everything";
import { RgQuery } from "./model/ripgrep";
import { RipgrepSearch } from "./ripgrep";
import { getEditorFsPath } from "./utils/editor";

const initialRgQuery: RgQuery = {
  title: 'text',
  opt: '',
  srchPath: undefined,
  replaceQuery: false,
  skipQuote: true
};

export function activate(context: vscode.ExtensionContext) {
  const rg = new RipgrepSearch(context);
  const evtSearcher = new EverythingSearcher();

  context.subscriptions.push(
    vscode.commands.registerCommand('utocode.ripgrep', async () => {
      await rg.execute(initialRgQuery);
    })
    , vscode.commands.registerCommand('utocode.ripgrepFile', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        title: 'Current File',
        srchPath: getEditorFsPath()
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.ripgrepFolder', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        title: 'Current Folder',
        srchPath: getEditorFsPath(true)
      };
      await rg.execute(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.ripgrep1', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom1
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.ripgrep2', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom2
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.ripgrep3', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom3
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.ripgrep4', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom4
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.ripgrep5', async () => {
      const rgQuery: RgQuery = {
        ...initialRgQuery,
        opt: FindSuiteSettings.custom5
      };
      await rg.execInteract(rgQuery);
    })
    , vscode.commands.registerCommand('utocode.search#all', async () => {
      await evtSearcher.searchAndOpen("filter0");
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
