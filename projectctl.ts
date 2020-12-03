import { docopt as cli, tsdsh } from "./deps.ts";
import * as mod from "./mod.ts";
import { isGitWorkTree, isHugoProject } from "./project.ts";
import { nodeGitPrecommitScript } from "./node-settings.ts";
import { pythonGitPrecommitScript } from "./python-settings.ts";

// TODO: Use the new `cli.ts` reusable CLI instead of (older) custom one here.
//       See example in configctl.ts of how to properly organize the CLI so
//       that the code works in a CLI or as a library.

// TODO: find way to automatically update this, e.g. using something like
//       git describe --exact-match --abbrev=0
const $VERSION = "v1.0.3";
const docoptSpec = `
Visual Studio Team Projects Controller ${$VERSION}.

Usage:
  projectctl inspect [<project-home>]
  projectctl version [<project-home>]
  projectctl publish [<project-home>] [--semtag=<version>] [--dry-run]
  projectctl deno (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  projectctl deno update [<project-home>] [--dry-run]
  projectctl hugo (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  projectctl react (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  projectctl node (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  projectctl python (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  projectctl git (setup|upgrade) [<project-home>] [--dry-run] [--verbose]
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
  (options: cli.DocOptions): (Promise<true | void>) | (true | void);
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

export function inspectProjectHandler(
  options: cli.DocOptions,
): true | void {
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
      await tsdsh.runShellCommandSafely(
        "git-semtag getfinal",
        tsdsh.cliVerboseShellOutputOptions,
      );
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
      const resultSemtag = await tsdsh.runShellCommandSafely(
        `git-semtag final${version ? (" -v " + version) : ""}${
          isDryRun(options) ? " -o" : ""
        }`,
        tsdsh.cliVerboseShellOutputOptions,
      );
      const resultPush = await tsdsh.runShellCommandSafely(
        `git push`,
        tsdsh.cliVerboseShellOutputOptions,
      );
    } else {
      console.error(`${pp.absProjectPath} is not a Git Work Tree`);
    }
    return true;
  }
}

export function denoSetupOrUpgradeProjectHandler(
  options: cli.DocOptions,
): true | void {
  const { deno, setup, upgrade } = options;
  if (deno && (setup || upgrade)) {
    const startPP = acquireProjectPath(options);
    if (mod.isVsCodeProjectWorkTree(startPP)) {
      if (!isDryRun(options)) {
        startPP.vsCodeConfig.writeSettings(mod.denoSettings);
        startPP.vsCodeConfig.writeExtensions(mod.denoExtensions);
      }
      if (isDryRun || isVerbose(options)) {
        console.log(startPP.vsCodeConfig.settingsFileName);
        console.log(startPP.vsCodeConfig.extensionsFileName);
      }
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
      const result = await tsdsh.runShellCommandSafely(
        cmd,
        tsdsh.cliVerboseShellOutputOptions,
      );
    } else {
      console.error(`Not a Deno project: ${dp.absProjectPath}`);
    }
    return true;
  }
}

export function hugoSetupOrUpgradeProjectHandler(
  options: cli.DocOptions,
): true | void {
  const { hugo, setup, upgrade } = options;
  if (hugo && (setup || upgrade)) {
    const startPP = acquireProjectPath(options);
    if (mod.isVsCodeProjectWorkTree(startPP)) {
      if (!isDryRun(options) && isHugoProject(startPP)) {
        startPP.vsCodeConfig.writeSettings(mod.commonSettings);
        startPP.vsCodeConfig.writeExtensions(mod.hugoExtensions);
      }
      if (isDryRun(options) || isVerbose(options)) {
        console.log(startPP.vsCodeConfig.settingsFileName);
        console.log(startPP.vsCodeConfig.extensionsFileName);
      }
      const upgraded = acquireProjectPath(options);
      if (isVerbose(options)) console.dir(upgraded);
      if (!mod.isHugoProject(upgraded)) {
        console.error(
          "ERROR: Copied VS Code settings but Hugo detection failed.",
        );
      }
    } else {
      console.error(`${startPP.absProjectPath} does not exist.`);
    }
    return true;
  }
}

export function reactSetupOrUpgradeProjectHandler(
  options: cli.DocOptions,
): true | void {
  const { react, setup, upgrade } = options;
  if (react && (setup || upgrade)) {
    const startPP = acquireProjectPath(options);
    if (mod.isVsCodeProjectWorkTree(startPP) && mod.isReactProject(startPP)) {
      if (!isDryRun(options)) {
        startPP.reactConfig.writeVSCodeSettings(mod.reactSettings);
        startPP.reactConfig.writeVSCodeExtensions(mod.reactExtensions);
      }
      if (isDryRun || isVerbose(options)) {
        console.log(startPP.reactConfig.settingsFileName);
        console.log(startPP.reactConfig.extensionsFileName);
      }
      const upgraded = acquireProjectPath(options);
      if (isVerbose(options)) console.dir(upgraded);
      if (!mod.isReactProject(upgraded)) {
        console.error(
          "ERROR: Copied VS Code settings but React project detection failed.",
        );
      }
    } else {
      console.error(`${startPP.absProjectPath} does not exist.`);
    }
    return true;
  }
}

export function nodeSetupOrUpgradeProjectHandler(
  options: cli.DocOptions,
): true | void {
  const { node, setup, upgrade } = options;
  if (node && (setup || upgrade)) {
    const startPP = acquireProjectPath(options);
    if (
      mod.isVsCodeProjectWorkTree(startPP) && mod.isGitWorkTree(startPP) &&
      mod.isNodeProject(startPP)
    ) {
      if (!isDryRun(options)) {
        startPP.nodeConfig.writeVSCodeSettings(mod.nodeSettings);
        startPP.nodeConfig.writeVSCodeExtensions(mod.nodeExtensions);
        startPP.nodeConfig.writePackageConfig(mod.nodeConfig({}));
        startPP.nodeConfig.writeTypescriptConfig(mod.tsConfig({}));
        startPP.nodeConfig.writeLintSettings(
          mod.nodeESLintSettings,
          mod.nodeESLintIgnoreDirs,
        );
        startPP.gitConfig.writeGitPreCommitScript(
          { scriptLanguage: "/bin/zsh", script: nodeGitPrecommitScript },
        );
      }
      if (isDryRun(options) || isVerbose(options)) {
        console.log(startPP.nodeConfig.settingsFileName);
        console.log(startPP.nodeConfig.extensionsFileName);
        console.log(startPP.nodeConfig.pkgConfigPath);
        console.log(startPP.nodeConfig.tsConfigPath);
        console.log(startPP.nodeConfig.esLintSettings);
        console.log(startPP.nodeConfig.esLintIgnore);
        console.log(startPP.nodeConfig.gitPrecommitHook);
      }
      const upgraded = acquireProjectPath(options);
      if (isVerbose(options)) console.dir(upgraded);
      if (!mod.isNodeProject(upgraded)) {
        console.error(
          "ERROR: Copied VS Code settings but Node project detection failed.",
        );
      }
    } else {
      console.error(`${startPP.absProjectPath} does not exist.`);
    }
    return true;
  }
}

export function pythonSetupOrUpgradeProjectHandler(
  options: cli.DocOptions,
): true | void {
  const { python, setup, upgrade } = options;
  if (python && (setup || upgrade)) {
    const startPP = acquireProjectPath(options);
    if (
      mod.isVsCodeProjectWorkTree(startPP) && isGitWorkTree(startPP) &&
      mod.isPythonProject(startPP)
    ) {
      if (!isDryRun(options)) {
        startPP.pythonConfig.writeVSCodeSettings(mod.pythonSettings);
        startPP.pythonConfig.writeVSCodeExtensions(mod.pythonExtensions);
        startPP.gitConfig.writeGitPreCommitScript(
          { scriptLanguage: "/bin/zsh", script: pythonGitPrecommitScript },
        );
      }
      if (isDryRun(options) || isVerbose(options)) {
        console.log(startPP.pythonConfig.settingsFileName);
        console.log(startPP.pythonConfig.extensionsFileName);
        console.log(startPP.pythonConfig.gitPrecommitHook);
      }
      const upgraded = acquireProjectPath(options);
      if (isVerbose(options)) console.dir(upgraded);
      if (!mod.isPythonProject(upgraded)) {
        console.error(
          "ERROR: Copied VS Code settings but Python project detection failed.",
        );
      }
    } else {
      console.error(`${startPP.absProjectPath} does not exist.`);
    }
    return true;
  }
}

export function ctlVersionHandler(
  options: cli.DocOptions,
): true | void {
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
    hugoSetupOrUpgradeProjectHandler,
    reactSetupOrUpgradeProjectHandler,
    nodeSetupOrUpgradeProjectHandler,
    pythonSetupOrUpgradeProjectHandler,
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
