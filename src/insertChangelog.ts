import { window, SnippetString, workspace } from 'vscode';
import { exec } from "child_process";
import { logs } from './extension';

export const insertChangelog = async () => {
  const curDoc = window.activeTextEditor?.document;

  if (!curDoc || !curDoc.fileName.endsWith(".spec")) {
    return undefined;
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
  const snippet = new SnippetString("* " + curdate);

  let email: string | undefined, name: string | undefined;

  if (!workspace.getConfiguration().get('rpmspecChangelog.maintainerName')) {
    name = await new Promise(resolve => exec("/usr/bin/git config user.name", (_error, stdout: string) => {
      resolve(stdout.trim());
    }));
  }
  else {
    name = workspace.getConfiguration().get('rpmspecChangelog.maintainerName');
  }

  if (!workspace.getConfiguration().get('rpmspecChangelog.maintainerEmail')) {
    email = await new Promise(resolve => exec("/usr/bin/git config user.email", (_error, stdout: string) => {
      resolve(stdout.trim());
    }));
  }
  else {
    email = workspace.getConfiguration().get('rpmspecChangelog.maintainerEmail');
  }

  if (workspace.getConfiguration().get('rpmspecChangelog.logDebug')) {
    logs.appendLine(name as string);
    logs.appendLine(email as string);
  }
  snippet.appendText(` ${name} <${email}>`);

  const fullversion = await new Promise(resolve => exec(`rpmspec -P ${curDoc.fileName} | awk '/^Version/ { ver=$2; } /^Release/ { gsub(/\.[a-z]+[0-9]+$/, "", $2); rel=$2; } END { printf("%s-%s", ver, rel); }'`, (error, stdout) => {
    resolve(stdout.trim());
  }));

  if (fullversion) {
    snippet.appendText(` - ${fullversion}`);
  }

  snippet.appendText("\n- ");
  snippet.appendTabstop();
  snippet.appendText("\n\n");

  const pos = curDoc.getText().indexOf('%changelog');
  if (pos === -1) {
    window.showErrorMessage("No %changelog find");
    return;
  }

  const position = curDoc.positionAt(pos + '%changelog'.length + 1);
  window.activeTextEditor?.insertSnippet(snippet, position);
};
