import * as vscode from 'vscode';

interface mockBuildTaskDefinition extends vscode.TaskDefinition {

}

export class mockBuildTaskProvider implements vscode.TaskProvider {
  static mockBuildScriptType = 'rpmbuild';
  private tasks?: vscode.Task[];

  // We use a CustomExecution task when state needs to be shared across runs of the task or when
  // the task requires use of some VS Code API to run.
  // If you don't need to share state between runs and if you don't need to execute VS Code API in your task,
  // then a simple ShellExecution or ProcessExecution should be enough.
  // Since our build has this shared state, the CustomExecution is used below.
  private sharedState: string | undefined;

  private definition = {
    type: mockBuildTaskProvider.mockBuildScriptType
  };

  constructor(private workspaceRoot: string) { }

  public async provideTasks(): Promise<vscode.Task[]> {
    return this.getTasks();
  }

  public resolveTask(_task: vscode.Task): vscode.Task | undefined {
    return _task;
  }

  private getTasks(): vscode.Task[] {
    this.tasks = [];

    let base = 40;
    for (let i = 0; i < 3; i++) {
      const task = this.getTask((base + i) + "");
      console.log(base + i);
      if (task instanceof vscode.Task) {
        this.tasks!.push(task);
      }
    }

    return this.tasks;
  }

  private getTask(fversion: string): vscode.Task|undefined {
    if (!vscode.window.activeTextEditor?.document.fileName.endsWith(".spec")) {
      return undefined;
    }
    const termExec = new vscode.ShellExecution(`echo "vers: ${fversion}"; mock -r fedora-${fversion}-x86_64 --spec ` + '${file}' + ` --sources ~/rpmbuild/SOURCES '-D disable_source_fetch %nil'`);
    return new vscode.Task(this.definition, vscode.TaskScope.Workspace, `run mock fedora ${fversion}`,
      mockBuildTaskProvider.mockBuildScriptType, termExec);
  }
}
;
