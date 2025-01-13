import { commands } from "vscode";
import { mockBuildTaskProvider } from "./mockTaskProvider";

export const doCreateArchive = function () {
    commands.executeCommand("workbench.action.tasks.runTask", `${mockBuildTaskProvider.mockBuildScriptType}: Mock: Create archive`);

}