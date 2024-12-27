import * as vscode from 'vscode';


interface mockBuildTaskDefinition extends vscode.TaskDefinition {

}
const logs: vscode.OutputChannel = vscode.window.createOutputChannel("Mock");

export class mockBuildTaskProvider implements vscode.TaskProvider {
  static mockBuildScriptType = 'rpmbuild';
  private tasks: vscode.Task[] = [];

  private definition = {
    type: mockBuildTaskProvider.mockBuildScriptType
  };

  constructor(private workspaceRoot: string) {
    logs.appendLine("Oneline")
    logs.show(true);
  }

  public async provideTasks(): Promise<vscode.Task[]> {
    return this.getTasks();
  }

  public resolveTask(_task: vscode.Task): vscode.Task | undefined {
    return _task;
  }

  private getTasks(): vscode.Task[] {
    const settings = vscode.workspace.getConfiguration('rpmspecChangelog');

    this.tasks = [];

    let oses: string[] = settings.get("mockOses") ?? [];
    console.log("oses", oses);
    if (oses!.length > 0) {
      let cmd = "";
      for (let i = 0; i < oses.length; i++) {
        let os = oses[i];
        let task: vscode.Task = this.getTask(os + "") as vscode.Task;
        this.tasks!.push(task);
        cmd += `mock -r ${os} --spec ` + '${file}' + ` --sources ~/rpmbuild/SOURCES '-D disable_source_fetch %nil';`
      }
      const termExec = new vscode.ShellExecution(cmd);
      const allTask = new vscode.Task(this.definition, vscode.TaskScope.Workspace, `run mock: all`,
        mockBuildTaskProvider.mockBuildScriptType, termExec);
      this.tasks!.push(allTask);
    } else {
      let base = 40;
      for (let i = 0; i < 3; i++) {
        let task = this.getTask("fedora-" + (base + i) + "-x86_64");
        console.log("fedora-" + (base + i) + "-x86_64");
        if (task instanceof vscode.Task) {
          this.tasks!.push(task);
        }
      }
    }

    return this.tasks;
  }

  private getTask(os: string): vscode.Task | undefined {
    logs.appendLine("OS: " + os);
    if (!vscode.window.activeTextEditor?.document.fileName.endsWith(".spec")) {
      return undefined;
    }
    const termExec = new vscode.ShellExecution(`echo "vers: ${os}"; mock -r ${os} --spec ` + '${file}' + ` --sources ~/rpmbuild/SOURCES '-D disable_source_fetch %nil'`);
    return new vscode.Task(this.definition, vscode.TaskScope.Workspace, `run mock: ${os}`,
      mockBuildTaskProvider.mockBuildScriptType, termExec);
  }
}
;
