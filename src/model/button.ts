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

export const addClipBtn: QuickInputButton = {
    iconPath: new ThemeIcon('add'),
    tooltip: 'Add to clipboard'
};

export const searchButtons = [addClipBtn, viewBtn, copyBtn];

export const rgHeaderButtons = [addClipBtn, diffBtn, copyBtn];
