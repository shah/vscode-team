import { fs, path } from "./deps.ts";
import * as dl from "./download.ts";

export type FsPathOnly = string;
export type AbsoluteFsPath = FsPathOnly;
export type RelativeFsPath = FsPathOnly;
export type FsPathAndFileName = FsPathOnly & string;
export type FsPathAndFileNameOrUrl = FsPathAndFileName | URL;
export type FileExtension = string;
export type FileGlobPattern = string;
export type AbsoluteFsPathAndFileName = AbsoluteFsPath & string;

export type RecoverableErrorHandlerResult = "recovered" | "unrecoverrable";

export interface PathFinder {
  (target: FsPathAndFileName, search: FsPathOnly[]): FsPathAndFileName | false;
}

export function findInPath(
  target: FsPathAndFileName,
  search: FsPathOnly[],
): FsPathAndFileName | false {
  for (const searchPath of search) {
    const tryPath = path.join(searchPath, target);
    if (fs.existsSync(tryPath)) return tryPath;
  }
  return false;
}

export interface ProjectPath {
  readonly isProjectPath: true;
  readonly projectPathRelToWorkspaceFile: FsPathAndFileName;
  readonly absProjectPath: FsPathAndFileName;
}

export function isProjectPath(o: unknown): o is ProjectPath {
  return o && typeof o === "object" && "isProjectPath" in o;
}

export function vsCodeProjectSettingsPath(pp: ProjectPath): AbsoluteFsPath {
  return path.join(pp.absProjectPath, ".vscode");
}

export interface GitWorkTree extends ProjectPath {
  readonly isGitWorkTree: true;
  readonly gitWorkTree: FsPathOnly;
  readonly gitDir: FsPathOnly;
}

export function isGitWorkTree(o: unknown): o is GitWorkTree {
  return o && typeof o === "object" && "isGitWorkTree" in o;
}

export interface PolyglotFile {
  readonly fileName: AbsoluteFsPathAndFileName;
  readonly fileExtn: FileExtension;
  readonly fileExists: boolean;
  readonly relativeTo: (to: FsPathOnly) => RelativeFsPath;
}

export interface JsonFile extends PolyglotFile {
  readonly isJsonFile: true;
  readonly content: () => unknown;
}

export class TypicalJsonFile implements JsonFile {
  readonly isJsonFile = true;

  constructor(readonly fileName: string) {
  }

  content(): unknown {
    if (this.fileExists) {
      return JSON.parse(Deno.readTextFileSync(this.fileName));
    }
    return undefined;
  }

  contentDict(): Record<string, unknown> | undefined {
    const content = this.content();
    if (content) {
      return content as Record<string, unknown>;
    }
    return undefined;
  }

  get fileExists(): boolean {
    return fs.existsSync(this.fileName);
  }

  get fileExtn(): FileExtension {
    return path.extname(this.fileName);
  }

  relativeTo(to: FsPathOnly): RelativeFsPath {
    return path.relative(to, this.fileName);
  }
}

export function guessPolyglotFile(fn: AbsoluteFsPathAndFileName): PolyglotFile {
  const extn = path.extname(fn);
  switch (extn) {
    case ".json":
      return new TypicalJsonFile(fn);

    default:
      return {
        fileName: fn,
        fileExists: fs.existsSync(fn),
        fileExtn: extn,
        relativeTo: (to: FsPathOnly): RelativeFsPath => {
          return path.relative(to, fn);
        },
      };
  }
}

export function guessPolyglotFiles(glob: FileGlobPattern): PolyglotFile[] {
  const results: PolyglotFile[] = [];
  for (const we of fs.expandGlobSync(glob)) {
    if (we.isFile) {
      results.push(guessPolyglotFile(we.path));
    }
  }
  return results;
}

export interface GitReposContext {
  readonly reposHomePath: FsPathOnly;
  readonly reposHomePathDoesNotExistHandler?: (
    ctx: GitReposContext,
  ) => RecoverableErrorHandlerResult;
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

export interface TypeScriptProject {
  readonly isTypeScriptProject: true;
  readonly tsConfigFileName?: FsPathAndFileName;
}

export function isTypeScriptProject(o: unknown): o is TypeScriptProject {
  return o && typeof o === "object" && "isTypeScriptProject" in o;
}

export interface DenoProject extends ProjectPath, TypeScriptProject {
  readonly isDenoProject: true;
  readonly updateDepsCandidates: () => PolyglotFile[];
}

export function isDenoProject(o: unknown): o is DenoProject {
  return o && typeof o === "object" && "isDenoProject" in o;
}

export interface DenoProjectByConvention extends DenoProject {
  readonly isDenoProjectByConvention: true;
}

export function isDenoProjectByConvention(
  o: unknown,
): o is DenoProjectByConvention {
  return o && typeof o === "object" && "isDenoProjectByConvention" in o;
}

export class NpmPackageConfig extends TypicalJsonFile {
  get isValid(): boolean {
    return this.fileExists;
  }

  get isPublishable(): boolean {
    const packageDict = this.contentDict();
    if (packageDict) {
      const scripts = packageDict.scripts as Record<string, string>;
      return scripts.prepublishOnly ? true : false;
    }
    return false;
  }
}

export interface NpmProject extends ProjectPath {
  readonly isNpmProject: true;
  readonly npmPackageConfig: NpmPackageConfig;
}

export function isNpmProject(o: unknown): o is NpmProject {
  return o && typeof o === "object" && "isNpmProject" in o;
}

export interface NpmPublishableProject extends NpmProject {
  readonly isNpmPublishableProject: true;
}

export function isNpmPublishableProject(
  o: unknown,
): o is NpmPublishableProject {
  return o && typeof o === "object" && "isNpmPublishableProject" in o;
}

function isURL(text: string | URL): boolean {
  if (typeof text === "string") {
    const pattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$", // fragment locator
      "i",
    );
    return !!pattern.test(text);
  }
  return true;
}

export async function copySourceToDest(
  sources: FsPathAndFileNameOrUrl[],
  dest: FsPathAndFileName,
  { dryRun, verbose }: {
    readonly dryRun: boolean;
    readonly verbose: boolean;
  },
): Promise<void> {
  if (!fs.existsSync(dest)) {
    if (dryRun) {
      console.log("mkdir", dest);
    } else {
      if (verbose) console.log(`Creating directory ${dest}`);
      Deno.mkdirSync(dest);
    }
  }
  if (fs.existsSync(dest)) {
    for (const src of sources) {
      if (verbose) {
        console.log(`Copying ${src} to ${dest}`);
      }
      if (isURL(src)) {
        if (dryRun) {
          console.log(`Download ${src} ${dest}`);
        } else {
          await dl.download(src, { dir: dest }, {
            redirect: "follow",
          });
        }
      } else {
        if (dryRun) {
          console.log(`cp ${src} ${dest}`);
        } else {
          fs.copySync(src as string, dest, { overwrite: true });
        }
      }
    }
  } else {
    console.error(`${dest} does not exist (and unable to create it)`);
  }
}
