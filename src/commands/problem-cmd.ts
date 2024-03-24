import { DiagnosticSeverity, ExtensionContext, commands } from "vscode";
import { ProblemManager } from "../svc/problem-manager";

export function registerProblem(context: ExtensionContext) {
    const problemManager = new ProblemManager();
    context.subscriptions.push(
        commands.registerCommand('findsuite.showErrorInFile', async () => {
            problemManager.showMarkerInFile([DiagnosticSeverity.Error]);
        }),
        commands.registerCommand('findsuite.showErrorInFiles', async () => {
            problemManager.showMarkerInFiles([DiagnosticSeverity.Error]);
        }),
        commands.registerCommand('findsuite.showMarkerInFiles', async () => {
            problemManager.showMarkerInFiles([DiagnosticSeverity.Error, DiagnosticSeverity.Warning]);
        }),
        commands.registerCommand('findsuite.nextErrorInFiles', async () => {
            problemManager.gotoNextMarkerInFiles([DiagnosticSeverity.Error], "next");
        }),
        commands.registerCommand('findsuite.prevErrorInFiles', async () => {
            problemManager.gotoNextMarkerInFiles([DiagnosticSeverity.Error], "prev");
        }),
        commands.registerCommand('findsuite.nextError', async () => {
            problemManager.gotoMarkerInFile([DiagnosticSeverity.Error], "next");
        }),
        commands.registerCommand('findsuite.prevError', async () => {
            problemManager.gotoMarkerInFile([DiagnosticSeverity.Error], "prev");
        }),
    );
}
