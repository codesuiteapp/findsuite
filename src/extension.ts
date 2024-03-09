import { platform } from "node:process";
import { ConfigurationChangeEvent, ExtensionContext, TextEditorRevealType, commands, window, workspace } from "vscode";
import { registerEverything, registerFd, registerRg } from "./commands";
import { fdInitQuery } from "./model/fd";
import { Everything } from "./svc/everything";
import { FdFind } from "./svc/fd";
import { RipgrepSearch } from "./svc/ripgrep";
import { revealEditor } from "./utils/editor";

export function activate(context: ExtensionContext) {
  const fd = new FdFind(context);
  const rg = new RipgrepSearch(context);
  let everything: Everything | undefined;

  registerFd(context, fd);
  registerRg(context, rg);

  if (platform === 'win32') {
    everything = new Everything();
    registerEverything(context, everything, rg);
  }

  context.subscriptions.push(
    commands.registerCommand('findsuite.rgWithFd', async () => {
      const results = await fd.execute({ ...fdInitQuery, ...{ title: 'Select Files and Rg (Like fd -t f | rg)', opt: '-t f' } }, false);
      if (results) {
        await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
      }
    })
    , commands.registerCommand('findsuite.rgWithFdDir', async () => {
      const results = await fd.execute({ ...fdInitQuery, ...{ title: 'Select Directory and Rg (Like fd -t f | rg)', opt: '-t d' } }, false);
      if (results) {
        await rg.executeAfterFind(Array.isArray(results) ? results : [results]);
      }
    })
    , commands.registerCommand('findsuite.revealTop', async () => {
      revealEditor();
    })
    , commands.registerCommand('findsuite.revealCenter', async () => {
      revealEditor(TextEditorRevealType.InCenter);
    })
    , workspace.onDidChangeConfiguration((e) => {
      handleConfigChange(e, fd, rg);
    })
  );

  window.onDidChangeActiveColorTheme(theme => {
    rg.setColorForTheme(theme.kind);
  });
}

export function deactivate() {
}

async function handleConfigChange(event: ConfigurationChangeEvent, fd: FdFind, rg: RipgrepSearch) {
  if (event.affectsConfiguration('findsuite.everythingConfig')) {
    console.log('Configuration has been changed.');
  }
  fd.checked = false;
  rg.checked = false;
}
