import { QuickInputButton, ThemeIcon } from "vscode";
import { Constants } from "../svc/constants";

export const viewBtn: QuickInputButton = {
    iconPath: new ThemeIcon('eye'),
    tooltip: Constants.VIEW_BUTTON
};

export const copyBtn: QuickInputButton = {
    iconPath: new ThemeIcon('files'),
    tooltip: Constants.COPY_BUTTON
};

export const diffBtn: QuickInputButton = {
    iconPath: new ThemeIcon('compare-changes'),
    tooltip: Constants.DIFF_BUTTON
};

export const addClipBtn: QuickInputButton = {
    iconPath: new ThemeIcon('add'),
    tooltip: Constants.ADD_CLIP_BUTTON
};

export const windowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('window'),
    tooltip: Constants.WINDOW_BUTTON
};

export const starBtn: QuickInputButton = {
    iconPath: new ThemeIcon('star'),
    tooltip: Constants.FAVORITE_BUTTON
};

export const removeBtn: QuickInputButton = {
    iconPath: new ThemeIcon('trash'),
    tooltip: Constants.REMOVE_BUTTON
};

export const refreshBtn: QuickInputButton = {
    iconPath: new ThemeIcon('refresh'),
    tooltip: Constants.REFRESH_BUTTON
};

export const openFavorBtn: QuickInputButton = {
    iconPath: new ThemeIcon('open-preview'),
    tooltip: Constants.OPEN_FAVORITE_BUTTON
};

export const searchButtons = [starBtn, addClipBtn, viewBtn, copyBtn];

export const fdButtons = [starBtn, addClipBtn, viewBtn, copyBtn];

export const wsButtons = [windowBtn];

export const favorButtons = [viewBtn, removeBtn];

export const favorHeaderButtons = [diffBtn, openFavorBtn, refreshBtn];

export const rgHeaderButtons = [addClipBtn, diffBtn, copyBtn];

export const fdHeaderButtons = [starBtn];
