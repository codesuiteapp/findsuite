import * as fs from 'fs';
import { platform } from "node:process";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { ExtensionContext } from 'vscode';
import FindSuiteSettings from '../config/settings';
import { FavoritesEntries } from '../model/favorites';
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
            localPath = path.join(this.context.extensionPath, '.vscode');
        }
        this._filePath = path.join(localPath, Constants.FAVORITE_DATA_FILE);
        console.log(`filePath <${this._filePath}> localPath <${localPath}>`);
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

    getCategories(): string[] {
        return FindSuiteSettings.categoryFavorites;
    }

    getPrimary() {
        let primary = this.favoriteEntries?.primary;
        if (!primary) {
            const fav = FindSuiteSettings.categoryFavorites;
            if (fav && fav.length > 0) {
                primary = fav[0];
            } else {
                primary = '';
            }
        }
        return primary;
    }

    clearAllFiles(): void {
        this._favoriteEntries = this.makeEmptyFavorEntries();
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
            category: stats.isDirectory() ? '' : this.getPrimary(),
            protect: stats.isDirectory() ? true : false
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
            console.log(`Created. File <${fileName}> does not exist.`);
            this._favoriteEntries = this.makeEmptyFavorEntries();
            this.saveToFile();
            return this._favoriteEntries;
        }

        const data = fs.readFileSync(fileName, 'utf8');
        if (data) {
            return JSON.parse(data) as FavoritesEntries;
        } else {
            return this._favoriteEntries;
        }
    }

    public async update(fileId: string, isDelete: boolean = false) {
        const files = this._favoriteEntries.files;
        const index = files.findIndex(it => it.id === fileId);
        if (index !== -1) {
            let filename = '';
            if (isDelete) {
                const entries = files.splice(index, 1);
                if (entries && entries.length > 0) {
                    filename = entries[0].name;
                }
            } else {
                files[index].protect = !files[index].protect;
                filename = files[index].name;
            }
            notifyMessageWithTimeout(`File ${filename} ${isDelete ? 'removed' : 'unprotected'} from favorites.`);
        } else {
            console.log(`<${fileId}> is not in the favoriteEntries.files.`);
            const index1 = this._favoriteEntries.directories.findIndex(it => it.id === fileId);
            if (index1 !== -1) {
                let filename = '';
                if (isDelete) {
                    const entries = this._favoriteEntries.directories.splice(index1, 1);
                    if (entries && entries.length > 0) {
                        filename = entries[0].name;
                    }
                } else {
                    this._favoriteEntries.directories[index1].protect = !this._favoriteEntries.directories[index1].protect;
                    filename = this._favoriteEntries.directories[index1].name;
                }
                notifyMessageWithTimeout(`Directory ${fileId} ${isDelete ? 'removed' : 'unprotected'} from favorites.`);
            }
        }
        this.saveToFile();
    }

    public refresh() {
        this._favoriteEntries = this.loadFromFile(this._filePath);
    }

    private makeEmptyFavorEntries() {
        return {
            files: [],
            directories: [],
            primary: this.getPrimary()
        };
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
