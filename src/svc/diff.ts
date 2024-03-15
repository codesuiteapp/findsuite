import * as cp from "child_process";
import * as vscode from "vscode";
import FindSuiteSettings from "../config/settings";
import { showInfoMessageWithTimeout } from "../ui/ui";
import logger from "../utils/logger";
import { executeDiffWindow } from "../utils/vsc";

export async function multipleDiffs(files: string[]) {
    for (let i = 0; i < files.length; i += 2) {
        await executeDiffWindow(files[i], files[i + 1]);
    }
}

export async function showMultipleDiffs2(files: vscode.QuickPickItem[], diffType: "file" | "dir" = "file") {
    const external = FindSuiteSettings.compareExternalEnabled;
    const prog = FindSuiteSettings.compareExternalProgram;

    if (files.length !== 2) {
        showInfoMessageWithTimeout(`Please select two files. You have selected ${files.length} files.`);
        return;
    }
    if (files[0].description === files[1].description) {
        showInfoMessageWithTimeout('The names of the two files are identical.');
        return;
    }

    if (diffType === 'dir' && !external) {
        showInfoMessageWithTimeout('Folder comparison is only available when an external program is selected. Please register an "External Diff Program."');
        return;
    }

    showInfoMessageWithTimeout('Performing file comparison.');
    if (external && prog) {
        await executeDiff(files[0].description!, files[1].description!, prog, FindSuiteSettings.compareExternalOption);
    } else {
        await executeDiffWindow(files[0].description!, files[1].description!);
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
            await executeDiffWindow(files[i].detail!, files[i + 1].detail!);
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
