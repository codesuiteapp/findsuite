export interface FavoriteEntry {
    name: string;
    path: string;
}

export interface FavoritesEntries {
    files: FavoriteEntry[];
    dir: FavoriteEntry[];
}

export const emptyFavorEntries = {
    files: [],
    dir: []
};