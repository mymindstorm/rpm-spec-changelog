import * as vscode from 'vscode';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.insertChangelog', async () => {
		const currentDocument = vscode.window.activeTextEditor;
		
		if (!currentDocument) {
			return;
		}
		
		const snippet = new vscode.SnippetString("* ${CURRENT_DAY_NAME_SHORT} ${CURRENT_MONTH_NAME_SHORT} ${CURRENT_DATE} ${CURRENT_YEAR}");
		
		const name = await new Promise(resolve => {
			cp.exec("git config user.name", (error, stdout, stderr) => {
				resolve(stdout.trim());
			});
		})
		const email = await new Promise(resolve => {
			cp.exec("git config user.email", (error, stdout, stderr) => {
				resolve(stdout.trim());
			});
		})

		if (name || email) {
			snippet.appendText(` ${name} <${email}>`);
		}

		const text = currentDocument.document.getText();
		const version = text.match(/Version:(.*)/);
		const release = text.match(/Release:(.*)/);

		if (version && version[1] && release && release[1]) {
			snippet.appendText(` - ${version[1].trim()}-${release[1].trim()}`);
		}

		currentDocument.insertSnippet(snippet);
	});

	context.subscriptions.push(disposable);
}
