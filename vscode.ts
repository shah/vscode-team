import * as prj from "./project.ts";
import { fs, path } from "./deps.ts";
import * as shell from "./shell.ts";

export type VsCodeWorkspaceFsPFN = prj.FsPathAndFileName;

export interface VsCodeWorkspaceFolder {
  readonly path: prj.FsPathOnly;
}

export interface VsCodeWorkspaceFolderEnricher {
  (
    wsFileName: prj.FsPathAndFileName,
    folder: VsCodeWorkspaceFolder,
  ): VsCodeWorkspaceFolder;
}

/**
 * Take a Visual Studio Code folder and enrich it as a project home directory.
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to enrich as a project
 */
export function enrichProjectFolder(
  wsFileName: string,
  folder: VsCodeWorkspaceFolder,
): VsCodeWorkspaceFolder & prj.ProjectPath {
  if (prj.isProjectPath(folder)) return folder;
  const projectPath = path.join(
    path.dirname(
      path.isAbsolute(wsFileName)
        ? wsFileName
        : path.join(Deno.cwd(), wsFileName),
    ),
    folder.path,
  );
  const pp = prj.enrichProjectPath({ absProjectPath: projectPath });
  const result: VsCodeWorkspaceFolder & prj.ProjectPath = {
    ...folder,
    ...pp,
  };
  return result;
}

/**
 * Take a Visual Studio Code folder and enrich it as a Deno project if it has
 * deno.enable in .vscode/settings.json or matches our naming convention 
 * (abc.deno.code-workspace).
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to enrich as a Deno project
 */
export function enrichDenoProjectFolder(
  wsFileName: string,
  f: VsCodeWorkspaceFolder,
):
  | VsCodeWorkspaceFolder
  | VsCodeWorkspaceFolder & prj.DenoProjectByVsCodePlugin
  | VsCodeWorkspaceFolder & prj.DenoProjectByConvention {
  const folder = enrichProjectFolder(wsFileName, f);
  const pp = prj.enrichDenoProjectByVsCodePlugin(
    folder,
    folder,
  );
  if (prj.isDenoProject(pp)) {
    const result: VsCodeWorkspaceFolder & prj.DenoProjectByVsCodePlugin = {
      ...folder,
      ...pp,
    };
    return result;
  }

  const denoWsFileNamePattern = /\.deno\.code-workspace$/;
  if (denoWsFileNamePattern.test(wsFileName)) {
    const result: VsCodeWorkspaceFolder & prj.DenoProjectByConvention = {
      ...folder,
      ...prj.forceDenoProject(folder),
      isDenoProjectByConvention: true,
    };
    return result;
  }
  return folder;
}

/**
 * Take a Visual Studio Code folder and enrich it with polyglot detection.
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to detect and enrich
 */
export function enrichVsCodeWorkspaceFolderTypes(
  wsFileName: prj.FsPathAndFileName,
  folder: VsCodeWorkspaceFolder,
): VsCodeWorkspaceFolder {
  const transformers: VsCodeWorkspaceFolderEnricher[] = [
    enrichDenoProjectFolder,
  ];
  let result: VsCodeWorkspaceFolder = enrichProjectFolder(wsFileName, folder);
  for (const tr of transformers) {
    result = tr(wsFileName, result);
  }
  return result;
}

export interface VsCodeWorkspace {
  readonly folders: VsCodeWorkspaceFolder[];
}

export interface VsCodeWorkspaceFolderContext {
  readonly wsFileName: prj.FsPathAndFileName;
  readonly workspace: VsCodeWorkspace;
  readonly folder: VsCodeWorkspaceFolder;
}

export interface VsCodeWorkspaceFolderHandler {
  (ctx: VsCodeWorkspaceFolderContext): Promise<void>;
}

export interface VsCodeWorkspacesContext {
  readonly wsFileNames: VsCodeWorkspaceFsPFN[];
  readonly wsFileDoesNotExistHandler?: (
    ctx: VsCodeWorkspacesContext,
    fileName: VsCodeWorkspaceFsPFN,
  ) => void;
  readonly wsFileParseErrorHandler?: (
    ctx: VsCodeWorkspacesContext,
    fileName: VsCodeWorkspaceFsPFN,
    err: Error,
  ) => VsCodeWorkspace | undefined;
}

