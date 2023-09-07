import * as vscode from "vscode";
import { exec } from "child_process";

export function activate(context: vscode.ExtensionContext) {
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

      const snippet = new vscode.SnippetString("* " + curdate);

      const name = await new Promise(resolve => exec("git config user.name", (_error, stdout: string) => {
        resolve(stdout.trim());
      }));

      const email = await new Promise(resolve => exec("git config user.email", (_error, stdout: string) => {
        resolve(stdout.trim());
      }));

      if (name || email) {
        snippet.appendText(` ${name} <${email}>`);
      }

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
