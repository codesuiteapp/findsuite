export interface FdQuery {
    title: string;
    opt: string;
    srchPath: string | undefined;
    fileType: "file" | "fileWs" | "dir" | "diff" | "diffWs";
    isMany: boolean;
}

export const fdInitQuery: FdQuery = {
    title: 'Filename to search',
    opt: '',
    fileType: 'file',
    srchPath: undefined,
    isMany: true
};

export interface QuickPickItemResults<T> {
    total: number;
    items: T[];
}
