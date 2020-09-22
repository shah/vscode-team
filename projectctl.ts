import { docopt as cli } from "./deps.ts";
import * as mod from "./mod.ts";

// TODO: find way to automatically update this, e.g. using something like
//       git describe --exact-match --abbrev=0
const $VERSION = "v0.9.0";
const docoptSpec = `
Visual Studio Team Projects Controller ${$VERSION}.

Usage:
  projectctl inspect [<project-home>]
  projectctl version [<project-home>]
  projectctl publish [<project-home>] [--semtag=<version>] [--dry-run]
  projectctl deno (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  projectctl deno update [<project-home>] [--dry-run]
  projectctl -h | --help
  projectctl --version

Options:
  -h --help            Show this screen
  --version            Show version
  <project-home>       The root of the project folder (defaults to ".")
  --tag=<tag>          A specific version of the settings to use (default: "master")
  --semtag=<version>   A specific semantic version to apply as a tag
  --dry-run            Show what will happen instead of executing
  --verbose            Be descriptive about what's going on
`;

export interface CommandHandler {
  (options: cli.DocOptions): Promise<true | void>;
}

export function isDryRun(options: cli.DocOptions): boolean {
  const { "--dry-run": dryRun } = options;
  return dryRun ? true : false;
}

export function isVerbose(options: cli.DocOptions): boolean {
  const { "--verbose": verbose } = options;
  return verbose ? true : false;
}

export function acquireProjectPath(options: cli.DocOptions): mod.ProjectPath {
  const { "<project-home>": projectHomePath } = options;
  return mod.enrichProjectPath(
    { absProjectPath: projectHomePath ? projectHomePath.toString() : "." },
  );
}

export async function runShellCommand(
  cmd: string,
  pp: mod.ProjectPath,
  options: cli.DocOptions,
): Promise<void> {
  await mod.runShellCommand(
    { dryRun: false }, // dry-run is supported by udd directly
    {
      cwd: pp.absProjectPath,
      cmd: mod.commandComponents(cmd),
    },
    mod.shellCmdStdOutHandler,
    mod.shellCmdStdErrHandler,
  );
}

export async function inspectProjectHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { inspect } = options;
  if (inspect) {
    const pp = acquireProjectPath(options);
    if (!pp.absProjectPathExists) {
      console.error(`Path ${pp.absProjectPath} does not exist.`);
      return true;
    }
    console.dir(pp);
    return true;
  }
}

export async function projectVersionHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { version } = options;
  if (version) {
    const pp = acquireProjectPath(options);
    if (mod.isGitWorkTree(pp)) {
      await runShellCommand("git-semtag getfinal", pp, options);
    } else {
      console.error(`${pp.absProjectPath} is not a Git Work Tree`);
    }
    return true;
  }
}

export async function publishProjectHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { publish, "--semtag": version } = options;
  if (publish) {
    const pp = acquireProjectPath(options);
    if (mod.isGitWorkTree(pp)) {
      await runShellCommand(
        `git-semtag final${version ? (" -v " + version) : ""}${
          isDryRun(options) ? " -o" : ""
        }`,
        pp,
        options,
      );
      await runShellCommand(`git push`, pp, options);
    } else {
      console.error(`${pp.absProjectPath} is not a Git Work Tree`);
    }
    return true;
  }
}

export async function denoSetupOrUpgradeProjectHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { deno, setup, upgrade, "--tag": tag } = options;
  if (deno && (setup || upgrade)) {
    const startPP = acquireProjectPath(options);
    if (startPP.absProjectPathExists) {
      await mod.copyVsCodeSettingsFromGitHub("deno", {
        srcRepoTag: tag ? tag.toString() : undefined,
        projectHomePath: startPP.absProjectPath,
        dryRun: isDryRun(options),
        verbose: isVerbose(options),
      });
      const upgraded = acquireProjectPath(options);
      if (isVerbose(options)) console.dir(upgraded);
      if (!mod.isDenoProject(upgraded)) {
        console.error(
          "ERROR: Copied VS Code settings but Deno detection failed.",
        );
      }
    } else {
      console.error(`${startPP.absProjectPath} does not exist.`);
    }
    return true;
  }
}

export async function denoUpdateDependenciesHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { deno, update } = options;
  if (deno && update) {
    const dp = acquireProjectPath(options);
    if (!dp.absProjectPathExists) {
      console.error(`Path ${dp.absProjectPath} does not exist.`);
      return true;
    }
    if (mod.isDenoProject(dp)) {
      const checkFiles: string[] = [];
      for (const candidate of dp.updateDepsCandidates()) {
        if (candidate.fileExists) {
          checkFiles.push(candidate.relativeTo(dp.absProjectPath));
        }
      }
      const cmd = `udd${isDryRun(options) ? " --dry-run" : ""} ${
        checkFiles.join(" ")
      }`;
      await runShellCommand(cmd, dp, options);
    } else {
      console.error(`Not a Deno project: ${dp.absProjectPath}`);
    }
    return true;
  }
}

export async function ctlVersionHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const { "--version": version } = options;
  if (version) {
    console.log($VERSION);
    return true;
  }
}

if (import.meta.main) {
  // put the shorter commands near the end of the list
  const handlers: CommandHandler[] = [
    denoSetupOrUpgradeProjectHandler,
    denoUpdateDependenciesHandler,
    inspectProjectHandler,
    publishProjectHandler,
    projectVersionHandler,
    ctlVersionHandler,
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
