export interface HistoryEntry<T> {
    id: string;
    timestamp: Date;
    query: string;
    total: number;
    fileEntries: T;
}

export interface HistoryFileEntry {
    label: string;
    description?: string;
    detail?: string;
    line_number: number;
    start: number;
    end: number;
}
