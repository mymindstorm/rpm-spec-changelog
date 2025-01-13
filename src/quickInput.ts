import { commands, window, InputBox, QuickPick, QuickPickItem, workspace } from 'vscode';
import { mockBuildTaskProvider } from './mockTaskProvider';
import { logs } from './extension';

let quickPick: QuickPick<QuickPickItem>;
let quickInput: InputBox;

export function doQuickInput() {
  quickPick = window.createQuickPick();
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.onDidAccept(() => {
    const items = quickPick.selectedItems;
    console.log('Items:', items);
    quickPick.hide();
    for (let i = 0; i < items.length; i++) {
      runMock(items[i].label)
        .catch(console.error);
    }
    // window.showInformationMessage('Accepted');
  });
  
  quickInput = window.createInputBox();
  quickInput.prompt = "prompt";
  quickInput.title = "title";
  quickInput.placeholder = "placeHolder";
  // quickInput.onDidHide(() => quickInput.dispose());
  quickInput.onDidAccept(async () => {
    const value = quickInput.value;
    quickInput.hide();
    console.log('value: ', value)
  });
  const oses: string[] = workspace.getConfiguration().get("mock.profils") ?? [];

  if (workspace.getConfiguration().get('mock.canSelectMany', false) === false) {
    if (workspace.getConfiguration().get('mock.showAllProfils', false)) {
      oses.push('Build all profils');
    }
  }
  oses.push('Other...');

  quickPick.items = oses.map(label => ({ label }));
  quickPick.canSelectMany = workspace.getConfiguration().get('mock.canSelectMany', false)

  if (workspace.getConfiguration().get('mock.canSelectMany', false) === false) {
    // quickPick.onDidChangeSelection((selection: any) => {
    //   window.showInformationMessage(selection[0].label)
    //   if (selection[0]) {
    //     quickPick.hide();
    //     runMock(selection[0].label)
    //       .catch(console.error);
    //   }
    // });
  }
  quickPick.show();
}

async function runMock(selection: string) {
  if (selection === 'Other...') {
    logs.appendLine('Show input');
    quickInput.show();
  }
  else if (selection === 'Build all profils') {

    logs.appendLine('Running for all profils');
    const oses: string[] = workspace.getConfiguration().get("mock.profils") ?? [];

    for (let i = 0; i < oses.length; i++) {
      const taskName = mockBuildTaskProvider.getTaskDisplayName(oses[i])
      commands.executeCommand("workbench.action.tasks.runTask", `${mockBuildTaskProvider.mockBuildScriptType}: ${taskName}`);
    }
  } else {
    logs.appendLine('Running for profil ' + selection);
    const taskName = mockBuildTaskProvider.getTaskDisplayName(selection)
    commands.executeCommand("workbench.action.tasks.runTask", `${mockBuildTaskProvider.mockBuildScriptType}: ${taskName}`);
  }
}
