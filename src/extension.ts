import * as vscode from 'vscode';
import { exec } from "child_process";
import { mockBuildTaskProvider } from './mockTaskProvider';

let mockTaskProvider: vscode.Disposable | undefined;
let settings: vscode.WorkspaceConfiguration;
const logs: vscode.OutputChannel = vscode.window.createOutputChannel("Mock");

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
    ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

  if (!workspaceRoot) {
    return;
  }

  settings = vscode.workspace.getConfiguration('rpmspecChangelog');
  mockTaskProvider = vscode.tasks.registerTaskProvider(mockBuildTaskProvider.mockBuildScriptType, new mockBuildTaskProvider(workspaceRoot));
  context.subscriptions.push(mockTaskProvider);

  let disposable = vscode.commands.registerTextEditorCommand(
    "extension.insertRPMSpecChangelog",
    async () => {
      if (!vscode.window.activeTextEditor?.document.fileName.endsWith(".spec")) {
        return undefined;
      }
      const currentDocument = vscode.window.activeTextEditor;

      if (!currentDocument) {
        return;
      }

      const date = new Date(Date.now());
      const options: { [key: string]: any; } = {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      };

      // For US date format
      const parts = new Intl.DateTimeFormat('en-us', options).formatToParts(date);
      const curdate = parts.filter((v) => { if (v.type !== 'literal') { return v.value; } }).map((v) => v.value).join(' ');

      logs.appendLine("Date: " + curdate);
      logs.show(true);

      const snippet = new vscode.SnippetString("* " + curdate);

      var email: string | undefined, name: string | undefined;

      if (!settings.get('maintainerName')) {
        name = await new Promise(resolve => exec("/usr/bin/git config user.name", (_error, stdout: string) => {
          logs.appendLine("Error: " + _error?.message as string);
          logs.appendLine("Out: " + stdout);
          logs.show(true);

          resolve(stdout.trim());
        }));
      }
      else {
        name = settings.get('maintainerName');
      }

      if (!settings.get('maintainerEmail')) {
        email = await new Promise(resolve => exec("/usr/bin/git config user.email", (_error, stdout: string) => {
          logs.appendLine(stdout);
          logs.show(true);
          resolve(stdout.trim());
        }));
      }
      else {
        email = settings.get('maintainerEmail');
      }

      logs.appendLine(name as string);
      logs.appendLine(email as string);
      logs.show(true);
      snippet.appendText(` ${name} <${email}>`);

      const fullversion = await new Promise(resolve => exec(`rpmspec -P ${currentDocument.document.fileName} | awk '/^Version/ { ver=$2; } /^Release/ { gsub(/\.[a-z]+[0-9]+$/, "", $2); rel=$2; } END { printf("%s-%s", ver, rel); }'`, (error, stdout) => {
        resolve(stdout.trim());
      }));

      if (fullversion) {
        snippet.appendText(` - ${fullversion}`);
      }

      snippet.appendText("\n- ");
      snippet.appendTabstop();
      snippet.appendText("\n\n");

      const pos = currentDocument.document.getText().indexOf('%changelog');
      const position = currentDocument.document.positionAt(pos + '%changelog'.length + 1);
      currentDocument.insertSnippet(snippet, position);
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  if (mockTaskProvider) {
    mockTaskProvider.dispose();
  }
}
