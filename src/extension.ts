import { commands, workspace, ExtensionContext, window, OutputChannel, tasks, Disposable, Uri } from 'vscode';
import { mockBuildTaskProvider } from './mockTaskProvider';
import { insertChangelog } from "./insertChangelog";
import { doQuickInput } from './quickInput';
import { exec } from 'child_process';
import { doCreateArchive } from './createArchive';

let mockTaskProvider: Disposable | undefined;
let insertChangelogCommand: Disposable | undefined;
let runMockCommand: Disposable | undefined;
let doCreateArchiveCommand: Disposable | undefined;

export let logs: OutputChannel = window.createOutputChannel("RPMSpec Snippets", { log: true });

logs.appendLine("RPMSpec loaded");
logs.show(true);

export async function getSpecFile() {
  let specfile: string = "";
  let spc = workspace.getConfiguration().get('mock.specFile', false);
  if (spc === false) {
    if (window.activeTextEditor!.document?.fileName.endsWith('.spec')) {
      specfile = window.activeTextEditor!.document!.fileName
      workspace.getConfiguration().update('mock.specFile', specfile);
      return specfile;
    }

    let specfiles: Uri[] | undefined = await workspace.findFiles('*.spec').then((uri) => { if (uri.length > 0) { return uri; } });
    if (!specfiles || specfiles.length < 1) {
      return;
    }
    else if (specfiles.length > 1) {
      let quickPick = window.createQuickPick();
      quickPick.items = specfiles.map((label) => ({ label: label.path }));
      quickPick.onDidChangeSelection(async (e) => {
        specfile = e[0].label
        workspace.getConfiguration().update('mock.specFile', specfile);
        quickPick.hide();
      });
      quickPick.show();
    }
    else if (specfiles.length === 1) {
      specfile = specfiles[0].path
      workspace.getConfiguration().update('mock.specFile', specfile);
    }
  }
  else {
    specfile = workspace.getConfiguration().get('mock.specFile') as string;
  }
  return specfile;
}

export async function getNameAndVersion(specfile?: string) {
  let workspaceRoot = (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0))
    ? workspace.workspaceFolders[0].uri.fsPath : undefined;
  specfile = await getSpecFile() as string;
  let sourcename = await new Promise(resolve => exec(`rpmspec -P "${workspaceRoot}/${specfile}" | awk '/^Version/ { ver=$2; } /^Name/ { name=$2; } END { printf("%s-%s", name, ver); }'`, (err, stdout) => {
    let r = resolve(stdout.trim());
  }));
  
  return sourcename;
}

export async function activate(context: ExtensionContext) {
  let workspaceRoot = (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0))
    ? workspace.workspaceFolders[0].uri.fsPath : undefined;

  if (!workspaceRoot) {
    return;
  }

  logs.appendLine("Extension activation ...");

  mockTaskProvider = tasks.registerTaskProvider(mockBuildTaskProvider.mockBuildScriptType, new mockBuildTaskProvider(workspaceRoot));
  context.subscriptions.push(mockTaskProvider);
  logs.appendLine("mockTaskProvider added ...");

  // mockFile = await workspace.findFiles(mockFile);
  doCreateArchiveCommand = commands.registerCommand('rpmspecChangelog.createArchive', doCreateArchive, context);
  context.subscriptions.push(doCreateArchiveCommand);
  logs.appendLine("runMockCommand added ...");

  runMockCommand = commands.registerCommand('rpmspecChangelog.runMock', doQuickInput, context);
  context.subscriptions.push(runMockCommand);
  logs.appendLine("runMockCommand added ...");

  insertChangelogCommand = commands.registerTextEditorCommand("rpmspecChangelog.insertRPMSpecChangelog", insertChangelog);
  context.subscriptions.push(insertChangelogCommand);
  logs.appendLine("insertChangelogCommand added ...");
}

export function deactivate(): void {
  if (runMockCommand) { runMockCommand.dispose(); }
  if (doCreateArchiveCommand) { doCreateArchiveCommand.dispose(); }
  if (insertChangelogCommand) { insertChangelogCommand.dispose(); }
  if (mockTaskProvider) { mockTaskProvider.dispose(); }
}


