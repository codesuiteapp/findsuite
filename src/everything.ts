import * as http from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import { QuickPickItem, ViewColumn } from 'vscode';
import FindSuiteSettings, { EverythingConfig } from './config/settings';
import { getSelectionText } from './utils/editor';
import logger from './utils/logger';
import { notifyMessageWithTimeout, showConfirmMessage } from './utils/vsc';

const defEverythingConfig: EverythingConfig = {
  enabled: true,
  query: "",
  regex: false,
  fullpath: false,
  inWorkspace: false,
  sort: "name",
  ascending: true,
  description: "Search All",
  name: "default-filter",
  filterType: "default-filter",
  title: ""
};

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

  private async searchInEverything(config: EverythingConfig, query: string, cnt: number = FindSuiteSettings.count): Promise<QuickPickItem[]> {
    let http_options: http.RequestOptions = {
      hostname: FindSuiteSettings.host,
      port: FindSuiteSettings.port,
      path: encodeURI('/?' + [
        'json=1&path_column=1',
        `q=${this.buildSearchQuery(config, query)}`,
        'path=' + (config.fullpath ? 1 : 0),
        'sort=' + config.sort,
        'ascending=' + (config.ascending ? 1 : 0),
        'regex=' + (config.regex ? 1 : 0),
        'count=' + cnt,
      ].join('&'))
    };
    console.log(`name <${config.name}> path <${http_options.path}>`);

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
            reject(new Error(`Failed to decode Everything response as JSON, body data: ${body}`));
          }
        });
      });

      request.on('error', (err) => reject(err));
    });
  }

  private buildSearchQuery(config: EverythingConfig, extraQuery: string): string {
    let query = '';
    if (config && config.enabled) {
      query = config.query.length > 0 ? config.query + '+' : '';
    }

    if (!config.inWorkspace) {
      return (query + extraQuery.trim().replace(/\s/g, '+')).trim();
    } else {
      let ws = vscode.workspace.workspaceFolders;

      if (ws === undefined) {
        return extraQuery;
      } else {
        let patterns: string[] = [];
        let userPattern: string = '\\*' + extraQuery + '*';

        ws.forEach((element: vscode.WorkspaceFolder) => {
          patterns.push(element.uri.fsPath + userPattern);
        });

        return patterns.join(' | ');
      }
    }
  }

  private makeEverythingConfig(extraConfig: { title: string, sort: string, query: string }) {
    let config: EverythingConfig | undefined = {
      ...defEverythingConfig,
      ...extraConfig
    };

    return config;
  }

  public async execute(filterType: string, isOpen: boolean = true, query: string | undefined = undefined) {
    let config: EverythingConfig | undefined = FindSuiteSettings.everythingConfig.get(filterType);
    if (!config) {
      if (filterType === 'files') {
        config = this.makeEverythingConfig({
          sort: 'date_modified',
          title: 'Open Folder',
          query: 'files:'
        });
      } else if (filterType === 'folder') {
        config = this.makeEverythingConfig({
          sort: 'date_modified',
          title: 'Open Folder',
          query: 'folder:'
        });
      } else if (filterType === 'folderFiles') {
        config = this.makeEverythingConfig({
          sort: 'date_modified',
          title: 'Open multi files in Folder',
          query: 'folder:'
        });
      } else if (filterType === 'code-workspace') {
        config = this.makeEverythingConfig({
          sort: 'name',
          title: 'Open new window with workspace',
          query: 'ext:code-workspace'
        });
        query = '__EMPTY__';
      } else if (filterType === 'path') {
        config = this.makeEverythingConfig({
          sort: 'name',
          title: 'Open Folder',
          query: 'path:' + (query ?? '')
        });
        if (query) {
          query = '__EMPTY__';
        }
      } else {
        const mesg = `There is no configuration file. Please set "everythingConfig.${filterType}"`;
        logger.error(mesg);
        notifyMessageWithTimeout(mesg);
        return;
      }
    }

    if (!config) {
      return;
    }

    config.filterType = filterType;
    return this.executeConfig(config, isOpen, query);
  }

  public async executeConfig(config: EverythingConfig, isOpen: boolean = true, inQuery: string | undefined = undefined) {
    let txt = inQuery ?? getSelectionText();
    if (txt === '__EMPTY__') {
      txt = '';
    } else if (!txt) {
      txt = await vscode.window.showInputBox({
        title: `Everything:: ${config.title ?? 'Enter filename to search'}`,
        prompt: `Usage: ${config?.description ?? ''}`,
        placeHolder: `${config?.description ?? 'Please enter filename to search'}`
      }).then(res => {
        return res ?? '';
      });
    }

    const items: QuickPickItem[] = await this.searchInEverything(config, txt);
    const limit = FindSuiteSettings.limitOpenFile;

    if (config.filterType === 'folder' || config.filterType === 'folderFiles' || config.filterType === 'code-workspace') {
      const item = await vscode.window.showQuickPick(items, {
        title: `Everything <${txt}> :: Results <${items.length}> :: Open`,
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
        title: `Everything <${txt}> :: Results <${items.length}> Limits <${limit}> :: ${isOpen ? "Open File" : "Ripgrep"}`,
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
