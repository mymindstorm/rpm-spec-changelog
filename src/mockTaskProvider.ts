import { TaskDefinition, TaskProvider, Task, workspace, ShellExecution, OutputChannel, TaskScope } from 'vscode';
import { getNameAndVersion, getSpecFile, logs as logging } from './extension';

let logs: OutputChannel;

interface mockBuildTaskDefinition extends TaskDefinition {
  name: string;
  type: string;
  download: boolean;
}

export class mockBuildTaskProvider implements TaskProvider {
  public static mockBuildScriptType = 'rpm';

  private tasks: Task[] = [];
  private profils: string[] = [];
  private localMockFile?: string;
  private specFile?: string;
  private nameversion?: string;

  constructor(private workspaceRoot?: string) {
    logs = logging;
    if (workspace.getConfiguration().get('rpmspecChangelog.logDebug')) {
      logs.appendLine("[mockBuildTaskProvider.constructor] Build mockTaskProvider");
    }
    logs.show(true);
  }

  public async provideTasks(): Promise<Task[]> {
    this.localMockFile = workspace.getConfiguration().get('mock.mockFile', '');
    this.specFile = await getSpecFile() as string;
    this.nameversion = await getNameAndVersion(this.specFile) as string;
    let profils = workspace.getConfiguration().get("mock.profils") as string[];

    if (this.tasks.length > 0 && JSON.stringify(profils) == JSON.stringify(this.profils)) { return this.tasks; }

    let tasks = this.getTasks();

    this.getSourceBuildTask().then((e) => this.tasks.push(e));

    if (workspace.getConfiguration().get('rpmspecChangelog.logDebug')) {
      logs.appendLine("[mockBuildTaskProvider.provideTasks] tasks: " + this.tasks.map((t) => t.name.replace('Mock: ', '')).join(" "));
    }

    return tasks;
  }

  public resolveTask(_task: Task): Task | undefined {
    const name: string = _task.definition.name;
    return this.tasks.find((v) => v.name === name);
  }

  public static getTaskDisplayName(profil: string): string {
    return `Mock: ${profil}`;
  }

  public static createDefinition(os: string): mockBuildTaskDefinition {
    return {
      type: mockBuildTaskProvider.mockBuildScriptType,
      download: false,
      name: os
    };
  }

  private getTasks(): Task[] {
    let tasks = [];
    let profils: string[] = workspace.getConfiguration().get("mock.profils") as string[];

    for (let i = 0; i < profils.length; i++) {
      const definition = mockBuildTaskProvider.createDefinition(profils[i]);
      let task: Task = this.getMockTask(definition) as Task;
      tasks.push(task);

      if (workspace.getConfiguration().get('rpmspecChangelog.logDebug')) {
        logs.appendLine("[mockBuildTaskProvider.getTasks] add task " + profils[i]);
      }
    }

    this.profils = profils;
    this.tasks = tasks;

    return tasks;
  }

  private getMockTask(definition: mockBuildTaskDefinition): Task | undefined {
    const config = definition.name;
    const cmd = this.getTaskCmd(config);

    const termExec = new ShellExecution(cmd);
    return new Task(definition, TaskScope.Workspace, mockBuildTaskProvider.getTaskDisplayName(definition.name),
      mockBuildTaskProvider.mockBuildScriptType, termExec);
  }

  private getTaskCmd(config: string): string {
    let specfile;
    let cmd: string = '';
    let sources = "~/rpmbuild/SOURCES";
    let tmpMockfile: string = config;
    let tmpSpecfile: string = config;

    if (this.localMockFile !== '') {
      if (!this.localMockFile?.startsWith('/')) {
        this.localMockFile = `${this.workspaceRoot}/${this.localMockFile}`;
      }

      tmpMockfile = './tmpcfg-' + config + '.cfg';
      cmd += `cat $(mock -q -r ${config} --debug-config-expanded|awk '/config_file/ {print $3}'|tr -d "'") > ${tmpMockfile};`;
      cmd += `cat ${this.localMockFile} >> ${tmpMockfile};`;
      specfile = this.specFile;
    } else {
      tmpSpecfile = './tmpcfg-' + config + '.spec';
      cmd += `rpmautospec process-distgit ${this.specFile} ${tmpSpecfile};`;
      specfile = tmpSpecfile;
    }

    if (specfile && !specfile!.startsWith('/')) {
      if (specfile!.startsWith('./')) {
        specfile.replace('^\./', '');
      }
      specfile = `${this.workspaceRoot}/specfile`;
    }

    cmd += `mock -r ${tmpMockfile} --spec ${specfile} --sources ${sources} -D 'disable_source_fetch %nil';`;

    if (this.localMockFile !== '') {
      cmd += `rm -f  ${tmpMockfile};`;
    } else {
      cmd += `rm -f  ${tmpSpecfile};`;
    }

    if (workspace.getConfiguration().get('rpmspecChangelog.logDebug')) {
      logs.appendLine("[mockBuildTaskProvider.getTasksCmd] task cmd: " + cmd);
    }

    return cmd;
  }

  private async getSourceBuildTask(): Promise<Task> {
    if (workspace.getConfiguration().get('rpmspecChangelog.logDebug')) {
      logs.appendLine("[mockBuildTaskProvider.getSourceBuildTask] Add Task: Create archive");
    }

    this.specFile = await getSpecFile() as string;
    this.nameversion = await getNameAndVersion(this.specFile) as string;

    const definition: mockBuildTaskDefinition = {
      name: "Create archive",
      download: false,
      type: mockBuildTaskProvider.mockBuildScriptType
    };

    let cmd: string = '';
    cmd += `tar -zcf ~/rpmbuild/SOURCES/${this.nameversion}.tar.gz --transform='s/^./${this.nameversion}/' --exclude-vcs --exclude .vscode --exclude-vcs-ignores -C ${this.workspaceRoot} .;`;

    const termExec = new ShellExecution(cmd);
    const r = new Task(definition, TaskScope.Workspace, mockBuildTaskProvider.getTaskDisplayName(definition.name), mockBuildTaskProvider.mockBuildScriptType,
      termExec);

    return r;
  }
}
