import { QuickPickItem } from "vscode";

export interface FavoriteEntry {
    id: string;
    name: string;
    path: string;
    category: string;
    protect?: boolean;
}

export interface FavoritesEntries {
    files: FavoriteEntry[];
    directories: FavoriteEntry[];
}

export interface QuickPickFavorItem extends QuickPickItem {
    id?: string;
}

export const emptyFavorEntries = {
    files: [],
    directories: []
};
