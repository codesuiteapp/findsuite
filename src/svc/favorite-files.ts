import * as fs from 'fs';
import { platform } from "node:process";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { ExtensionContext } from 'vscode';
import FindSuiteSettings from '../config/settings';
import { FavoritesEntries, emptyFavorEntries } from '../model/favorites';
import { notifyMessageWithTimeout } from '../utils/vsc';
import { Constants } from './constants';

export class FavoriteManager {

    private static instance: FavoriteManager;

    private maxFiles = Constants.FAVOR_MAX;

    private _favoriteEntries: FavoritesEntries;

    private _filePath;

    public get favoriteEntries(): FavoritesEntries {
        return this._favoriteEntries;
    }

    public get filePath() {
        return this._filePath;
    }

    constructor(protected context: ExtensionContext) {
        let localPath = this.getPlatformPath();
        if (!localPath) {
            localPath = this.context.extensionPath;
        }
        this._filePath = path.join(localPath, Constants.FAVORITE_DATA_FILE);
        console.log(`filePath <${this._filePath}>`);
        this._favoriteEntries = this.loadFromFile(this._filePath);
    }

    public static getInstance(context: ExtensionContext) {
        if (!FavoriteManager.instance) {
            FavoriteManager.instance = new FavoriteManager(context);
        }
        return FavoriteManager.instance;
    }

    getItems(): string[] {
        return [
            ...this._favoriteEntries.files.map(it => it.path),
            ...this._favoriteEntries.directories.map(it => it.path),
        ];
    }

    clearAllFiles(): void {
        this._favoriteEntries = emptyFavorEntries;
        this.saveToFile();
        notifyMessageWithTimeout(`All files cleared.`);
        console.log(`All files cleared.`);
    }

    addItem(fileName: string): boolean {
        const stats = fs.statSync(fileName);
        let items = this._favoriteEntries.files;
        if (stats.isDirectory()) {
            items = this._favoriteEntries.directories;
        }

        if (items.map((favor) => favor.path).includes(fileName)) {
            console.log(`${fileName} is already added to favorites.`);
            notifyMessageWithTimeout(`<${fileName}> is already added to favorites.`);
            return false;
        }

        if (items.length >= this.maxFiles) {
            console.log(`Maximum number of files (${this.maxFiles}) reached. Deleting the oldest file.`);
            items.shift();
        }

        items.push({
            id: uuidv4(),
            name: path.basename(fileName),
            path: fileName,
            category: 'default',
            protect: stats.isDirectory() ? false : true
        });

        console.log(`${fileName} added to favorites.`);
        this.saveToFile();
        notifyMessageWithTimeout(`Add to Favorites <${path.basename(fileName)}>`);
        return true;
    }

    public saveToFile() {
        const fileName = this._filePath;
        const data = JSON.stringify({
            ...this._favoriteEntries
        }, null, 2);
        fs.writeFileSync(fileName, data, 'utf8');
        this.refresh();
    }

    public loadFromFile(fileName: string): FavoritesEntries {
        console.log(`loadFromFile(): fileName <${fileName}>`);

        if (!fs.existsSync(fileName)) {
            console.log(`File <${fileName}> does not exist. Created.`);
            this.saveToFile();
            return emptyFavorEntries;
        }

        const data = fs.readFileSync(fileName, 'utf8');
        if (data) {
            return JSON.parse(data) as FavoritesEntries;
        } else {
            return emptyFavorEntries;
        }
    }

    public async update(fileId: string, isDelete: boolean = false) {
        const files = this._favoriteEntries.files;
        const index = files.findIndex(it => it.id === fileId);
        if (index !== -1) {
            if (isDelete) {
                files.splice(index, 1);
            } else {
                files[index].protect = !files[index].protect;
            }
            notifyMessageWithTimeout(`File ${fileId} ${isDelete ? 'removed' : 'unprotected'} from favorites.`);
        } else {
            console.log(`<${fileId}> is not in the favoriteEntries.files.`);
            const index1 = this._favoriteEntries.directories.findIndex(it => it.id === fileId);
            if (index1 !== -1) {
                if (isDelete) {
                    this._favoriteEntries.directories.splice(index1, 1);
                } else {
                    this._favoriteEntries.directories[index1].protect = !this._favoriteEntries.directories[index1].protect;
                }
                notifyMessageWithTimeout(`Directory ${fileId} ${isDelete ? 'removed' : 'unprotected'} from favorites.`);
            }
        }
        this.saveToFile();
    }

    public refresh() {
        this._favoriteEntries = this.loadFromFile(this._filePath);
    }

    private getPlatformPath() {
        let path;
        switch (platform) {
            case "win32": path = FindSuiteSettings.pathWin32Favorites; break;
            case "darwin": path = FindSuiteSettings.pathMacFavorites; break;
            default: path = FindSuiteSettings.pathLinuxFavorites; break;
        }
        return path;
    }

}
