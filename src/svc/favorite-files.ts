export class FavoriteFiles {

    private _favoriteFiles: string[] = [];

    private maxFiles = 50;

    public get favoriteFiles(): string[] {
        return this._favoriteFiles;
    }

    getAllFiles(): string[] {
        return this.favoriteFiles;
    }

    clearAllFiles(): void {
        this._favoriteFiles = [];
        console.log(`All files cleared.`);
    }

    addFile(fileName: string): void {
        if (this.favoriteFiles.includes(fileName)) {
            console.log(`${fileName} is already added to favorites.`);
            return;
        }

        if (this.favoriteFiles.length >= this.maxFiles) {
            console.log(`Maximum number of files (${this.maxFiles}) reached. Deleting the oldest file.`);
            this.deleteOldestFile();
        }

        // Add the file
        this.favoriteFiles.push(fileName);
        console.log(`${fileName} added to favorites.`);
    }

    deleteFile(fileName: string): void {
        const index = this.favoriteFiles.indexOf(fileName);
        if (index !== -1) {
            this.favoriteFiles.splice(index, 1);
            console.log(`${fileName} removed from favorites.`);
        } else {
            console.log(`${fileName} is not in the favorites.`);
        }
    }

    private deleteOldestFile(): void {
        const oldestFile = this.favoriteFiles.shift();
        console.log(`Deleted ${oldestFile}.`);
    }

}
