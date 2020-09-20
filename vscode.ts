import { fs, path } from "./deps.ts";
import * as ca from "./code-artifacts.ts";
import * as shell from "./shell.ts";

export type VsCodeWorkspaceFsPFN = ca.FsPathAndFileName;

export interface VsCodeWorkspaceFolder {
  readonly path: ca.FsPathOnly;
}

export interface VsCodeWorkspaceFolderEnricher {
  (
    wsFileName: ca.FsPathAndFileName,
    folder: VsCodeWorkspaceFolder,
  ): VsCodeWorkspaceFolder;
}

/**
 * Take a Visual Studio Code folder and enrich it as a project home directory.
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to enrich as a project
 */
export function enrichProjectPath(
  wsFileName: string,
  folder: VsCodeWorkspaceFolder,
): VsCodeWorkspaceFolder & ca.ProjectPath {
  if (ca.isProjectPath(folder)) return folder;
  const projectPath = path.join(
    path.dirname(
      path.isAbsolute(wsFileName)
        ? wsFileName
        : path.join(Deno.cwd(), wsFileName),
    ),
    folder.path,
  );
  return {
    ...folder,
    isProjectPath: true,
    projectPathRelToWorkspaceFile: path.join(
      path.dirname(wsFileName),
      folder.path,
    ),
    absProjectPath: projectPath,
  };
}

/**
 * Take a Visual Studio Code folder and enrich it as a Git work tree.
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to enrich as a Git work tree
 */
export function enrichGitWorkTree(
  wsFileName: string,
  f: VsCodeWorkspaceFolder,
): VsCodeWorkspaceFolder | VsCodeWorkspaceFolder & ca.GitWorkTree {
  const folder = enrichProjectPath(wsFileName, f);
  const workingTreePath = folder.absProjectPath;
  const gitTreePath = path.join(workingTreePath, ".git");
  if (fs.existsSync(gitTreePath)) {
    const result: VsCodeWorkspaceFolder & ca.GitWorkTree = {
      ...folder,
      isGitWorkTree: true,
      gitDir: gitTreePath,
      gitWorkTree: workingTreePath,
    };
    return result;
  }
  return folder;
}

/**
 * Take a Visual Studio Code folder and enrich it as a Deno project
 * if it matches our naming convention (abc.deno.code-workspace).
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to enrich as a Deno project
 */
export function enrichDenoProjectByWsFileNameConvention(
  wsFileName: string,
  f: VsCodeWorkspaceFolder,
): VsCodeWorkspaceFolder | VsCodeWorkspaceFolder & ca.DenoProjectByConvention {
  const folder = enrichProjectPath(wsFileName, f);
  const denoWsFileNamePattern = /\.deno\.code-workspace$/;
  if (!denoWsFileNamePattern.test(wsFileName)) return folder;

  const projectPath = folder.absProjectPath;
  const tsConfigFileName = path.join(projectPath, "tsconfig.json");
  const result: VsCodeWorkspaceFolder & ca.DenoProjectByConvention = {
    ...folder,
    isTypeScriptProject: true,
    tsConfigFileName: fs.existsSync(tsConfigFileName)
      ? tsConfigFileName
      : undefined,
    isDenoProject: true,
    isDenoProjectByConvention: true,
    updateDepsCandidates: (): ca.PolyglotFile[] => {
      return [
        ...ca.guessPolyglotFiles(path.join(projectPath, "**", "mod.ts")),
        ...ca.guessPolyglotFiles(path.join(projectPath, "**", "deps.ts")),
        ...ca.guessPolyglotFiles(path.join(projectPath, "**", "deps-test.ts")),
      ];
    },
  };
  return result;
}

/**
 * Take a Visual Studio Code folder and enrich it as a NodeJS NPM project
 * if it has a package.json file at its root location.
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to enrich as a NodeJS NPM project
 */
