import * as cp from "child_process";
import { quote } from "shell-quote";
import * as vscode from "vscode";
import FindSuiteSettings from "../config/settings";
import { showInfoMessageWithTimeout } from "../ui/ui";
import logger from "../utils/logger";

export async function diff(src: string, dst: string, cmd: string = 'vscode.diff') {
    const uri1 = vscode.Uri.file(src);
    const uri2 = vscode.Uri.file(dst);
    vscode.commands.executeCommand(cmd, uri1, uri2);
}

export async function multipleDiffs(files: string[]) {
    for (let i = 0; i < files.length; i += 2) {
        await diff(files[i], files[i + 1]);
    }
}

export async function showMultipleDiffs(files: vscode.QuickPickItem[], diffType: "file" | "dir" = "file") {
    const external = FindSuiteSettings.compareExternalEnabled;
    const prog = FindSuiteSettings.compareExternalProgram;

    for (let i = 0; i < files.length; i += 2) {
        if (i + 2 > files.length) {
            return;
        }

        if (diffType === 'dir' && !external) {
            showInfoMessageWithTimeout('Folder comparison is only available when an external program is selected. Please register an "External Diff Program."');
            return;
        }

        if (external && prog) {
            await executeDiff(files[i].detail!, files[i + 1].detail!, prog, FindSuiteSettings.compareExternalOption);
        } else {
            await diff(files[i].detail!, files[i + 1].detail!);
        }
    }
}

async function executeDiff(src: string, dst: string, prog: string, opt: string = '') {
    const cmd = `"${prog}" ${opt} "${src}" "${dst}"`;
    cp.exec(cmd, { cwd: "." }, (error, stdout, stderr) => {
        console.log(`error <${error}> stderr <${stderr}>`);
        if (stderr) {
            console.log(stderr);
            return;
        }
    });
}
