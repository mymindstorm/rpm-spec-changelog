import * as vscode from 'vscode';

const logs: vscode.OutputChannel = vscode.window.createOutputChannel("Mock", { log: true });

interface mockBuildTaskDefinition extends vscode.TaskDefinition {
  name: string;
  type: string;
  download: boolean;
}

export class mockBuildTaskProvider implements vscode.TaskProvider {
  static mockBuildScriptType = 'rpmbuild';
  private tasks: vscode.Task[] = [];
  private settings: vscode.WorkspaceConfiguration;

  constructor(private workspaceRoot: string) {
    this.settings = vscode.workspace.getConfiguration('rpmspecChangelog');
  }

  public async provideTasks(): Promise<vscode.Task[]> {
    return this.getTasks();
  }

  public resolveTask(_task: vscode.Task): vscode.Task | undefined {
    const name: string = _task.definition.name;
    if (name) {
      const definition: mockBuildTaskDefinition = <any>_task.definition;
      return this.getTask(definition);
    }

    return undefined;
  }

  // private getDefaultDefinition() {
  //   return {
  //     type: mockBuildTaskProvider.mockBuildScriptType,
  //     download: false,
  //     name: null
  //   };
  // }

  public static createDefinition(os: string) {
    return {
      type: mockBuildTaskProvider.mockBuildScriptType,
      download: false,
      name: os
    };
  }

  private getTasks(): vscode.Task[] {
    const settings = this.settings;

    this.tasks = [];

    let oses: string[] = settings.get("mockOses") ?? [];
    if (this.settings.get('debug')) {
      logs.appendLine("oses: " + oses.join(' '));
    }

    let definition: mockBuildTaskDefinition;
    if (oses!.length > 0) {
      let cmd = "";
      for (let i = 0; i < oses.length; i++) {
        let os = oses[i];
        // let parts = os.split('-');
        const definition = mockBuildTaskProvider.createDefinition(os);
        let task: vscode.Task = this.getTask(definition) as vscode.Task;
        this.tasks!.push(task);

        if (settings.get('showAll')) {
          cmd += this.getTaskCmd(definition.name);
        }
      }

      if (settings.get('showAll')) {
        const termExec = new vscode.ShellExecution(cmd);
        const definition = mockBuildTaskProvider.createDefinition("all");
        const allTask = new vscode.Task(definition,
          vscode.TaskScope.Workspace,
          `run mock: all`,
          mockBuildTaskProvider.mockBuildScriptType,
          termExec);
        this.tasks!.push(allTask);
      }
    } else {
      let base = 41;
      definition = {
        type: mockBuildTaskProvider.mockBuildScriptType,
        name: "fedora" + base + "x86_64",
        download: false
      };
      let task = this.getTask(definition);
      if (task instanceof vscode.Task) {
        this.tasks!.push(task);
      }
    }

    return this.tasks;
  }

  private getTask(definition: mockBuildTaskDefinition): vscode.Task | undefined {
    if (!vscode.window.activeTextEditor?.document.fileName.endsWith(".spec")) {
      return undefined;
    }

    const config = definition.name
    const cmd = this.getTaskCmd(config)

    if (this.settings.get('debug')) {
      logs.appendLine("CMD: " + cmd);
      logs.appendLine("OS: " + definition.os);
    }

    const termExec = new vscode.ShellExecution(cmd);
    return new vscode.Task(definition, vscode.TaskScope.Workspace, `Mock: ${config}`,
      mockBuildTaskProvider.mockBuildScriptType, termExec);
  }

  private getTaskCmd(config: string): string {
    // let sources = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor?.document.uri)
    let sources = "~/rpmbuild/SOURCES"
    let cmd: string = `cat $(mock -r ${config} --debug-config-expanded|awk '/config_file/ {print $3}'|tr -d "'") > tmp.cfg;`

    try {
      const mockcfg = vscode.workspace.findFiles('mock.cfg').then((uri) => { console.log('uri', uri) })

      cmd += `cat mock.cfg >> tmp.cfg;`
      if (this.settings.get('debug')) { logs.appendLine("mock.cfg found !!") }
    } catch (e) {
      if (this.settings.get('debug')) { logs.appendLine("mock.cfg NOT found !!") }
    }

    cmd += `echo "vers: ${config}"; mock -r tmp.cfg --spec ` + '${file}' + ` --sources ${sources} -D 'disable_source_fetch %nil';rm -f tmp.cfg;`

    return cmd

  }
}
