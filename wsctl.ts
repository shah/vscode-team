import { docopt as cli, govnSvcVersion as gsv } from "./deps.ts";
import * as mod from "./mod.ts";

// TODO: Use the new `cli.ts` reusable CLI instead of (older) custom one here.
//       See example in configctl.ts of how to properly organize the CLI so
//       that the code works in a CLI or as a library.

export function determineVersion(
  importMetaURL = import.meta.url,
): Promise<string> {
  return gsv.determineVersionFromRepoTag(
    importMetaURL,
    { repoIdentity: "shah/vscode-team" },
  );
}

const docoptSpec = `
Visual Studio Team Workspaces Controller ${await determineVersion()}.

Usage:
  wsctl setup <workspaces-home-path> <repos-home-path> [--no-pull] [--create-repos-path] [--dry-run] [--verbose]
  wsctl vscws inspect folders <file.code-workspace>
  wsctl vscws settings sync (deno|auto) <file.code-workspace> [--tag=<tag>] [--dry-run] [--verbose]
  wsctl vscws git clone <file.code-workspace> <repos-home-path> [--recurse-submodules] [--create-repos-path] [--dry-run] [--verbose]
  wsctl vscws git fetch <file.code-workspace> [--dry-run]
  wsctl vscws git pull <file.code-workspace> [--recurse-submodules] [--dry-run]
  wsctl vscws git status <file.code-workspace> [--dry-run]
  wsctl vscws git commit <message> <file.code-workspace> [--dry-run]
  wsctl vscws git add-commit <message> <file.code-workspace> [--dry-run]
  wsctl vscws git add-commit-push <message> <file.code-workspace> [--dry-run]
  wsctl vscws npm install <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm publish <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm update <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm test <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm version bump (major|minor|patch) <file.code-workspace> [--no-git-tag-version] [--node-home=<path>] [--dry-run]
  wsctl vscws deno lint <file.code-workspace> [--dry-run]
  wsctl vscws deno fmt <file.code-workspace> [--dry-run]
  wsctl vscws deno test <file.code-workspace> [--dry-run]
  wsctl vscws deno update <file.code-workspace> [--dry-run]
  wsctl -h | --help
  wsctl --version

Options:
  -h --help                 Show this screen
  --version                 Show version  
  <file.code-workspace>     Visual Studio Code workspace file
  <repos-home-path>         Usually $HOME/workspaces
  --node-home=<path>        NodeJS home path (e.g. $HOME/.nvm/versions/node/v14.5.0)
  --tag=<tag>               A specific version of a repo to use (default: "master")
  --dry-run                 Show what will happen instead of executing
  --verbose                 Be descriptive about what's going on
`;

export interface CommandHandler {
  (options: cli.DocOptions): Promise<true | void>;
}

// deno-lint-ignore require-await
export async function vscwsInspectFoldersHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { vscws, inspect, folders, "<file.code-workspace>": wsFileName } =
    options;
  if (vscws && inspect && folders && wsFileName) {
    const folders: mod.VsCodeWorkspaceFolder[] = [];
    mod.vsCodeWorkspaceFolders({
      wsFileNames: Array.isArray(wsFileName)
        ? wsFileName
        : [wsFileName.toString()],
    }).forEach((ctx) => {
      folders.push(ctx.folder);
    });
    console.dir(folders);
    return true;
  }
}

// deno-lint-ignore require-await
export async function setupHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    setup,
    "<workspaces-home-path>": workspacesHomePath,
    "<repos-home-path>": reposHomePath,
    "--create-repos-path": createReposPath,
    "--dry-run": dryRun,
    "--verbose": verbose,
    "--no-pull": noPullFirst,
  } = options;
  if (setup && workspacesHomePath && reposHomePath) {
    mod.setupWorkspaces({
      workspacesMasterRepo: workspacesHomePath.toString(),
      reposHomePath: reposHomePath.toString(),
      dryRun: dryRun ? true : false,
      verbose: verbose ? true : false,
      pullMasterWsRepoFirst: noPullFirst ? false : true,
      reposHomePathDoesNotExistHandler: () => {
        if (createReposPath && reposHomePath) {
          if (dryRun) {
            console.log(`mkdir -p ${reposHomePath}`);
          } else {
            Deno.mkdirSync(reposHomePath.toString());
          }
          return "recovered";
        }
        console.error(`${reposHomePath} does not exist`);
        return "unrecoverrable";
      },
    });
    return true;
  }
}

