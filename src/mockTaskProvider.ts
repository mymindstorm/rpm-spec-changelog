import * as vscode from 'vscode';

const logs: vscode.OutputChannel = vscode.window.createOutputChannel("Mock", {log: true});

interface mockBuildTaskDefinition extends vscode.TaskDefinition {
  os: string;
  arch?: string;
  version: number;
  type: string;
  download: boolean;
}

export class mockBuildTaskProvider implements vscode.TaskProvider {
  static mockBuildScriptType = 'rpmbuild';
  private tasks: vscode.Task[] = [];

  constructor(private workspaceRoot: string) {
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
    logs.appendLine("oses: " + oses.join('\n'));
    let definition: mockBuildTaskDefinition;
    if (oses!.length > 0) {
      let cmd = "";
      for (let i = 0; i < oses.length; i++) {
        let os = oses[i];
        let parts = os.split('-');
        definition = {
          type: mockBuildTaskProvider.mockBuildScriptType,
          download: false,
          os: parts[0],
          arch: parts[2],
          version: parseInt(parts[1])
        };
        let task: vscode.Task = this.getTask(definition) as vscode.Task;
        this.tasks!.push(task);
        cmd += `mock -r ${os} --spec ` + '${file}' + ` --sources ~/rpmbuild/SOURCES '-D disable_source_fetch %nil';`;
      }
      const termExec = new vscode.ShellExecution(cmd);
      definition = {
        type: mockBuildTaskProvider.mockBuildScriptType,
        download: false,
        os: "all",
        arch: "",
        version: 0
      };
      const allTask = new vscode.Task(definition, vscode.TaskScope.Workspace, `run mock: all`,
        mockBuildTaskProvider.mockBuildScriptType, termExec);
      this.tasks!.push(allTask);
    } else {
      let base = 40;
      for (let i = 0; i < 3; i++) {
        definition = {
          type: mockBuildTaskProvider.mockBuildScriptType,
          os: "fedora",
          arch: "x86_64",
          version: base + i,
          download: false
        };
        let task = this.getTask(definition);
        if (task instanceof vscode.Task) {
          this.tasks!.push(task);
        }
      }
    }

    return this.tasks;
  }

  private getTask(definition: mockBuildTaskDefinition): vscode.Task | undefined {
    if (!vscode.window.activeTextEditor?.document.fileName.endsWith(".spec")) {
      return undefined;
    }
    const config = definition.os + "-" + definition.version + "-" + definition.arch;
    logs.appendLine("OS: " + definition.os);

    const termExec = new vscode.ShellExecution(`echo "vers: ${config}"; mock -r ${config} --spec ` + '${file}' + ` --sources ~/rpmbuild/SOURCES '-D disable_source_fetch %nil'`);
    return new vscode.Task(definition, vscode.TaskScope.Workspace, `run mock: ${config}`,
      mockBuildTaskProvider.mockBuildScriptType, termExec);
  }
}
