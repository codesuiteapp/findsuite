import * as http from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import { QuickPickItem, ViewColumn } from 'vscode';
import FindSuiteSettings, { EverythingConfig } from './config/settings';
import { getSelectionText } from './utils/editor';
import logger from './utils/logger';
import { notifyMessageWithTimeout, showConfirmMessage } from './utils/vsc';

export class EverythingSearcher {

  constructor() {
  }

  async searchAndOpen(filterType: string) {
    try {
      const quickPick = vscode.window.createQuickPick();
      let option: EverythingConfig | undefined = FindSuiteSettings.everythingConfig.get(filterType);
      quickPick.title = `Everything :: ${option?.query ?? ''}`;
      quickPick.placeholder = `${option?.description ?? 'Please enter filename to search'}`;
      quickPick.ignoreFocusOut = true;
      quickPick.matchOnDescription = true;
      quickPick.matchOnDetail = true;
      const txt = getSelectionText();
      if (txt) {
        quickPick.value = txt;
      }

      quickPick.onDidChangeValue(async (item) => {
        if (!item || item === "") {
          return;
        }
        let option: EverythingConfig | undefined = FindSuiteSettings.everythingConfig.get(filterType);
        if (!option) {
          const mesg = `There is no configuration file.Please set "everythingConfig.${filterType}"`;
          logger.error(mesg);
          notifyMessageWithTimeout(mesg);
          return;
        }

        quickPick.items = await this.searchInEverything(option, item);
        quickPick.title = `Everything <${item} (${option.description})> Results <${quickPick.items.length}>`;
        console.log(`items <${quickPick.items.length}>`);
      });

      quickPick.onDidAccept(async () => {
        const item = quickPick.selectedItems[0] as QuickPickItem;
        if (!item) {
          return;
        }

        await this.openFile(item);
        quickPick.dispose();
      });
      quickPick.show();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  }

  private async searchInEverything(option: EverythingConfig, str: string): Promise<QuickPickItem[]> {
    let http_options: http.RequestOptions = {
      hostname: FindSuiteSettings.host,
      port: FindSuiteSettings.port,
      path: encodeURI('/?' + [
        'json=1&path_column=1',
        `q=${this.buildSearchQuery(option, str)}`,
        'path=' + (option.fullpath ? 1 : 0),
        'sort=' + option.sort,
        'ascending=' + (option.ascending ? 1 : 0),
        'regex=' + (option.regex ? 1 : 0),
        'count=' + FindSuiteSettings.count,
      ].join('&'))
    };
    console.log(`name <${option.name}> path <${http_options.path}>`);

    return new Promise((resolve, reject) => {
      const request = http.get(http_options, (response) => {
        response.setEncoding('utf8');
        if (response.statusCode && (response.statusCode < 200 || response.statusCode > 299)) {
          reject(new Error(`Abnormal HTTP response from Everything, status code: ${response.statusCode}`));
        }

        let body = '';
        response.on('data', chunk => body += chunk);

        response.on('end', () => {
          try {
            const files: any[] = JSON.parse(body).results as EverythingResponse[];
            files.forEach(f => {
              f.label = f.name;
              f.detail = f.path;
              f.description = `${f.type} ${path.join(f.path, f.name)}`;
            });
            resolve(files);
          } catch (e) {
            reject(new Error(`Failed to decode Everything response as JSON, body data: ${body}`));
          }
        });
      });

      request.on('error', (err) => reject(err));
    });
  }

  private buildSearchQuery(option: EverythingConfig, str: string): string {
    let query = '';
    if (option && option.enabled) {
      query = option.query.length > 0 ? option.query + '+' : '';
    }
    if (!option.inWorkspace) {
      return (query + str.trim().replace(/\s/g, '+')).trim();
    } else {
      let ws = vscode.workspace.workspaceFolders;

      if (ws === undefined) {
        return str;
      } else {
        let patterns: string[] = [];
        let userPattern: string = '\\*' + str + '*';

        ws.forEach((element: vscode.WorkspaceFolder) => {
          patterns.push(element.uri.fsPath + userPattern);
        });

        return patterns.join(' | ');
      }
    }
  }

  private async openFile(file: any) {
    if (!file) {
      return;
    }

    const fullname = path.join(file.path, file.name);
    const fileUri = vscode.Uri.file(fullname);
    if (file.type === 'file') {
      // const doc = await vscode.workspace.openTextDocument(fileUri);
      // if (this.activeEditor) {
      //   await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      //   this.activeEditor = undefined;
      // }
      await vscode.window.showTextDocument(fileUri, { viewColumn: ViewColumn.Active, preserveFocus: true, preview: true });
    } else if (file.type === 'folder') {
      const isOpen = await showConfirmMessage(`Do you open Folder (${fullname})`);
      if (isOpen) {
        console.log(`open folder <${fullname}>`);
        vscode.commands.executeCommand('vscode.openFolder', fileUri);
      }
    }
  }
}

interface EverythingResponse {
  results: {
    name: string;
    path: string;
    type: string;
  }[];
}
