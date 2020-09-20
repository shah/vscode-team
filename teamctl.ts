import { docopt as cli } from "./deps.ts";
import * as mod from "./mod.ts";

const docoptSpec = `
Visual Studio Team Projects Controller.

Usage:
  teamctl.ts setup deno [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  teamctl.ts upgrade deno [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  teamctl.ts -h | --help
  teamctl.ts --version

Options:
  -h --help         Show this screen
  --version         Show version
  <project-home>    The root of the project folder (usually ".")
  --tag=<tag>       A specific version of the settings to use (default: "master")
  --dry-run         Show what will happen instead of executing
  --verbose         Be descriptive about what's going on
`;

export interface CommandHandler {
  (options: cli.DocOptions): Promise<true | void>;
}

export async function setupOrUpgradeHandler(
  options: cli.DocOptions,
): Promise<true | void> {
  const {
    setup,
    upgrade,
    deno,
    "<project-home>": projectHomePath,
    "--tag": tag,
    "--dry-run": dryRun,
    "--verbose": verbose,
  } = options;
  if ((setup || upgrade) && deno) {
    mod.copyVsCodeSettingsFromGitHub("deno", {
      srcRepoTag: tag ? tag.toString() : undefined,
      projectHomePath: projectHomePath ? projectHomePath.toString() : undefined,
      dryRun: dryRun ? true : false,
      verbose: verbose ? true : false,
    });
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