import * as fs from 'fs';
import path from "path";
import { ExtensionContext, workspace } from 'vscode';
import { HistoryEntry, HistoryFileEntry } from '../model/history';
import { Constants } from './constants';

export class HistoryManager {

    private static instance: HistoryManager;

    private _workspaceFolders: string[];

    private maxFiles = Constants.HISTORY_MAX;

    private _historyMap: Map<string, HistoryEntry<HistoryFileEntry>>;

    private _filePath;

    public get filePath() {
        return this._filePath;
    }

    constructor(protected context: ExtensionContext) {
        this._workspaceFolders = workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
        this._filePath = path.join(this._workspaceFolders[0] ?? '.', Constants.HISTORY_DATA_FILE);
        console.log(`filePath <${this._filePath}>`);
        this._historyMap = this.loadFromFile(this._filePath);
    }

    public static getInstance(context: ExtensionContext) {
        if (!HistoryManager.instance) {
            HistoryManager.instance = new HistoryManager(context);
        }
        return HistoryManager.instance;
    }

    public saveFile() {
        const fileName = this._filePath;
        const data = JSON.stringify(this._historyMap, null, 2);
        fs.writeFileSync(fileName, data, 'utf8');
        this.refresh();
    }

    public addHistory(query: string, entries: HistoryEntry<HistoryFileEntry>) {
        if (this._historyMap.size >= this.maxFiles) {
            console.log(`size: ${this._historyMap.size}`);
        }

        this._historyMap.set(query, entries);
        this.saveFile();
    }

    public clear() {
        this._historyMap.clear();
    }

    public loadFromFile(fileName: string): Map<string, HistoryEntry<HistoryFileEntry>> {
        console.log(`loadFromFile(): fileName <${fileName}>`);

        if (!fs.existsSync(fileName)) {
            console.log(`File <${fileName}> does not exist. Created.`);
            this._historyMap = new Map();
            this.saveFile();
            return new Map();
        }

        const data = fs.readFileSync(fileName, 'utf8');
        if (data) {
            return JSON.parse(data) as Map<string, HistoryEntry<HistoryFileEntry>>;
        } else {
            return new Map();
        }
    }

    public refresh() {
        // this._favoriteEntries = this.loadFromFile(this._filePath);
    }

}
