import * as vscode from "vscode";
import FindSuiteSettings from "./config/settings";
import { EverythingSearcher } from "./everything";
import { RipgrepSearch } from "./ripgrep";

export function activate(context: vscode.ExtensionContext) {
  // let query: string[];
  // const scrollBack: QuickPickItemWithLine[] = [];
  const rg = new RipgrepSearch(context);
  const evtSearcher = new EverythingSearcher();

  context.subscriptions.push(
    vscode.commands.registerCommand('utocode.ripgrep', async () => {
      rg.execute('');
    })
    , vscode.commands.registerCommand('utocode.ripgrep1', async () => {
      rg.execute(FindSuiteSettings.custom1, false);
    })
    , vscode.commands.registerCommand('utocode.ripgrep2', async () => {
      rg.execute(FindSuiteSettings.custom2, false);
    })
    , vscode.commands.registerCommand('utocode.ripgrep3', async () => {
      rg.execute(FindSuiteSettings.custom3, true, true);
    })
    , vscode.commands.registerCommand('utocode.ripgrep4', async () => {
      rg.execute(FindSuiteSettings.custom4, true, true);
    })
    , vscode.commands.registerCommand('utocode.search#filter1', () => {
      evtSearcher.searchAndOpen("filter1");
    })
    , vscode.commands.registerCommand('utocode.search#filter2', () => {
      evtSearcher.searchAndOpen("filter2");
    })
    , vscode.commands.registerCommand('utocode.search#filter3', () => {
      evtSearcher.searchAndOpen("filter3");
    })
    , vscode.commands.registerCommand('utocode.search#filter4', () => {
      evtSearcher.searchAndOpen("filter4");
    })
    , vscode.commands.registerCommand('utocode.search#filter5', () => {
      evtSearcher.searchAndOpen("filter5");
    })
    , vscode.commands.registerCommand('utocode.search#filter6', () => {
      evtSearcher.searchAndOpen("filter6");
    })
    , vscode.commands.registerCommand('utocode.search#filter7', () => {
      evtSearcher.searchAndOpen("filter7");
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