export async function vscwsGitCloneHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    git,
    clone,
    "<file.code-workspace>": wsFileName,
    "<repos-home-path>": reposHomePath,
    "--create-repos-path": createReposPath,
    "--recurse-submodules": recurseSubmodules,
    "--dry-run": dryRun,
    "--verbose": verbose,
  } = options;
  if (vscws && git && clone && wsFileName && reposHomePath) {
    await mod.gitCloneVsCodeFolders(
      {
        wsFileNames: Array.isArray(wsFileName)
          ? wsFileName
          : [wsFileName.toString()],
        reposHomePath: reposHomePath ? reposHomePath.toString() : ".",
        recurseSubmodules: recurseSubmodules ? true : false,
        dryRun: dryRun ? true : false,
        verbose: verbose ? true : false,
        reposHomePathDoesNotExistHandler: () => {
          if (createReposPath && reposHomePath) {
            if (dryRun) {
              console.log(`mkdir -p ${reposHomePath}`);
            } else {
              Deno.mkdirSync(reposHomePath.toString());
            }
            return "recovered";
          }
          console.error(`${reposHomePath} does not exist`);
          return "unrecoverrable";
        },
      },
    );
    return true;
  }
}

export async function vscwsGitStatusHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    git,
    status,
    "<file.code-workspace>": wsFileName,
    "--dry-run": dryRun,
  } = options;
  if (vscws && git && status && wsFileName) {
    await mod.workspaceFoldersGitCommandHandler(
      dryRun ? true : false,
      wsFileName as (string[] | string),
      "status -s",
    );
    return true;
  }
}

export async function vscwsGitFetchPullHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    git,
    pull,
    fetch,
    "<file.code-workspace>": wsFileName,
    "--recurse-submodules": recurseSubmodules,
    "--dry-run": dryRun,
  } = options;
  if (vscws && git && (pull || fetch) && wsFileName) {
    await mod.workspaceFoldersGitCommandHandler(
      false, // fetch and pull have their own dry run
      wsFileName as (string[] | string),
      pull
        ? `pull${
          recurseSubmodules
            ? " --recurse-submodules && git submodule update --recursive"
            : ""
        }${dryRun ? " --dry-run" : ""}`
        : `fetch${dryRun ? " --dry-run" : ""}`,
    );
    return true;
  }
}

export async function vscwsGitCommitHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    git,
    "add-commit": addCommit,
    "commit": commit,
    "add-commit-push": addCommitPush,
    "<message>": message,
    "<file.code-workspace>": wsFileName,
    "--dry-run": dryRun,
  } = options;
  if (
    vscws && git && (addCommit || commit || addCommitPush) && message &&
    wsFileName
  ) {
    const gitDryRun = dryRun ? " --dry-run" : "";
    if (addCommit || addCommitPush) {
      await mod.workspaceFoldersGitCommandHandler(
        false, // we'll use git commit --dry-run instead
        wsFileName as (string[] | string),
        `add${gitDryRun} .`,
      );
    }
    await mod.workspaceFoldersGitCommandHandler(
      false, // we'll use git commit --dry-run instead
      wsFileName as (string[] | string),
      `commit${gitDryRun} -am "${message}"`,
    );
    if (addCommitPush) {
      await mod.workspaceFoldersGitCommandHandler(
        false, // we'll use git commit --dry-run instead
        wsFileName as (string[] | string),
        `push${gitDryRun}`,
      );
    }
    return true;
  }
}

export async function vscwsNpmSingleCommandHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    npm,
    update,
    install,
    test,
    publish,
    "<file.code-workspace>": wsFileName,
    "--node-home": nodeHomePath,
    "--dry-run": dryRun,
  } = options;
  if (vscws && npm && (update || install || test || publish) && wsFileName) {
    let npmCmd = "(unknown)";
    let filter:
      | ((ctx: mod.VsCodeWorkspaceFolderContext) => boolean)
      | undefined;
    switch (update || install || test || publish) {
      case update:
        npmCmd = "update";
        break;
      case install:
        npmCmd = "install";
        break;
      case test:
        npmCmd = "test";
        break;
      case publish:
        npmCmd = "publish";
        filter = (ctx: mod.VsCodeWorkspaceFolderContext): boolean => {
          return mod.isNpmPublishableProject(ctx.folder);
        };
        break;
      default:
        filter = undefined;
        break;
    }
    await mod.workspaceFoldersNpmCommandHandler({
      dryRun: dryRun ? true : false,
      wsFileName: wsFileName as (string[] | string),
      nodeHomePath: nodeHomePath
        ? nodeHomePath.toString()
        : "/usr/local/bin/node",
      npmCmdParams: npmCmd,
      filter: filter,
    });
    return true;
  }
}