export function vsCodeWorkspaceFolders(
  workspacesCtx: VsCodeWorkspacesContext,
  transformFolders: VsCodeWorkspaceFolderEnricher =
    enrichVsCodeWorkspaceFolderTypes,
): VsCodeWorkspaceFolderContext[] {
  const result: VsCodeWorkspaceFolderContext[] = [];
  for (const wsfn of workspacesCtx.wsFileNames) {
    if (!fs.existsSync(wsfn)) {
      if (workspacesCtx.wsFileDoesNotExistHandler) {
        workspacesCtx.wsFileDoesNotExistHandler(workspacesCtx, wsfn);
      }
      continue;
    }
    let workspace: VsCodeWorkspace;
    try {
      workspace = JSON.parse(Deno.readTextFileSync(wsfn)) as VsCodeWorkspace;
      if (!workspace) {
        console.error(`Unable to parse ${wsfn}`);
        continue;
      }
    } catch (err) {
      if (workspacesCtx.wsFileParseErrorHandler) {
        // if we have an error, allow the handler to recover with a replacement
        const replace = workspacesCtx.wsFileParseErrorHandler(
          workspacesCtx,
          wsfn,
          err,
        );
        if (replace) {
          workspace = replace;
        } else {
          console.error(`Unable to parse ${wsfn}:`, err);
          continue;
        }
      } else {
        console.error(`Unable to parse ${wsfn}:`, err);
        continue;
      }
    }
    workspace.folders.forEach((folder) => {
      const folderCtx:
        & VsCodeWorkspacesContext
        & VsCodeWorkspaceFolderContext = {
          ...workspacesCtx,
          wsFileName: wsfn,
          workspace: workspace,
          folder: transformFolders(wsfn, folder),
        };
      result.push(folderCtx);
    });
  }
  return result;
}

// Helper function to take a VS Code *.code-workspace file via STDIN and clone all folders contained in it.
// Git clone credentials for each repo source (e.g. GitHub, GitLab) must already be set.
// The convention is that the .folder[].path values are both the name of the cloned directories as well
// as the source repo's domain so that https://${.folder.path} will be the source repo.
//
// If the following folders are in `sample.code-workspace`:
// {
// 	"folders": [
// 		{ "path": "github.com/shah/uniform-resource" },
// 		{ "path": "github.com/medigy/uniform-resource-classifier-nih-mesh" },
// 		{ "path": "git.netspective.io/netspective-studios/gmail-classify-anchors" }
// 	],
//
// Then the following folders will be created after cloning:
// ❯ tree -d -L 3
// ├── github.com
// │ ├── medigy
// │ │ └── uniform-resource-classifier-nih-mesh
// │ └── shah
// │   └── uniform-resource
// └── git.netspective.io
//   └── netspective-studios
//     └── gmail-classify-anchors

export interface GitReposContext {
  readonly reposHomePath: prj.FsPathOnly;
  readonly reposHomePathDoesNotExistHandler?: (
    ctx: GitReposContext,
  ) => prj.RecoverableErrorHandlerResult;
}

export function isValidGitReposContext(
  ctx: GitReposContext & { readonly verbose: boolean },
): boolean {
  if (!fs.existsSync(ctx.reposHomePath)) {
    if (ctx.reposHomePathDoesNotExistHandler) {
      switch (ctx.reposHomePathDoesNotExistHandler(ctx)) {
        case "recovered":
          return true;
        case "unrecoverrable":
          // the function is responsible for error message
          return false;
      }
    } else {
      if (ctx.verbose) {
        console.error(
          `Repositories home path '${ctx.reposHomePath}' does not exist.`,
        );
      }
      return false;
    }
  }
  return true;
}

