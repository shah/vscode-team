import * as ca from "./code-artifacts.ts";
import { docopt as cli, fs, path } from "./deps.ts";
import * as vsc from "./vscode.ts";

const docoptSpec = `
Visual Studio Team Projects Controller.

Usage:
  teamctl.ts setup deno [<project-home>] [--dry-run] [--verbose]
  teamctl.ts upgrade deno [--dry-run] [--verbose]
  teamctl.ts -h | --help
  teamctl.ts --version

Options:
  -h --help         Show this screen
  --version         Show version
  <project-home>    The root of the project folder (usually ".")
  --dry-run         Show what will happen instead of executing
  --verbose         Be descriptive about what's going on
`;

export interface CommandHandler {
  (options: cli.DocOptions): Promise<true | void>;
}

export async function copyVsCodeSettingsFromGitHub(
  projectType: "deno",
  options?: {
    readonly projectHomePath: ca.FsPathOnly;
    readonly dryRun: boolean;
    readonly verbose: boolean;
  },
): Promise<void> {
  await ca.copySourceToDest(
    [
      `https://github.com/shah/vscode-team/blob/master/${projectType}.vscode/settings.json`,
      `https://github.com/shah/vscode-team/blob/master/${projectType}.vscode/extensions.json`,
    ],
    options?.projectHomePath || ".",
    {
      dryRun: options?.dryRun || false,
      verbose: options?.verbose || false,
    },
  );
}

export async function setupOrUpgradeHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    setup,
    upgrade,
    deno,
    "<project-home>": projectHomePath,
    "--dry-run": dryRun,
    "--verbose": verbose,
  } = options;
  if ((setup || upgrade) && deno) {
    copyVsCodeSettingsFromGitHub("deno");
    return true;
  }
}

if (import.meta.main) {
  const handlers: CommandHandler[] = [
    setupOrUpgradeHandler,
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
