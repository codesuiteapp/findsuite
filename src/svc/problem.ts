import * as vscode from "vscode";
import { QuickPickItemProblem } from "../model/problem";
import { openRevealFile1 } from "../utils/editor";

export class ProblemNavigator {

    private lastPosition: { position: vscode.Position, uri: vscode.Uri } | null = null;

    constructor() { }

    private sortMarkers(diagnostics: vscode.Diagnostic[]) {
        return diagnostics.sort((a, b) => a.range.start.isBefore(b.range.start) ? -1 : (a.range.start.isEqual(b.range.start) ? 0 : 1));
    }

    public async showMarkerInFiles(filter: vscode.DiagnosticSeverity[]): Promise<void> {
        const filesDiagnostics = vscode.languages.getDiagnostics()
            .filter(([_, diagnostics]) => diagnostics.some(d => filter.includes(d.severity)))
            .sort(([uri1], [uri2]) => uri1.toString().localeCompare(uri2.toString()));

        if (filesDiagnostics.length === 0) {
            vscode.window.showInformationMessage("No problems found matching the filter criteria.");
            return;
        }

        const items: QuickPickItemProblem<vscode.Diagnostic>[] = [];
        let lastUri = '';
        for (const [uri, diagnostics] of filesDiagnostics) {
            const diagnosticsFiltered = diagnostics.filter(d => filter.includes(d.severity));
            if (lastUri !== uri.toString() && items.length > 0) {
                items.push({
                    label: `:: ${uri} ::`,
                    kind: vscode.QuickPickItemKind.Separator,
                    model: undefined
                });
            }
            lastUri = uri.toString();

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)?.name ?? '';
            const relativePath = vscode.workspace.asRelativePath(uri, false).replace(workspaceFolder, "").replace(/^\//, "");
            for (const diagnostic of diagnosticsFiltered) {
                items.push({
                    label: uri.path.split('/').pop() ?? '',
                    description: uri.fsPath,
                    detail: `${vscode.DiagnosticSeverity[diagnostic.severity]}: ${diagnostic.message.split("\n")[0]}`,
                    model: diagnostic
                });
            }
        }

        const quickPick = vscode.window.createQuickPick<QuickPickItemProblem<vscode.Diagnostic>>();
        quickPick.title = 'Problems';
        quickPick.matchOnDetail = true;
        quickPick.matchOnDescription = true;
        quickPick.items = items;

        quickPick.onDidChangeActive(async (items) => {
            const selection = items[0] as QuickPickItemProblem<vscode.Diagnostic>;
            if (selection.model) {
                const file = selection.detail!;
                openRevealFile1(file, selection.model.range, { preserveFocus: true, preview: true });
            }
        });

        quickPick.onDidAccept(async () => {
            const item = quickPick.selectedItems[0] as QuickPickItemProblem<vscode.Diagnostic>;
            if (!item) {
                return;
            }
            quickPick.dispose();
        });

        quickPick.show();
    }

