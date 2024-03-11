import { QuickInputButton, ThemeIcon } from "vscode";

export const viewBtn: QuickInputButton = {
    iconPath: new ThemeIcon('eye'),
    tooltip: 'View'
};

export const copyBtn: QuickInputButton = {
    iconPath: new ThemeIcon('files'),
    tooltip: 'Copy'
};

export const diffBtn: QuickInputButton = {
    iconPath: new ThemeIcon('compare-changes'),
    tooltip: 'Diff'
};

export const searchButtons = [viewBtn, copyBtn];

export const rgHeaderButtons = [diffBtn, copyBtn];
