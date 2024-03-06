import * as vscode from "vscode";

export interface FdQuery {
    title: string;
    opt: string;
    srchPath: string | undefined;
    fileType: "file" | "dir" | "diff" | "diffWs";
    isMany: boolean;
}

export interface QuickPickItemResults {
    items: vscode.QuickPickItem[];
}
