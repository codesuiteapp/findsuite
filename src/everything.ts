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

  public async searchAndOpen(filterType: string) {
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
          const mesg = `There is no configuration file. Please set "everythingConfig.${filterType}"`;
          logger.error(mesg);
          notifyMessageWithTimeout(mesg);
          return;
        }

        quickPick.items = await this.searchInEverything(option, item, FindSuiteSettings.count * 5);
        quickPick.title = `Everything <${item}> (${option.description}) :: Results <${quickPick.items.length}>`;
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

  private async searchInEverything(option: EverythingConfig, str: string, cnt: number = FindSuiteSettings.count): Promise<QuickPickItem[]> {
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
        'count=' + cnt,
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
              f.label = f.type === 'file' ? '$(file)' : '$(folder)';
              f.description = f.name;
              f.detail = `${path.join(f.path, f.name)}`;
            });
            resolve(files);
          } catch (e) {
            reject(new Error(`Failed to decode Everything response as JSON, body data: ${body} `));
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

  public async execute(filterType: string, isOpen: boolean = true, query: string | undefined = undefined) {
    let option: EverythingConfig | undefined = FindSuiteSettings.everythingConfig.get(filterType);
    if (!option) {
      if (filterType === 'folder') {
        option = {
          ...FindSuiteSettings.everythingConfig.get('defFilter')!,
          sort: 'date_modified',
          query: 'folder:'
        };
      } else {
        const mesg = `There is no configuration file.Please set "everythingConfig.${filterType}"`;
        logger.error(mesg);
        notifyMessageWithTimeout(mesg);
        return;
      }
    }

    let txt = query ?? getSelectionText();
    if (!txt) {
      txt = await vscode.window.showInputBox({
        title: `Everything:: Enter filename to search`,
        prompt: `Usage: ${option?.query ?? ''}`,
        placeHolder: `${option?.description ?? 'Please enter filename to search'}`
      }).then(res => {
        return res ?? '';
      });
    }

    const limit = FindSuiteSettings.limitOpenFile;
    const items: QuickPickItem[] = await this.searchInEverything(option, txt);

    if (filterType === 'folder') {
      const item = await vscode.window.showQuickPick(items, {
        title: `Everything <${txt}> :: Results <${items.length}> Limits <${limit}> :: ${isOpen ? "Open File" : "Ripgrep"} `,
        placeHolder: txt,
        canPickMany: false,
        matchOnDetail: true,
        matchOnDescription: true
      }).then(selectedItem => {
        return selectedItem;
      });

      if (item && isOpen) {
        await this.openFile(item);
      } else {
        return item;
      }
    } else {
      let results = await vscode.window.showQuickPick(items, {
        title: `Everything <${txt}> :: Results <${items.length}> Limits <${limit}> :: ${isOpen ? "Open File" : "Ripgrep"} `,
        placeHolder: txt,
        canPickMany: true,
        matchOnDetail: true,
        matchOnDescription: true
      });

      return await this.openMultiFiles(results, isOpen, limit);
    }

    return undefined;
  }

  public async openMultiFiles(results: QuickPickItem[] | undefined, isOpen: boolean = true, limit: number = FindSuiteSettings.limitOpenFile) {
    if (results) {
      if (results && results.length > limit) {
        results = results.slice(0, limit);
      } else {
        results = results;
      }

      if (isOpen) {
        results?.forEach(async (item) => {
          await this.openFile(item);
        });
      } else {
        return results;
      }
    }

    return undefined;
  }

  public resizeItems(results: QuickPickItem[], limit: number = FindSuiteSettings.limitOpenFile) {
    if (results && results.length > limit) {
      results = results.slice(0, limit);
    } else {
      results = results;
    }

    return results;
  }

  private async openFile(file: any) {
    if (!file) {
      return;
    }

    const fullname = path.join(file.path, file.name);
    const fileUri = vscode.Uri.file(fullname);
    if (file.type === 'file') {
      await vscode.window.showTextDocument(fileUri, { viewColumn: ViewColumn.Active, preserveFocus: true, preview: true });
    } else if (file.type === 'folder') {
      const isOpen = await showConfirmMessage(`Do you open Folder(${fullname})`);
      if (isOpen) {
        console.log(`open folder <${fullname}>`);
        vscode.commands.executeCommand('vscode.openFolder', fileUri);
      }
    }
  }
}

interface EverythingResponse {
  results: EverythingResult[];
}

export interface EverythingResult {
  name: string;
  path: string;
  type: string;
}
