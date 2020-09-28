import { docopt, fs, path } from "./deps.ts";
export { docopt } from "./deps.ts";

//TODO: generalize this so it will work for any repo
const repoVersionRegExp = /shah\/vscode-team\/v?(?<version>\d+\.\d+\.\d+)\//;

//TODO: merge this into CommandHandlerContext.version
export function determineVersion(
  importMetaURL: string,
  isMain?: boolean,
): string {
  const fileURL = importMetaURL.startsWith("file://")
    ? importMetaURL.substr("file://".length)
    : importMetaURL;
  if (fs.existsSync(fileURL)) {
    return `v0.0.0-local${isMain ? ".main" : ""}`;
  }
  const matched = importMetaURL.match(repoVersionRegExp);
  if (matched) {
    return `v${matched.groups!["version"]}`;
  }
  return `v0.0.0-remote(no version tag/branch in ${importMetaURL})`;
}

export interface CommandHandlerContext {
  readonly calledFromMetaURL: string;
  readonly cliOptions: docopt.DocOptions;
  readonly isDryRun: boolean;
  readonly isVerbose: boolean;
  readonly shouldOverwrite: boolean;
}

export interface CommandHandler<T extends CommandHandlerContext> {
  (ctx: T): Promise<true | void>;
}

export class TypicalCommandHandlerContext implements CommandHandlerContext {
  constructor(
    readonly calledFromMetaURL: string,
    readonly cliOptions: docopt.DocOptions,
  ) {
  }

  get isDryRun(): boolean {
    const { "--dry-run": dryRun } = this.cliOptions;
    return dryRun ? true : false;
  }

  get isVerbose(): boolean {
    const { "--verbose": verbose } = this.cliOptions;
    return verbose ? true : false;
  }

  get shouldOverwrite(): boolean {
    const { "--overwrite": overwrite } = this.cliOptions;
    return overwrite ? true : false;
  }

  forceExtension(forceExtn: string, fileName: string): string {
    const fileUrlPrefix = "file://";
    if (fileName.startsWith(fileUrlPrefix)) {
      fileName = fileName.substr(fileUrlPrefix.length);
    }
    const extn = path.extname(fileName);
    if (extn && extn.length > 0) {
      return fileName.substr(0, fileName.length - extn.length) +
        forceExtn;
    }
    return fileName + forceExtn;
  }
}

export async function versionHandler(
  ctx: CommandHandlerContext,
): Promise<true | void> {
  const { "--version": version } = ctx.cliOptions;
  if (version) {
    console.log(determineVersion(ctx.calledFromMetaURL));
    return true;
  }
}

export const commonHandlers = [versionHandler];

export async function CLI<T extends CommandHandlerContext>(
  docoptSpec: string,
  handlers: CommandHandler<T>[],
  prepareContext: (options: docopt.DocOptions) => T,
): Promise<void> {
  try {
    const options = docopt.default(docoptSpec);
    const context = prepareContext(options);
    let handled: true | void;
    for (const handler of handlers) {
      handled = await handler(context);
      if (handled) break;
    }
    if (!handled) {
      for (const handler of commonHandlers) {
        handled = await handler(context);
        if (handled) break;
      }
    }
    if (!handled) {
      console.error("Unable to handle validly parsed docoptSpec:");
      console.dir(options);
    }
  } catch (e) {
    console.error(e.message);
  }
}
