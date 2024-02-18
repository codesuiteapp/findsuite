import * as vscode from "vscode";
import { EverythingSearcher } from "./everything";
import { QuickPickItemWithLine, fetchGrepItems, getRgPath, registerRipgrep } from "./ripgrep";

export function activate(context: vscode.ExtensionContext) {
  const rgPath = getRgPath(context.extensionUri.fsPath);

  let query: string[];
  const scrollBack: QuickPickItemWithLine[] = [];
  const evtSearcher = new EverythingSearcher();

  context.subscriptions.push(
    vscode.commands.registerCommand('utocode.ripgrep', async () => {
      registerRipgrep(rgPath, query, scrollBack);
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
