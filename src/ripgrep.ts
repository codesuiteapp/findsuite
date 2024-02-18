import * as cp from "child_process";
import { arch, platform } from "node:process";
import path from "path";
import { quote } from "shell-quote";
import * as vscode from "vscode";

const MAX_DESC_LENGTH = 1000;
const MAX_BUF_SIZE = 200000 * 1024;

const workspaceFolders: string[] = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) || [];
const projectRoot = workspaceFolders[0] || ".";

export async function registerRipgrep(rgPath: string, query: string[], scrollBack: QuickPickItemWithLine[]) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = 'RipGrep: Search text';
    quickPick.placeholder = 'Please enter the string to search';
    quickPick.matchOnDescription = true;

    const isOption = (s: string) => /^--?[a-z]+/.test(s);
    const isWordQuoted = (s: string) => /^".*"/.test(s);
    quickPick.items = scrollBack;

    quickPick.onDidChangeValue(async (item) => {
        if (!item || item === "") {
            return;
        }
        query = item.split(/\s/).reduce((acc, curr, index) => {
            if (index === 0 || isOption(curr) || isOption(acc[acc.length - 1])) {
                if (!isWordQuoted(curr) && !isOption(curr)) {
                    acc.push("-i", curr);
                    return acc;
                }
                acc.push(curr.replace(/"/g, "")); // remove quotes
                return acc;
            }
            acc[acc.length - 1] = acc[acc.length - 1] + ` ${curr}`;
            return acc;
        }, [] as string[]);

        quickPick.items = await fetchGrepItems(quote([rgPath, "-n", ...query, "."]),
            projectRoot
        );
        quickPick.title = `RipGrep: Search text <${query[1]}>`;
    });

    quickPick.onDidAccept(async () => {
        const scrollBackItem = {
            label: query.join(" "),
            description: "History",
            num: scrollBack.length + 1,
        };

        // Scrollback history is limited to 10 items
        if (scrollBack.length > 10) {
            scrollBack.shift();
        }
        scrollBack.unshift(scrollBackItem);

        const item = quickPick.selectedItems[0] as QuickPickItemWithLine;
        if (!item) {
            return;
        }
        if (item.description === "History") {
            // Add ability to select history item to replace current search
            quickPick.items = await fetchGrepItems(quote([rgPath, "-n", ...item.label.split(/\s/), "."]),
                projectRoot
            );
            return;
        }

        await openChoiceFile(item);
    });

    quickPick.onDidChangeActive(async () => {
        const item = quickPick.selectedItems[0] as QuickPickItemWithLine;
        if (!item) {
            return;
        }

        await openChoiceFile(item);
    });

    quickPick.show();
}

export async function openChoiceFile(item: QuickPickItemWithLine) {
    const { detail, num } = item;
    const doc = await vscode.workspace.openTextDocument(
        projectRoot + "/" + detail
    );

    const editor = await vscode.window.showTextDocument(doc);
    if (!vscode.window.activeTextEditor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
    }

    const line = num - 1;
    const selection = new vscode.Selection(~~line, 0, ~~line, 0);
    editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    editor.selection = selection;
}

export function getRgPath(extensionPath: string) {
    const rgVer = "14_1_0";
    const basePath = `${extensionPath}/bin/${rgVer}`;
    switch (platform) {
        case "win32":
            return `${basePath}/${platform}/rg.exe`;
        case "darwin":
            return `${basePath}/${platform}/rg`;
        case "linux":
            if (arch === "arm" || arch === "arm64") {
                return `${basePath}/${platform}-armv7/rg`;
            } else {
                return `${basePath}/${platform}/rg`;
            }
        default:
            return "rg";
    }
}

export function fetchGrepItems(command: string, projectRoot: string): Promise<QuickPickItemWithLine[]> {
    return new Promise((resolve, reject) => {
        cp.exec(command,
            { cwd: projectRoot, maxBuffer: MAX_BUF_SIZE },
            (err, stdout, stderr) => {
                if (stderr) {
                    vscode.window.showErrorMessage(stderr);
                    return resolve([]);
                }
                const lines = stdout.split(/\n/).filter((l) => l !== "");
                if (!lines.length) {
                    return resolve([]);
                }

                return resolve(lines
                    .map((line) => {
                        const [fullPath, num, ...desc] = line.split(":");
                        const description = desc.join(":").trim();
                        return {
                            fullPath,
                            num: Number(num),
                            line,
                            description,
                        };
                    })
                    .filter(({ description, num }) =>
                        description.length < MAX_DESC_LENGTH && !!num
                    )
                    .map(({ fullPath, num, line, description }) => {
                        const path1 = fullPath.split("/");
                        return {
                            label: `${path.basename(path1[path1.length - 1])}:${num}`,
                            description,
                            detail: fullPath,
                            num,
                        };
                    })
                );
            }
        );
    });
}

export interface QuickPickItemWithLine extends vscode.QuickPickItem {
    num: number;
}
