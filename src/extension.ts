import { platform } from "node:process";
import { ConfigurationChangeEvent, ExtensionContext, TextEditorRevealType, commands, window, workspace } from "vscode";
import { registerEverything, registerFd, registerProblem, registerRg } from "./commands";
import { registerEditor } from "./commands/editor";
import { registerFavor } from "./commands/favorite-cmd";
import { fdInitQuery } from "./model/fd";
import { Constants } from "./svc/constants";
import { Everything } from "./svc/everything";
import { FdFind } from "./svc/fd";
import { RipgrepSearch } from "./svc/ripgrep";
import { revealEditor } from "./utils/editor";
import logger from "./utils/logger";
import { notifyMessageWithTimeout } from "./utils/vsc";
import { vscExtension } from "./vsc-ns";

export function activate(context: ExtensionContext) {
  vscExtension.favoriteManager = registerFavor(context);
  const fd = new FdFind(context);
  const rg = new RipgrepSearch(context);

  registerProblem(context);
  registerFd(context, fd);
  registerRg(context, rg);
  registerEditor(context);

  let everything: Everything | undefined;
  if (platform === 'win32') {
    everything = new Everything();
    registerEverything(context, everything, rg);
  }

  context.subscriptions.push(
    commands.registerCommand('findsuite.rgWithFd', async () => {
      const result = await fd.execute({ ...fdInitQuery, ...{ title: 'Select Files and Rg (Like fd -t f | rg)', opt: '-t f' } }, false);
      if (result) {
        const results = Array.isArray(result) ? result : [result];
        if (!results) {
          return;
        } else if (results.length > Constants.RG_LIMITS) {
          notifyMessageWithTimeout(`The number <${results.length}> of inputs has been exceeded. Limits <${Constants.RG_LIMITS}>`);
          return;
        }
        await rg.executeAfterFind(results);
      }
    })
    , commands.registerCommand('findsuite.rgWithFdDir', async () => {
      const result = await fd.execute({ ...fdInitQuery, ...{ title: 'Select Directory and Rg (Like fd -t d | rg)', opt: '-t d' } }, false);
      if (result) {
        const results = Array.isArray(result) ? result : [result];
        if (!results) {
          return;
        } else if (results.length > Constants.RG_LIMITS) {
          notifyMessageWithTimeout(`The number <${results.length}> of inputs has been exceeded. Limits <${Constants.RG_LIMITS}>`);
          return;
        }
        await rg.executeAfterFind(results);
      }
    })
    , commands.registerCommand('findsuite.reveal#top', async () => {
      revealEditor();
    })
    , commands.registerCommand('findsuite.reveal#center', async () => {
      revealEditor(TextEditorRevealType.InCenter);
    })
    , workspace.onDidChangeConfiguration((e) => {
      handleConfigChange(e, fd, rg);
    })
  );

  logger.debug('activate(): finished');
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
