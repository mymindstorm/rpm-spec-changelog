import { commands, OutputChannel, workspace, window } from 'vscode';

const logs: OutputChannel = window.createOutputChannel("QuickInput", { log: true });
const settings = workspace.getConfiguration('rpmspecChangelog');

export default function quickInput() {
  let oses: string[] = settings.get("mockOses") ?? [];

  const quickPick = window.createQuickPick();

  quickPick.items = oses.map(label => ({ label }));

  quickPick.onDidChangeSelection(selection => {
    console.log(selection);
    if (selection[0]) {
      runMock(selection[0].label)
        .then(() => quickPick.hide())
        .catch(console.error);
    }
    window.showInformationMessage(`Got: ${selection[0].label}`);
  });

  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

function getTaskCmd(config: string, specfile?: string): string {
  // let sources = workspace.getWorkspaceFolder(window.activeTextEditor?.document.uri)
  let sources = "~/rpmbuild/SOURCES"
  let cmd: string = `cat $(mock -r ${config} --debug-config-expanded|awk '/config_file/ {print $3}'|tr -d "'") > tmp.cfg;`

  try {
    const mockcfg = workspace.findFiles('mock.cfg').then((uri) => { console.log('uri', uri) })

    cmd += `cat mock.cfg >> tmp.cfg;`
    if (settings.get('debug')) { logs.appendLine("mock.cfg found !!") }
  } catch (e) {
    if (settings.get('debug')) { logs.appendLine("mock.cfg NOT found !!") }
  }

  const spec = specfile ? "--spec ${specfile}" : "";
  cmd += `echo "vers: ${config}"; mock -r tmp.cfg ${spec} --sources ${sources} -D 'disable_source_fetch %nil';rm -f tmp.cfg;`

  return cmd

}


async function runMock(selection: string) {
  commands.executeCommand("workbench.action.tasks.runTask", `rpmbuild: Mock: ${selection}`);
}
