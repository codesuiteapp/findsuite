export interface FdQuery {
    title: string;
    opt: string;
    srchPath: string | undefined;
    fileType: 'file' | 'fileWs' | 'fileCodeWs' | 'dir' | 'diff' | 'diffWs';
    isMany: boolean;
    wsPath: string;
}

export const fdInitQuery: FdQuery = {
    title: 'Filename to search',
    opt: '',
    fileType: 'file',
    srchPath: undefined,
    isMany: true,
    wsPath: ''
};

export interface QuickPickItemResults<T> {
    total: number;
    matches: number;
    items: T[];
}
