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

export const windowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('window'),
    tooltip: 'Window'
};

export const starBtn: QuickInputButton = {
    iconPath: new ThemeIcon('star'),
    tooltip: 'Favorite'
};

export const searchButtons = [addClipBtn, viewBtn, copyBtn];

export const fdButtons = [starBtn, addClipBtn, viewBtn, copyBtn];

export const wsButtons = [windowBtn];

export const favorButtons = [viewBtn];

export const favorHeaderButtons = [diffBtn];

export const rgHeaderButtons = [addClipBtn, diffBtn, copyBtn];

export const fdHeaderButtons = [starBtn];
