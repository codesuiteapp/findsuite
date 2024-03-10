import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Find Suite');
let isShow = false;

export function show() {
    outputChannel.show();
    isShow = true;
}

export function hide() {
    outputChannel.hide();
    isShow = false;
}

export function toggle() {
    if (isShow) {
        hide();
    } else {
        show();
    }
}

export function print(...args: any) {
    const msg = args.map((arg: { stack: any; toString: () => string; }) => {
        if (!arg) {
            return arg;
        }

        if (arg instanceof Error) {
            return arg.stack;
        } else if (!arg.toString || arg.toString() === '[object Object]') {
            return JSON.stringify(arg);
        }

        return arg;
    }).join(' ');

    outputChannel.appendLine(msg);
}