    public async gotoMarkerInFile(filter: vscode.DiagnosticSeverity[], direction: "next" | "prev", loop = true): Promise<boolean> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri)
            .filter(d => filter.includes(d.severity));

        if (this.lastPosition?.uri.toString() !== editor.document.uri.toString()) {
            this.lastPosition = null;
        }

        if (diagnostics.length === 0) {
            return false;
        }

        let next: vscode.Diagnostic | null = null;
        for (const d of diagnostics) {
            if (this.lastPosition && d.range.start.isEqual(this.lastPosition.position)) {
                continue;
            }

            next = direction === "next" ? this.getCloserNext(editor, d, next) : this.getCloserPrev(editor, d, next);
        }

        if (next === null && loop) {
            const sortedMarkers = this.sortMarkers(diagnostics);
            next = direction === "next" ? sortedMarkers[0] : sortedMarkers[sortedMarkers.length - 1];
            if (this.lastPosition && this.lastPosition.position.isEqual(next.range.start) && editor.selection.start.isEqual(next.range.start)) {
                return true;
            }
        }

        if (next === null) {
            return false;
        }

        this.lastPosition = { position: next.range.start, uri: editor.document.uri };
        editor.selection = new vscode.Selection(next.range.start, next.range.start);

        await vscode.commands.executeCommand("closeMarkersNavigation");

        if ((filter.length === 1 && filter[0] === vscode.DiagnosticSeverity.Error) ||
            vscode.workspace.getConfiguration("go-to-next-error").get<"marker" | "hover">("multiSeverityHandlingMethod") === "marker") {
            await vscode.commands.executeCommand("editor.action.marker.next");
        } else {
            if (!editor.visibleRanges.every(r => r.contains(editor.selection))) {
                editor.revealRange(next.range);
                if (vscode.workspace.getConfiguration().get<boolean>("editor.smoothScrolling")) {
                    await new Promise(resolve => setTimeout(resolve, 150));
                }
            }
            await vscode.commands.executeCommand("editor.action.showHover");
        }
        return true;
    }

    public async gotoNextMarkerInFiles(filter: vscode.DiagnosticSeverity[], direction: "next" | "prev"): Promise<void> {
        if (await this.gotoMarkerInFile(filter, direction, false)) {
            return;
        }

        const filesSorted = vscode.languages.getDiagnostics()
            .filter(file => {
                file[1] = file[1].filter(d => filter.includes(d.severity));
                return file[1].length > 0;
            })
            .sort(([uri1], [uri2]) => uri1.toString() < uri2.toString() ? -1 : (uri1.toString() === uri2.toString() ? 0 : 1));

        if (filesSorted.length === 0) {
            return;
        }
        if (filesSorted.length === 1 && filesSorted[0][0].toString() === vscode.window.activeTextEditor?.document.uri.toString()) {
            await this.gotoMarkerInFile(filter, direction, true);
            return;
        }

        const [uri, diagnostics] = this.getNextFile(filesSorted);
        const sortedMarkers = this.sortMarkers(diagnostics);
        const next = direction === "next" ? sortedMarkers[0] : sortedMarkers[sortedMarkers.length - 1];

        this.lastPosition = { position: next.range.start, uri };

        const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
        editor.selection = new vscode.Selection(next.range.start, next.range.start);

        await vscode.commands.executeCommand("closeMarkersNavigation");

        if (direction === "next") {
            await vscode.commands.executeCommand("editor.action.marker.nextInFiles");
        } else {
            await vscode.commands.executeCommand("editor.action.marker.prevInFiles");
        }
    }

    private getNextFile(filesSorted: [vscode.Uri, vscode.Diagnostic[]][]) {
        const currentDocumentUri = vscode.window.activeTextEditor?.document.uri.toString();
        const activeFileIndex = filesSorted.findIndex(([uri]) => uri.toString() === currentDocumentUri);

        // Return the next/previous file
        return filesSorted[activeFileIndex === -1 ? 0 : ((activeFileIndex + 1) % filesSorted.length)];
    }

    private getCloserPrev(editor: vscode.TextEditor, marker: vscode.Diagnostic, soFarClosest: vscode.Diagnostic | null) {
        if (soFarClosest === null) {
            return marker.range.start.isBeforeOrEqual(editor.selection.start) ? marker : soFarClosest;
        } else {
            return (marker.range.start.isBeforeOrEqual(editor.selection.start) && marker.range.start.isAfter(soFarClosest.range.start)) ? marker : soFarClosest;
        }
    }

    private getCloserNext(editor: vscode.TextEditor, marker: vscode.Diagnostic, soFarClosest: vscode.Diagnostic | null) {
        if (soFarClosest === null) {
            return marker.range.start.isAfterOrEqual(editor.selection.start) ? marker : soFarClosest;
        } else {
            return (marker.range.start.isAfterOrEqual(editor.selection.start) && marker.range.start.isBefore(soFarClosest.range.start)) ? marker : soFarClosest;
        }
    }

}
