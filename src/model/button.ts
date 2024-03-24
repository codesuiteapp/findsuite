import { QuickInputButton, QuickInputButtons, ThemeIcon } from "vscode";
import { Constants } from "../svc/constants";

export const addClipBtn: QuickInputButton = {
    iconPath: new ThemeIcon('replace'),
    tooltip: Constants.ADD_CLIP_BUTTON
};

export const closeBtn: QuickInputButton = {
    iconPath: new ThemeIcon('close'),
    tooltip: Constants.CLOSE_BUTTON
};

export const copyBtn: QuickInputButton = {
    iconPath: new ThemeIcon('clippy'),
    tooltip: Constants.CLIP_COPY_BUTTON
};

export const diffBtn: QuickInputButton = {
    iconPath: new ThemeIcon('compare-changes'),
    tooltip: Constants.DIFF_BUTTON
};

export const heartBtn: QuickInputButton = {
    iconPath: new ThemeIcon('heart'),
    tooltip: Constants.FAVORITE_BUTTON
};

export const viewBtn: QuickInputButton = {
    iconPath: new ThemeIcon('eye'),
    tooltip: Constants.VIEW_BUTTON
};

export const openFavorDirBtn: QuickInputButton = {
    iconPath: new ThemeIcon('file-symlink-directory'),
    tooltip: Constants.OPEN_FAVORITE_DIR_BUTTON
};

export const openFavorBtn: QuickInputButton = {
    iconPath: new ThemeIcon('open-preview'),
    tooltip: Constants.OPEN_FAVORITE_BUTTON
};

export const windowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('window'),
    tooltip: Constants.WINDOW_BUTTON
};

export const removeBtn: QuickInputButton = {
    iconPath: new ThemeIcon('trash'),
    tooltip: Constants.REMOVE_BUTTON
};

export const shieldBtn: QuickInputButton = {
    iconPath: new ThemeIcon('shield'),
    tooltip: Constants.SHIELD_BUTTON
};

export const refreshBtn: QuickInputButton = {
    iconPath: new ThemeIcon('refresh'),
    tooltip: Constants.REFRESH_BUTTON
};

export const rgWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('preview'),
    tooltip: Constants.RG_WINDOW_BUTTON
};

export const favorWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('multiple-windows'),
    tooltip: Constants.FAVOR_WINDOW_BUTTON
};

export const historyWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('history'),
    tooltip: Constants.HISTORY_WINDOW_BUTTON
};

export const errorWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('error'),
    tooltip: Constants.ERROR_WINDOW_BUTTON
};

export const warnWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('warning'),
    tooltip: Constants.WARN_WINDOW_BUTTON
};

export const searchButtons = [viewBtn, copyBtn, addClipBtn, heartBtn];

export const fdButtons = [copyBtn, addClipBtn, viewBtn, heartBtn];

export const wsButtons = [windowBtn];

export const favorButtons = [viewBtn, removeBtn];

export const favorShieldButtons = [viewBtn, shieldBtn];

export const favorDirButtons = [openFavorDirBtn, removeBtn];

export const favorShieldDirButtons = [openFavorDirBtn, shieldBtn];

export const favorHeaderButtons = [diffBtn, historyWindowBtn, rgWindowBtn, openFavorBtn, refreshBtn];

export const rgHeaderButtons = [diffBtn, historyWindowBtn, favorWindowBtn, addClipBtn, copyBtn];

export const searchHeaderButtons = [historyWindowBtn, favorWindowBtn];

export const fdHeaderButtons = [heartBtn];

export const editorButtons = [viewBtn, copyBtn, addClipBtn, heartBtn, closeBtn];

export const editorHeaderButtons = [closeBtn, diffBtn, favorWindowBtn];

export const historyHeaderButtons = [rgWindowBtn, favorWindowBtn];

export const hisDetailHeaderButtons = [QuickInputButtons.Back, favorWindowBtn];

export const historyButtons = [removeBtn];

export const errorHeaderButtons = [warnWindowBtn];

export const warnHeaderButtons = [errorWindowBtn];
