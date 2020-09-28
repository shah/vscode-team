import * as cli from "./cli.ts";
import * as mod from "./mod.ts";

const docoptSpec = `
Visual Studio Settings Configuration Controller.

Usage:
  configctl inspect deno settings
  configctl inspect deno extensions [--recommended]
  configctl -h | --help
  configctl --version

Options:
  -h --help            Show this screen
  --version            Show version
`;

export class CliCmdHandlerContext extends cli.TypicalCommandHandlerContext {
}

export async function inspectCliHandler(
  ctx: CliCmdHandlerContext,
): Promise<true | void> {
  const { inspect, deno, settings, extensions, "--recommended": recommended } =
    ctx.cliOptions;
  if (inspect && deno) {
    if (settings) {
      console.dir(mod.denoSettings);
    }
    if (extensions) {
      if (recommended) {
        console.dir(mod.extnRecommendations(mod.denoExtensions));
      } else {
        console.dir(mod.denoExtensions);
      }
    }
    return true;
  }
}

if (import.meta.main) {
  cli.CLI<CliCmdHandlerContext>(
    docoptSpec,
    [inspectCliHandler],
    (options: cli.docopt.DocOptions): CliCmdHandlerContext => {
      return new CliCmdHandlerContext(import.meta.url, options);
    },
  );
}