export async function setupWorkspaces(
  ctx:
    & { workspacesMasterRepo: prj.FsPathOnly }
    & GitReposContext
    & {
      readonly dryRun: boolean;
      readonly verbose: boolean;
      readonly pullMasterWsRepoFirst: boolean;
    },
): Promise<void> {
  if (!isValidGitReposContext(ctx)) return;
  if (ctx.pullMasterWsRepoFirst) {
    const masterWsProject = prj.enrichProjectPath(
      { absProjectPath: ctx.workspacesMasterRepo },
    );
    if (prj.isGitWorkTree(masterWsProject)) {
      await shell.runShellCommand(
        { dryRun: false }, // dry-run is supported by git pull directly
        {
          cwd: masterWsProject.absProjectPath,
          cmd: shell.commandComponents(
            `git pull${ctx.dryRun ? " --dry-run" : ""}`,
          ),
        },
        shell.shellCmdStdOutHandler,
        shell.shellCmdStdErrHandler,
      );
    }
  }
  if (ctx.verbose) {
    console.log(
      `Setting up ${ctx.workspacesMasterRepo} *.code-workspace files into ${ctx.reposHomePath}`,
    );
  }
  for (
    const walkEntry of fs.walkSync(ctx.workspacesMasterRepo, {
      maxDepth: 1,
    })
  ) {
    if (
      walkEntry.isFile && walkEntry.name.endsWith(".code-workspace")
    ) {
      const srcPath = path.join(
        path.isAbsolute(ctx.workspacesMasterRepo)
          ? ctx.workspacesMasterRepo
          : path.join(Deno.cwd(), ctx.workspacesMasterRepo),
        walkEntry.name,
      );
      const destPath = path.join(
        ctx.reposHomePath,
        walkEntry.name,
      );
      if (ctx.dryRun) {
        console.log(`rm -f ${destPath}`);
        console.log(`ln -s ${srcPath} ${destPath}`);
      } else {
        if (fs.existsSync(destPath)) {
          Deno.removeSync(destPath, { recursive: true });
          if (ctx.verbose) console.log(`Removed ${destPath}`);
        }
        fs.ensureSymlinkSync(srcPath, destPath);
        if (ctx.verbose) {
          console.log(`Created symlink ${destPath} -> ${srcPath}`);
        }
      }
    }
  }
}

export async function gitCloneVsCodeFolders(
  ctx:
    & VsCodeWorkspacesContext
    & GitReposContext
    & {
      readonly dryRun: boolean;
      readonly verbose: boolean;
    },
): Promise<void> {
  if (!isValidGitReposContext(ctx)) return;
  const cloneRuns: Promise<void>[] = [];
  vsCodeWorkspaceFolders(ctx).forEach((vscwsFolderCtx) => {
    const cloneCtx = (vscwsFolderCtx as unknown) as (
      & GitReposContext
      & {
        readonly dryRun: boolean;
        readonly verbose: boolean;
      }
    );
    const repoPath = path.join(
      cloneCtx.reposHomePath,
      vscwsFolderCtx.folder.path,
    );
    if (!fs.existsSync(repoPath)) {
      const repoPathParent = path.dirname(repoPath);
      if (!fs.existsSync(repoPathParent)) {
        if (cloneCtx.dryRun) {
          console.log(`mkdir -p ${repoPathParent}`);
        } else {
          Deno.mkdirSync(repoPathParent, { recursive: true });
        }
      }
      cloneRuns.push(
        shell.runShellCommand(
          cloneCtx,
          `git clone --quiet https://${vscwsFolderCtx.folder.path} ${repoPath}`,
          shell.prepShellCmdStdOutReporter(
            shell.postShellCmdBlockStatusReporter(
              `Cloned https://${vscwsFolderCtx.folder.path} into ${repoPath}`,
            ),
          ),
        ),
      );
    } else {
      if (cloneCtx.verbose) {
        const relativeRepoPath = path.relative(
          cloneCtx.reposHomePath,
          repoPath,
        );
        console.log(
          `Repo ${relativeRepoPath} already exists in ${cloneCtx.reposHomePath}`,
        );
      }
    }
  });
  await Promise.all(cloneRuns);
}

export async function workspaceFoldersGitCommandHandler(
  dryRun: boolean,
  wsFileName: prj.FsPathOnly[] | prj.FsPathOnly,
  gitCmd: string,
  reporter?: (
    ctx: VsCodeWorkspaceFolderContext,
  ) => shell.ShellCmdStatusReporter,
): Promise<void> {
  const cmdRuns: Promise<void>[] = [];
  vsCodeWorkspaceFolders({
    wsFileNames: Array.isArray(wsFileName)
      ? wsFileName
      : [wsFileName.toString()],
  }).forEach((ctx) => {
    if (prj.isGitWorkTree(ctx.folder)) {
      cmdRuns.push(shell.runShellCommand(
        { dryRun: dryRun },
        `git --git-dir=${ctx.folder.gitDir} --work-tree=${ctx.folder.gitWorkTree} ${gitCmd}`,
        reporter
          ? shell.prepShellCmdStdOutReporter(reporter(ctx))
          : shell.shellCmdStdOutHandler,
        shell.shellCmdStdErrHandler,
      ));
    }
  });
  await Promise.all(cmdRuns);
}

