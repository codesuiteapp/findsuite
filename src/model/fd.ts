import { QuickPickItem } from "vscode";

export interface FdQuery {
    title: string;
    opt: string;
    srchPath: string | undefined;
    fileType: "file" | "fileWs" | "dir" | "diff" | "diffWs";
    isMany: boolean;
}

export interface QuickPickItemResults {
    items: QuickPickItem[];
}

export const fdInitQuery: FdQuery = {
    title: 'Filename to search',
    opt: '',
    fileType: 'file',
    srchPath: undefined,
    isMany: true
};
