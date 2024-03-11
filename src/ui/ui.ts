import * as cp from 'child_process';
import { ProgressLocation, Uri, env, version, window } from 'vscode';
import logger from '../utils/logger';

export function showInfoMessageWithTimeout(message: string, timeout: number = 3000) {
    const upTo = timeout / 10;
    window.withProgress({
        location: ProgressLocation.Notification,
        title: message,
        cancellable: true,
    },
        async (progress) => {
            let counter = 0;
            return new Promise<void>((resolve) => {
                const interval = setInterval(() => {
                    progress.report({ increment: counter / upTo });
                    if (++counter === upTo) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 10);
            });
        }
    );
}

export async function showDoneableInfo(title: string, callback: () => Promise<void>) {
    await window.withProgress({
        location: ProgressLocation.Notification,
        title,
    },
        async () => callback()
    );
}

export async function notifyWithProgress<T>(title: string, cbFn: () => Promise<T>) {
    try {
        const result = await window.withProgress<T>({
            location: ProgressLocation.Notification,
            title,
            cancellable: true,
        },
            async (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log('Progress canceled');
                });
                return cbFn();
            }
        );
        return result;
    } catch (error: any) {
        logger.error(`notifyWithProgress(): error <${error.message}>`);
        // throw error;
    }
    return undefined;
}

export async function showErrorMessageWithMoreInfo(message: string, link: string) {
    const moreInfo = 'More Info';
    const result = await window.showErrorMessage(message, moreInfo);
    if (result === moreInfo) {
        env.openExternal(Uri.parse(link));
    }
}

export function openWithCmd(filePath: string): void {
    const cmd = `cmd.exe /C start "" "${filePath}"`;

    cp.exec(cmd, (error, stdout, stderr) => {
        if (error) {
            showInfoMessageWithTimeout(`Error opening ${filePath}: ${error.message}`);
        }
    });
}
