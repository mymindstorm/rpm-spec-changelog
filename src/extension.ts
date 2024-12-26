import * as vscode from 'vscode';
import { exec } from "child_process";
import { mockBuildTaskProvider } from './mockTaskProvider';

let logs = vscode.window.createOutputChannel("logs");
let mockTaskProvider: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
  const settings = vscode.workspace.getConfiguration('rpmspecChangelog');
  const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
    ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
  if (!workspaceRoot) {
    logs.appendLine("No workspace");
    logs.show(true);
    return;
  }

  mockTaskProvider = vscode.tasks.registerTaskProvider(mockBuildTaskProvider.mockBuildScriptType, new mockBuildTaskProvider(workspaceRoot));

  context.subscriptions.push(mockTaskProvider);

  let disposable = vscode.commands.registerTextEditorCommand(
    "extension.insertRPMSpecChangelog",
    async () => {
      const currentDocument = vscode.window.activeTextEditor;

      if (!currentDocument) {
        return;
      }
      const date = new Date(Date.now());
      // Results below assume UTC timezone - your results may vary

      const options: { [key: string]: any; } = {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      };

      // Specify default date formatting for language (locale)
      const parts = new Intl.DateTimeFormat('en-us', options).formatToParts(date);
      const curdate = parts.filter((v) => { if (v.type !== 'literal') { return v.value; } }).map((v) => v.value).join(' ');

      logs.appendLine(curdate);

      const snippet = new vscode.SnippetString("* " + curdate);

      var email: string | undefined, name: string | undefined;

      if (!settings.get('maintainerName')) {
        name = await new Promise(resolve => exec("/usr/bin/git config user.name", (_error, stdout: string) => {
          logs.appendLine(_error?.message as string);
          logs.appendLine(stdout);
          resolve(stdout.trim());
        }));
      }
      else {
        name = settings.get('maintainerName');
      }

      if (!settings.get('maintainerEmail')) {
        email = await new Promise(resolve => exec("/usr/bin/git config user.email", (_error, stdout: string) => {
          logs.appendLine(stdout);
          resolve(stdout.trim());
        }));
      }
      else {
        email = settings.get('maintainerEmail');
      }

      logs.appendLine(name as string);
      logs.appendLine(email as string);
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
      currentDocument.insertSnippet(snippet);
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  if (mockTaskProvider) {
    mockTaskProvider.dispose();
  }
}
