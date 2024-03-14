import * as fs from 'fs';
import { platform } from "node:process";
import path from "path";
import { ExtensionContext } from 'vscode';
import FindSuiteSettings from '../config/settings';
import { FavoritesEntries, emptyFavorEntries } from '../model/favorites';
import { notifyMessageWithTimeout } from '../utils/vsc';
import { Constants } from './constants';

export class FavoriteFiles {

    private static instance: FavoriteFiles;

    private _favoriteEntries: FavoritesEntries;

    private maxFiles = Constants.FAVOR_MAX;
    private _filePath;

    public get favoriteFiles(): FavoritesEntries {
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
        if (!FavoriteFiles.instance) {
            FavoriteFiles.instance = new FavoriteFiles(context);
        }
        return FavoriteFiles.instance;
    }

    getItems(): string[] {
        return [
            ...this._favoriteEntries.files.map(it => it.path),
            ...this._favoriteEntries.dir.map(it => it.path),
        ];
    }

    clearAllFiles(): void {
        this._favoriteEntries = emptyFavorEntries;
        console.log(`All files cleared.`);
    }

    addItem(fileName: string): void {
        const stats = fs.statSync(fileName);
        let items = this._favoriteEntries.files;
        if (stats.isDirectory()) {
            items = this._favoriteEntries.dir;
        }

        if (items.map((favor) => favor.path).includes(fileName)) {
            console.log(`${fileName} is already added to favorites.`);
            return;
        }

        if (items.length >= this.maxFiles) {
            console.log(`Maximum number of files (${this.maxFiles}) reached. Deleting the oldest file.`);
            items.shift();
        }

        items.push({
            name: path.basename(fileName),
            path: fileName,
        });
        console.log(`${fileName} added to favorites.`);
        this.saveToFile();
    }

    public saveToFile(): void {
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

    public delete(fileName: string): void {
        const files = this._favoriteEntries.files;
        const index = files.map((favor) => favor.path).indexOf(fileName);
        if (index !== -1) {
            files.splice(index, 1);
            notifyMessageWithTimeout(`File ${fileName} removed from favorites.`);
        } else {
            console.log(`${fileName} is not in the favorites.`);
            const dir = this.favoriteFiles.dir;
            const index1 = dir.map((favor) => favor.path).indexOf(fileName);
            if (index1 !== -1) {
                dir.splice(index, 1);
                notifyMessageWithTimeout(`Directory ${fileName} removed from favorites.`);
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
