import * as http from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import { QuickPickItem, ViewColumn } from 'vscode';
import FindSuiteSettings, { EverythingConfig } from '../config/settings';
import { fileBtn } from '../model/button';
import { notifyWithProgress } from '../ui/ui';
import { formatBytes } from '../utils/converter';
import { getSelectionText } from '../utils/editor';
import logger from '../utils/logger';
import { notifyMessageWithTimeout, showConfirmMessage } from '../utils/vsc';

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

export class Everything {

  private _workspaceFolders: string[];
  private query: string[] = [];

  constructor() {
    this._workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
  }

  public async executeFilter(filterType: string) {
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

        quickPick.items = await notifyWithProgress(`Searching <${item}>`, async () => {
          return await this.searchInEverything(option!, item, FindSuiteSettings.count * 5);
        });
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
        'json=1&path_column=1&size_column=1&date_modified_column=1',
        `q=${this.buildSearchQuery(config, query)}`,
        'path=' + (config.fullpath ? 1 : 0),
        'sort=' + config.sort,
        'ascending=' + (config.ascending ? 1 : 0),
        'regex=' + (config.regex ? 1 : 0),
        'count=' + cnt,
      ].join('&'))
    };
    if (http_options.path) {
      logger.debug('everything():', http_options.path);
      console.log(`name <${config.name}> path <${http_options.path}>`);
    }

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
              f.description = `${f.name} ${f.type === 'file' ? '(' + formatBytes(f.size) + ')' : ''}`;
              f.detail = `${path.join(f.path, f.name)}`;
              f.buttons = [fileBtn];
            });
            resolve(files);
          } catch (e: any) {
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
      query = config.query.length > 0 ? config.query + '+' + FindSuiteSettings.excludePatterns.filter(f => f).map(p => { return `!path:${p} `; }).join('+') : '';
    }
    console.log(`buildQuery <${query}> extraQuery <${extraQuery}>`);

    if (!config.inWorkspace) {
      return (query + extraQuery.trim().replace(/\s/g, '+')).trim();
    } else {
      let ws = this._workspaceFolders;

      if (this._workspaceFolders.length === 0) {
        return extraQuery;
      } else {
        let patterns: string[] = [];
        let userPattern: string = '\\*' + extraQuery + '*';

        ws.forEach((path) => {
          patterns.push(path + userPattern);
        });

        return patterns.join(' | ');
      }
    }
  }

  private makeEverythingConfig(extraConfig: { title: string, sort: string, query: string, canPickMany?: boolean }) {
    let config: EverythingConfig | undefined = {
      ...defEverythingConfig,
      ...extraConfig
    };

    return config;
  }

  public async execute(filterType: string, isOpen: boolean = true, query: string | undefined = undefined) {
    let extraConfig: EverythingConfig;
    if (filterType === 'files') {
      extraConfig = this.makeEverythingConfig({
        sort: 'date_modified',
        title: 'Open Files',
        query: 'files:'
      });
    } else if (filterType === 'filesPipe') {
      extraConfig = this.makeEverythingConfig({
        sort: 'date_modified',
        title: 'Select Files and Rg (Like everything | rg)',
        query: 'files:'
      });
    } else if (filterType === 'folder') {
      extraConfig = this.makeEverythingConfig({
        sort: 'date_modified',
        title: 'Open Folder',
        query: 'folder:'
      });
    } else if (filterType === 'folderPipe') {
      extraConfig = this.makeEverythingConfig({
        sort: 'date_modified',
        title: 'Select Folders and Rg (Like everything | rg)',
        query: 'folder:'
      });
    } else if (filterType === 'diffFiles') {
      extraConfig = this.makeEverythingConfig({
        sort: 'date_modified',
        title: 'Select Files to Diff',
        query: 'folder:',
        canPickMany: true
      });
    } else if (filterType === 'diffFolder') {
      extraConfig = this.makeEverythingConfig({
        sort: 'date_modified',
        title: 'Open Folder',
        query: 'folder:',
        canPickMany: true
      });
    } else if (filterType === 'folderFiles') {
      extraConfig = this.makeEverythingConfig({
        sort: 'date_modified',
        title: 'Search Folder (1/2)',
        query: 'folder:'
      });
    } else if (filterType === 'code-workspace') {
      extraConfig = this.makeEverythingConfig({
        sort: 'name',
        title: 'Open new window with workspace',
        query: 'ext:code-workspace'
      });
      query = '__EMPTY__';
    } else if (filterType === 'workspace') {
      if (!this._workspaceFolders || this._workspaceFolders.length === 0) {
        notifyMessageWithTimeout('Workspace is not exist');
        return;
      }
      extraConfig = this.makeEverythingConfig({
        sort: 'name',
        title: 'Open Files',
        query: 'path:' + this._workspaceFolders.join('|') + ' files:',
        canPickMany: true
      });
      if (query) {
        query = '__EMPTY__';
      }
    } else if (filterType === 'path') {
      extraConfig = this.makeEverythingConfig({
        sort: 'name',
        title: 'Open Folder',
        query: 'path:' + (query ?? '')
      });
      if (query) {
        query = '__EMPTY__';
      }
    } else {
      extraConfig = defEverythingConfig;
    }

    extraConfig.filterType = filterType;
    return this.executeConfig(extraConfig, isOpen, query);
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

    const items: QuickPickItem[] = await notifyWithProgress(`Searching <${txt}>`, async () => {
      return await this.searchInEverything(config, txt);
    });
    const limit = FindSuiteSettings.limitOpenFile;

    if (config.filterType === 'folder' || config.filterType === 'folderFiles' || config.filterType === 'code-workspace') {
      const item = await vscode.window.showQuickPick(items, {
        title: `Everything ${txt ? '<' + txt + '>' : ''} :: Results <${items.length}> :: Open`,
        placeHolder: txt,
        canPickMany: config?.canPickMany ?? false,
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
        title: `Everything ${txt ? '<' + txt + '>' : ''} :: Results <${items.length}> Limits <${limit}> :: ${isOpen ? "Open File" : ""}`,
        placeHolder: txt,
        canPickMany: true,
        matchOnDetail: true,
        matchOnDescription: true
      });

      return await this.openMultiFiles(results, isOpen, limit);
    }

    return undefined;
  }

  public async interact(filterType: string, isOpen: boolean = true, query: string | undefined = undefined) {
    let config: EverythingConfig = this.makeEverythingConfig({
      sort: 'date_modified',
      title: 'Open Files',
      query: 'files:'
    });

    const quickPick = vscode.window.createQuickPick<QuickPickItem>();
    quickPick.title = 'Everything:: Filename';
    quickPick.placeholder = 'Please enter the string to search';
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDetail = true;
    // quickPick.matchOnDescription = true;

    const isOption = (s: string) => /^--?[a-z]+/.test(s);
    const isWordQuoted = (s: string) => /^".*"/.test(s);

    if (config.replaceQuery) {
      quickPick.value = config.opt;
      config.opt = '';
    } else {
      const txt = getSelectionText(true);
      if (txt) {
        quickPick.value = txt;
      }
    }

    quickPick.onDidChangeValue(async (item) => {
      if (!item || item === "") {
        return;
      }
      this.query = item.split(/\s/).reduce((acc, curr, index) => {
        if (index === 0 || isOption(curr) || isOption(acc[acc.length - 1])) {
          if (!isWordQuoted(curr) && !isOption(curr)) {
            acc.push(curr);
            return acc;
          }

          acc.push(config.skipQuote ? curr : curr.replace(/"/g, ""));
          return acc;
        }
        acc[acc.length - 1] = acc[acc.length - 1] + ` ${curr}`;
        return acc;
      }, [] as string[]);

      try {
        const queryTxt = this.query.join(' ');
        quickPick.items = await this.searchInEverything(config, queryTxt);
        quickPick.title = `Everything: ${config.title} <${queryTxt}> :: Results <${quickPick.items.length}>`;
      } catch (error: any) {
        console.log(`interact() - Error: ${error.message}`);
        logger.error(`interact() - Error: ${error.message}`);
      }
    });

    quickPick.onDidAccept(async () => {
      const item = quickPick.selectedItems[0] as QuickPickItem;
      if (!item) {
        return;
      }

      await this.openFile(item);
      quickPick.dispose();
    });

    quickPick.onDidTriggerItemButton(async (e) => {
      if (e.button.tooltip === 'File') {
        await this.openFile(e.item);
      }
    });

    quickPick.show();
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