export async function vscwsNpmVersionHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    npm,
    version,
    bump,
    major,
    minor,
    "<file.code-workspace>": wsFileName,
    "--node-home": nodeHomePath,
    "--no-git-tag-version": noGitTagVersion,
    "--dry-run": dryRun,
  } = options;
  if (vscws && npm && version && bump) {
    const version = major ? "major" : (minor ? "minor" : "patch");
    await mod.workspaceFoldersNpmCommandHandler({
      dryRun: dryRun ? true : false,
      wsFileName: wsFileName as (string[] | string),
      nodeHomePath: nodeHomePath
        ? nodeHomePath.toString()
        : "/usr/local/bin/node",
      npmCmdParams: `${
        noGitTagVersion ? "--no-git-tag-version" : ""
      } version ${version}`,
    });
    return true;
  }
}

export async function vscwsDenoSingleCommandHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    deno,
    lint,
    fmt,
    test,
    "<file.code-workspace>": wsFileName,
    "--dry-run": dryRun,
  } = options;
  if (vscws && deno && (fmt || lint || test)) {
    await mod.workspaceFoldersDenoProjectHandler({
      dryRun: dryRun ? true : false,
      wsFileName: wsFileName as (string[] | string),
      command: (): string => {
        return lint
          ? "deno lint --unstable"
          : (fmt ? "deno fmt --unstable" : "deno test --unstable -A");
      },
      filter: (ctx): boolean => {
        return mod.isDenoProject(ctx.folder);
      },
    });
    return true;
  }
}

export async function vscwsDenoUpdateHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    deno,
    update,
    "<file.code-workspace>": wsFileName,
    "--dry-run": dryRun,
  } = options;
  if (vscws && deno && update) {
    await mod.workspaceFoldersDenoProjectHandler({
      dryRun: false, // udd has its own --dry-run
      wsFileName: wsFileName as (string[] | string),
      command: (dp: mod.DenoProject): string => {
        const checkFiles: string[] = [];
        for (const candidate of dp.updateDepsCandidates()) {
          if (candidate.fileExists) {
            checkFiles.push(candidate.relativeTo(dp.absProjectPath));
          }
        }
        return `udd${dryRun ? " --dry-run" : ""} ${checkFiles.join(" ")}`;
      },
      filter: (ctx): boolean => {
        return mod.isDenoProject(ctx.folder) &&
          ctx.folder.updateDepsCandidates().length > 0;
      },
    });
    return true;
  }
}

export async function vscwsSettingsSyncHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    vscws,
    settings,
    sync,
    deno,
    "<file.code-workspace>": wsFileName,
    "--tag": tag,
    "--dry-run": dryRun,
    "--verbose": verbose,
  } = options;
  if (vscws && settings && sync) {
    const stdLib: "auto" | "deno" = (deno ? "deno" : "auto");
    const cmdRuns: Promise<void>[] = [];

    mod.vsCodeWorkspaceFolders({
      wsFileNames: Array.isArray(wsFileName)
        ? wsFileName
        : [wsFileName!.toString()],
    }).forEach((ctx) => {
      if (
        (stdLib === "auto" || stdLib === "deno") &&
        mod.isDenoProject(ctx.folder)
      ) {
        mod.copyVsCodeSettingsFromGitHub("deno", {
          srcRepoTag: tag ? tag.toString() : undefined,
          projectHomePath: ctx.folder.absProjectPath,
          dryRun: dryRun ? true : false,
          verbose: verbose ? true : false,
        });
      }
    });
    await Promise.all(cmdRuns);
    return true;
  }
}

export async function vscwsVersionHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { "--version": version } = options;
  if (version) {
    console.log(await determineVersion());
    return true;
  }
}

if (import.meta.main) {
  const handlers: CommandHandler[] = [
    vscwsInspectFoldersHandler,
    vscwsGitCloneHandler,
    vscwsGitFetchPullHandler,
    vscwsGitStatusHandler,
    vscwsGitCommitHandler,
    vscwsNpmSingleCommandHandler,
    vscwsNpmVersionHandler,
    vscwsDenoSingleCommandHandler,
    vscwsDenoUpdateHandler,
    vscwsSettingsSyncHandler,
    vscwsVersionHandler,
    setupHandler,
  ];
  try {
    const options = cli.default(docoptSpec);
    let handled: true | void;
    for (const handler of handlers) {
      handled = await handler(options);
      if (handled) break;
    }
    if (!handled) {
      console.error("Unable to handle validly parsed docoptSpec:");
      console.dir(options);
    }
  } catch (e) {
    console.error(e.message);
  }
}
