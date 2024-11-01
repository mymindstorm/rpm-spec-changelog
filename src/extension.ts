import { exec } from "child_process";
import { ExtensionContext, workspace, commands, window, SnippetString } from "vscode";

export function activate(context: ExtensionContext) {
  const settings = workspace.getConfiguration('rpmspecChangelog');

  let disposable = commands.registerTextEditorCommand(
    "extension.insertRPMSpecChangelog",
    async () => {
      const currentDocument = window.activeTextEditor;

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

      const snippet = new SnippetString("* " + curdate);

      if (settings.get('rpmspecChangelog.obtainNameAndEmailFromGit')) {
        const name = await new Promise(resolve => exec("git config user.name", (_error, stdout: string) => {
          resolve(stdout.trim());
        }));

        const email = await new Promise(resolve => exec("git config user.email", (_error, stdout: string) => {
          resolve(stdout.trim());
        }));
        if (name || email) {
          snippet.appendText(` ${name} <${email}>`);
        }
      }
      else {
        const name = settings.get('rpmspecChangelog.maintainerName');
        const email = settings.get('rpmspecChangelog.maintainerEmail');

        if (name || email) {
          snippet.appendText(` ${name} <${email}>`);
        }

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