export function enrichNpmProject(
  wsFileName: string,
  f: VsCodeWorkspaceFolder,
):
  | VsCodeWorkspaceFolder
  | VsCodeWorkspaceFolder & ca.NpmProject
  | VsCodeWorkspaceFolder & ca.NpmPublishableProject {
  const folder = enrichProjectPath(wsFileName, f);
  const projectPath = folder.absProjectPath;
  const npmPkgConfig = new ca.NpmPackageConfig(
    path.join(projectPath, "package.json"),
  );
  if (!npmPkgConfig.isValid) return folder;
  let regular: VsCodeWorkspaceFolder & ca.NpmProject = {
    ...folder,
    isNpmProject: true,
    npmPackageConfig: npmPkgConfig,
  };
  if (npmPkgConfig.isPublishable) {
    const publishable: VsCodeWorkspaceFolder & ca.NpmPublishableProject = {
      ...regular,
      isNpmPublishableProject: true,
    };
    return publishable;
  }
  return regular;
}

/**
 * Take a Visual Studio Code folder and enrich it as a TypeScript project
 * if it has a tsconfig.json file at its root location.
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to enrich as a TypeScript project
 */
export function enrichTypeScriptProject(
  wsFileName: string,
  f: VsCodeWorkspaceFolder,
):
  | VsCodeWorkspaceFolder
  | VsCodeWorkspaceFolder & ca.TypeScriptProject {
  const folder = enrichProjectPath(wsFileName, f);
  const projectPath = folder.absProjectPath;
  const tsConfigPath = path.join(projectPath, "tsconfig.json");
  if (!fs.existsSync(tsConfigPath)) return folder;
  return {
    ...folder,
    isTypeScriptProject: true,
    tsConfigFileName: tsConfigPath,
  };
}

/**
 * Take a Visual Studio Code folder and enrich it with polyglot detection.
 * @param wsFileName a VS Code x.code-workspace file
 * @param folder The folder we want to detect and enrich
 */
export function enrichVsCodeWorkspaceFolderTypes(
  wsFileName: ca.FsPathAndFileName,
  folder: VsCodeWorkspaceFolder,
): VsCodeWorkspaceFolder {
  const transformers: VsCodeWorkspaceFolderEnricher[] = [
    enrichGitWorkTree,
    enrichDenoProjectByWsFileNameConvention,
    enrichNpmProject,
    enrichTypeScriptProject,
  ];
  let result: VsCodeWorkspaceFolder = enrichProjectPath(wsFileName, folder);
  for (const tr of transformers) {
    result = tr(wsFileName, result);
  }
  return result;
}

export interface VsCodeWorkspace {
  readonly folders: VsCodeWorkspaceFolder[];
}

export interface VsCodeWorkspaceFolderContext {
  readonly wsFileName: ca.FsPathAndFileName;
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

export async function setupWorkspaces(
  ctx:
    & { workspacesMasterRepo: ca.FsPathOnly }
    & ca.GitReposContext
    & {
      readonly dryRun: boolean;
      readonly verbose: boolean;
    },
): Promise<void> {
  if (!ca.isValidGitReposContext(ctx)) return;
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
      walkEntry.isFile &&
      (walkEntry.name == "wsctl.ts" ||
        walkEntry.name.endsWith(".code-workspace"))
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
    & ca.GitReposContext
    & {
      readonly dryRun: boolean;
      readonly verbose: boolean;
    },
): Promise<void> {
  if (!ca.isValidGitReposContext(ctx)) return;
  const cloneRuns: Promise<void>[] = [];
  vsCodeWorkspaceFolders(ctx).forEach((vscwsFolderCtx) => {
    const cloneCtx = (vscwsFolderCtx as unknown) as (
      & ca.GitReposContext
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

export async function copyVsCodeSettingsFromGitHub(
  projectType: "deno",
  options?: {
    readonly srcRepoTag?: string;
    readonly projectHomePath?: ca.FsPathOnly;
    readonly dryRun?: boolean;
    readonly verbose?: boolean;
  },
): Promise<void> {
  const runningInVsCodeTeamRepo = path.basename(Deno.cwd()) == "vscode-team";
  const vsCodeSettingsHome = ".vscode";
  const version = options?.srcRepoTag || "master";
  await ca.copySourceToDest(
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
