import { DiagnosticSeverity, ExtensionContext, commands } from "vscode";
import { ProblemNavigator } from "../svc/problem";

export function registerProblem(context: ExtensionContext) {
    const problemNavigator = new ProblemNavigator();
    context.subscriptions.push(
        commands.registerCommand('findsuite.showMarkerInFiles', async () => {
            problemNavigator.showMarkerInFiles([DiagnosticSeverity.Error]);
        }),
        commands.registerCommand('findsuite.nextErrorInFiles', async () => {
            problemNavigator.gotoNextMarkerInFiles([DiagnosticSeverity.Error], "next");
        }),
        commands.registerCommand('findsuite.prevErrorInFiles', async () => {
            problemNavigator.gotoNextMarkerInFiles([DiagnosticSeverity.Error], "prev");
        }),
        commands.registerCommand('findsuite.nextError', async () => {
            problemNavigator.gotoMarkerInFile([DiagnosticSeverity.Error], "next");
        }),
        commands.registerCommand('findsuite.prevError', async () => {
            problemNavigator.gotoMarkerInFile([DiagnosticSeverity.Error], "prev");
        }),
    );
}