export interface NpmCommandHandlerOptions {
  readonly dryRun: boolean;
  readonly wsFileName: prj.FsPathOnly[] | prj.FsPathOnly;
  readonly nodeHomePath: prj.FsPathAndFileName;
  readonly npmCmdParams: string;
  readonly reporter?: (
    ctx: VsCodeWorkspaceFolderContext,
  ) => shell.ShellCmdStatusReporter;
  readonly filter?: (ctx: VsCodeWorkspaceFolderContext) => boolean;
}

export async function workspaceFoldersNpmCommandHandler(
  { dryRun, wsFileName, nodeHomePath, npmCmdParams, reporter, filter }:
    NpmCommandHandlerOptions,
): Promise<void> {
  if (
    !fs.existsSync(nodeHomePath) ||
    !fs.existsSync(path.join(nodeHomePath, "bin/npm"))
  ) {
    console.error(
      `${nodeHomePath} is not a valid NodeJS Path (missing bin/npm)`,
    );
    return;
  }
  const cmdRuns: Promise<void>[] = [];
  vsCodeWorkspaceFolders({
    wsFileNames: Array.isArray(wsFileName)
      ? wsFileName
      : [wsFileName.toString()],
  }).forEach((ctx) => {
    if (prj.isNpmProject(ctx.folder)) {
      if (filter && !filter(ctx)) return;
      cmdRuns.push(shell.runShellCommand(
        { dryRun: dryRun },
        {
          cwd: ctx.folder.absProjectPath,
          cmd: shell.commandComponents(`npm ${npmCmdParams}`),
          env: {
            PATH: `${nodeHomePath}/bin:${Deno.env.get("PATH")}`,
          },
        },
        reporter
          ? shell.prepShellCmdStdOutReporter(reporter(ctx))
          : shell.shellCmdStdOutHandler,
        shell.shellCmdStdErrHandler,
      ));
    }
  });
  await Promise.all(cmdRuns);
}

export interface DenoProjectHandlerOptions {
  readonly dryRun: boolean;
  readonly wsFileName: prj.FsPathOnly[] | prj.FsPathOnly;
  readonly command: (dp: prj.DenoProject) => string;
  readonly reporter?: (
    ctx: VsCodeWorkspaceFolderContext,
  ) => shell.ShellCmdStatusReporter;
  readonly filter?: (ctx: VsCodeWorkspaceFolderContext) => boolean;
}

export async function workspaceFoldersDenoProjectHandler(
  { dryRun, wsFileName, command, reporter, filter }: DenoProjectHandlerOptions,
): Promise<void> {
  const cmdRuns: Promise<void>[] = [];
  vsCodeWorkspaceFolders({
    wsFileNames: Array.isArray(wsFileName)
      ? wsFileName
      : [wsFileName.toString()],
  }).forEach((ctx) => {
    if (prj.isDenoProject(ctx.folder)) {
      if (filter && !filter(ctx)) return;
      cmdRuns.push(shell.runShellCommand(
        { dryRun: dryRun },
        {
          cwd: ctx.folder.absProjectPath,
          cmd: shell.commandComponents(command(ctx.folder)),
        },
        reporter
          ? shell.prepShellCmdStdOutReporter(reporter(ctx))
          : shell.shellCmdStdOutHandler,
        shell.shellCmdStdErrHandler,
      ));
    }
  });
  await Promise.all(cmdRuns);
}

export async function copyVsCodeSettingsFromGitHub(
  projectType: "deno",
  options?: {
    readonly srcRepoTag?: string;
    readonly projectHomePath?: prj.FsPathOnly;
    readonly dryRun?: boolean;
    readonly verbose?: boolean;
  },
): Promise<void> {
  const runningInVsCodeTeamRepo = path.basename(Deno.cwd()) == "vscode-team";
  const vsCodeSettingsHome = ".vscode";
  const version = options?.srcRepoTag || "master";
  await prj.copySourceToDest(
    [
      `https://raw.githubusercontent.com/shah/vscode-team/${version}/${projectType}.vscode/settings.json`,
      `https://raw.githubusercontent.com/shah/vscode-team/${version}/${projectType}.vscode/extensions.json`,
    ],
    options?.projectHomePath
      ? `${options.projectHomePath}/${vsCodeSettingsHome}`
      : vsCodeSettingsHome,
    {
      // if we're testing in the main repo, don't overwrite files
      dryRun: options?.dryRun || runningInVsCodeTeamRepo ||
        false,
      verbose: options?.verbose || false,
    },
  );
}
