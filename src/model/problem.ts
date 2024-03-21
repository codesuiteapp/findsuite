import { QuickPickItem } from "vscode";

export interface QuickPickItemProblem<T> extends QuickPickItem {
    model: T | undefined;
}
