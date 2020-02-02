import * as vscode from "vscode";
import * as cp from "child_process";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.insertChangelog",
    async () => {
      const currentDocument = vscode.window.activeTextEditor;

      if (!currentDocument) {
        return;
      }

      const snippet = new vscode.SnippetString(
        "* ${CURRENT_DAY_NAME_SHORT} ${CURRENT_MONTH_NAME_SHORT} ${CURRENT_DATE} ${CURRENT_YEAR}"
      );

      const name = await new Promise(resolve => {
        cp.exec("git config user.name", (error, stdout, stderr) => {
          resolve(stdout.trim());
        });
      });
      const email = await new Promise(resolve => {
        cp.exec("git config user.email", (error, stdout, stderr) => {
          resolve(stdout.trim());
        });
      });

      if (name || email) {
        snippet.appendText(` ${name} <${email}>`);
      }

      const text = currentDocument.document.getText();
      const foundVersion = text.match(/Version:(.*)/);
      const foundRelease = text.match(/Release:(.*)/);

      if (foundVersion && foundRelease) {
        const macroRegex = /%{[^}]+}/g;
        let version = foundVersion[1].trim();
        let release = foundRelease[1].trim();

        // If macros are found evaluate
        if (version.match(macroRegex) || release.match(macroRegex)) {
          version = await new Promise(resolve => {
            cp.exec(`rpm -E "${version}"`, (error, stdout, stderr) => {
              resolve(stdout.trim());
            });
          });
          release = await new Promise(resolve => {
            cp.exec(`rpm -E ${release}`, (error, stdout, stderr) => {
              resolve(stdout.trim());
            });
          });
        }

        snippet.appendText(` - ${version}-${release}`);
      }

      snippet.appendText("\n- ");
      snippet.appendTabstop();
      snippet.appendText("\n");
      currentDocument.insertSnippet(snippet);
    }
  );

  context.subscriptions.push(disposable);
}
