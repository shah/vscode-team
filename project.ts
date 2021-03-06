import { fs, path, safety } from "./deps.ts";
import * as dl from "./download.ts";
import * as vscConfig from "./vscode-settings.ts";
import type * as reactVscodeSettings from "./react-settings.ts";
import type { TypeScriptCompilerConfig } from "./tsconfig-settings.ts";
import { NodeESLintSettings, NodePackageConfig } from "./node-settings.ts";
import * as shell from "./shell.ts";

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

export interface ProjectPathEnricher {
  (ctx: { absProjectPath: FsPathAndFileName }, pp: ProjectPath): ProjectPath;
}

export interface ProjectPath {
  readonly isProjectPath: true;
  readonly absProjectPath: FsPathAndFileName;
  readonly absProjectPathExists: boolean;
}

export const isProjectPath = safety.typeGuard<ProjectPath>("isProjectPath");

/**
 * Prepare a project path.
 * @param ctx the enrichment context
 * @returns the new ProjectPath
 */
export function prepareProjectPath(
  ctx: { absProjectPath: FsPathAndFileName },
): ProjectPath {
  const absPath = path.isAbsolute(ctx.absProjectPath)
    ? ctx.absProjectPath
    : path.join(Deno.cwd(), ctx.absProjectPath);
  return {
    isProjectPath: true,
    absProjectPath: absPath,
    absProjectPathExists: fs.existsSync(absPath),
  };
}

const defaultEnrichers: ProjectPathEnricher[] = [
  enrichVsCodeWorkTree,
  enrichGitWorkTree,
  enrichDenoProjectByVsCodePlugin,
  enrichNpmProject,
  enrichTypeScriptProject,
  enrichHugoProject,
  enrichReactProject,
  enrichNodeProject,
  enrichPythonProject,
];

/**
 * Take a ProjectPath and enrich it with polyglot detection.
 * @param ctx the enrichment context
 * @returns the enriched ProjectPath
 */
export function enrichProjectPath(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath = prepareProjectPath(ctx),
  enrichers?: (suggested: ProjectPathEnricher[]) => ProjectPathEnricher[],
): ProjectPath {
  const transformers = enrichers
    ? enrichers(defaultEnrichers)
    : defaultEnrichers;

  let result = pp;
  for (const tr of transformers) {
    result = tr(ctx, result);
  }
  return result;
}

export interface VsCodeProjectWorkTree extends ProjectPath {
  readonly isVsCodeProjectWorkTree: true;
  readonly vsCodeConfig: {
    absConfigPath: AbsoluteFsPath;
    settingsFileName: AbsoluteFsPathAndFileName;
    extensionsFileName: AbsoluteFsPathAndFileName;
    configPathExists: () => boolean;
    settingsExists: () => boolean;
    extensionsExists: () => boolean;
    writeSettings: (settings: vscConfig.Settings) => void;
    writeExtensions: (extensions: vscConfig.Extension[]) => void;
  };
}

export const isVsCodeProjectWorkTree = safety.typeGuard<VsCodeProjectWorkTree>(
  "isVsCodeProjectWorkTree",
);

/**
 * Take a ProjectPath and enrich it as a Visual Studio Code work tree
 * @param ctx the enrichment context
 * @param pp The ProjectPath we want to enrich as a VS Code work tree
 * @returns the enriched ProjectPath
 */
export function enrichVsCodeWorkTree(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | GitWorkTree {
  if (isVsCodeProjectWorkTree(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;

  const configPath = `${pp.absProjectPath}/.vscode`;
  const configSettingsFileName = `${configPath}/settings.json`;
  const configExtnFileName = `${configPath}/extensions.json`;
  const result: VsCodeProjectWorkTree = {
    ...pp,
    isVsCodeProjectWorkTree: true,
    vsCodeConfig: {
      absConfigPath: configPath,
      settingsFileName: configSettingsFileName,
      extensionsFileName: configExtnFileName,
      configPathExists: (): boolean => {
        return fs.existsSync(configPath);
      },
      settingsExists: (): boolean => {
        return fs.existsSync(configSettingsFileName);
      },
      extensionsExists: (): boolean => {
        return fs.existsSync(configExtnFileName);
      },
      writeSettings: (settings: vscConfig.Settings): void => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(configPath)) fs.ensureDirSync(configPath);
        Deno.writeTextFileSync(
          configSettingsFileName,
          JSON.stringify(settings, undefined, 2),
        );
      },
      writeExtensions: (extensions: vscConfig.Extension[]) => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(configPath)) fs.ensureDirSync(configPath);
        Deno.writeTextFileSync(
          configExtnFileName,
          JSON.stringify(
            vscConfig.extnRecommendations(extensions),
            undefined,
            2,
          ),
        );
      },
    },
  };
  return result;
}

export interface GitWorkTree extends ProjectPath {
  readonly isGitWorkTree: true;
  readonly gitWorkTree: FsPathOnly;
  readonly gitDir: FsPathOnly;
  gitConfig: {
    readonly preCommitHookFileName: AbsoluteFsPathAndFileName;
    writeGitPreCommitScript: (
      gitPrecommitCmd: shell.ShellExecutableScriptDefn,
    ) => void;
  };
}

export const isGitWorkTree = safety.typeGuard<GitWorkTree>(
  "isGitWorkTree",
);

/**
 * Take a ProjectPath and enrich it as a Git work tree if appropriate.
 * @param ctx the enrichment context
 * @param pp The ProjectPath we want to enrich as a Git work tree
 * @returns the enriched ProjectPath
 */
export function enrichGitWorkTree(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | GitWorkTree {
  if (isGitWorkTree(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;

  const workingTreePath = pp.absProjectPath;
  const gitTreePath = path.join(workingTreePath, ".git");
  const gitCheckFileName = `${gitTreePath}/hooks/pre-commit`;
  if (fs.existsSync(gitTreePath)) {
    const result: GitWorkTree = {
      ...pp,
      isGitWorkTree: true,
      gitDir: gitTreePath,
      gitWorkTree: workingTreePath,
      gitConfig: {
        preCommitHookFileName: gitCheckFileName,
        writeGitPreCommitScript: (
          gitPrecommitCmd: shell.ShellExecutableScriptDefn,
        ) => {
          shell.writeGitPreCommitScript(gitCheckFileName, gitPrecommitCmd);
        },
      },
    };
    return result;
  }
  return pp;
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

export interface TypeScriptProject extends ProjectPath {
  readonly isTypeScriptProject: true;
  readonly tsConfigFileName?: FsPathAndFileName;
}

export const isTypeScriptProject = safety.typeGuard<TypeScriptProject>(
  "isTypeScriptProject",
);

/**
 * Take a ProjectPath and enrich it as a TypeScript project
 * if it has a tsconfig.json file at its root location.
 * @param ctx the enrichment context
 * @param pp The ProjectPath we want to enrich as a Git work tree
 * @returns the enriched ProjectPath
 */
export function enrichTypeScriptProject(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | TypeScriptProject {
  if (isTypeScriptProject(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;

  const projectPath = pp.absProjectPath;
  const tsConfigPath = path.join(projectPath, "tsconfig.json");
  if (!fs.existsSync(tsConfigPath)) return pp;
  const result: TypeScriptProject = {
    ...pp,
    isTypeScriptProject: true,
    tsConfigFileName: tsConfigPath,
  };
  return result;
}

export interface DenoProject extends ProjectPath, TypeScriptProject {
  readonly isDenoProject: true;
  readonly updateDepsCandidates: () => PolyglotFile[];
}

export const isDenoProject = safety.typeGuard<DenoProject>(
  "isDenoProject",
);

export interface DenoProjectByVsCodePlugin extends DenoProject {
  readonly isDenoProjectByVsCodePlugin: true;
}

export const isDenoProjectByVsCodePlugin = safety.typeGuard<
  DenoProjectByVsCodePlugin
>(
  "isDenoProjectByVsCodePlugin",
);

export interface DenoProjectByConvention extends DenoProject {
  readonly isDenoProjectByConvention: true;
}

export const isDenoProjectByConvention = safety.typeGuard<
  DenoProjectByConvention
>(
  "isDenoProjectByConvention",
);

export interface HugoProject extends ProjectPath {
  readonly isHugoProject: true;
}

export const isHugoProject = safety.typeGuard<HugoProject>("isHugoProject");

export function enrichHugoProject(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | HugoProject {
  if (isHugoProject(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;

  const projectPath = pp.absProjectPath;
  const hugoThemePath = path.join(projectPath, "themes");
  const hugoLayoutPath = path.join(projectPath, "layouts");
  if (
    !fs.existsSync(hugoThemePath) &&
    !fs.existsSync(hugoLayoutPath)
  ) {
    return pp;
  }
  const result: HugoProject = {
    ...pp,
    isHugoProject: true,
  };
  return result;
}

function isTsConfigJsxReactSet(
  tsConfigPath: AbsoluteFsPathAndFileName,
): boolean {
  const tsConfigJSON = new TypicalJsonFile(tsConfigPath);
  if (tsConfigJSON.fileExists) {
    try {
      const tsConfigContent = tsConfigJSON.contentDict();
      if (tsConfigContent) {
        const compilerOpts = tsConfigContent.compilerOptions as Record<
          string,
          string
        >;
        return compilerOpts.jsx == "react" ? true : false;
      }
    } catch {
      return false;
    }
  }
  return false;
}

export interface ReactProject extends ProjectPath {
  readonly isReactProject: true;
  readonly reactConfig: {
    tsConfigPath: AbsoluteFsPath;
    settingsFileName: AbsoluteFsPathAndFileName;
    extensionsFileName: AbsoluteFsPathAndFileName;
    configPathExists: () => boolean;
    settingsExists: () => boolean;
    extensionsExists: () => boolean;
    writeVSCodeSettings: (settings: reactVscodeSettings.ReactSettings) => void;
    writeVSCodeExtensions: (
      extensions: vscConfig.Extension[],
    ) => void;
  };
}

export const isReactProject = safety.typeGuard<ReactProject>("isReactProject");

export function enrichReactProject(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | ReactProject {
  if (isReactProject(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;
  const projectPath = pp.absProjectPath;
  const configPath = `${pp.absProjectPath}/.vscode`;
  const configSettingsFileName = `${configPath}/settings.json`;
  const configExtnFileName = `${configPath}/extensions.json`;
  const tsConfigPath = path.join(projectPath, "tsconfig.json");
  if (
    !fs.existsSync(tsConfigPath) || !isTsConfigJsxReactSet(tsConfigPath)
  ) {
    return pp;
  }
  const result: ReactProject = {
    ...pp,
    isReactProject: true,
    reactConfig: {
      tsConfigPath: tsConfigPath,
      settingsFileName: configSettingsFileName,
      extensionsFileName: configExtnFileName,
      configPathExists: (): boolean => {
        return fs.existsSync(tsConfigPath);
      },
      settingsExists: (): boolean => {
        return fs.existsSync(configSettingsFileName);
      },
      extensionsExists: (): boolean => {
        return fs.existsSync(configExtnFileName);
      },
      writeVSCodeSettings: (
        settings: reactVscodeSettings.ReactSettings,
      ): void => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(tsConfigPath)) fs.ensureDirSync(tsConfigPath);
        Deno.writeTextFileSync(
          configSettingsFileName,
          JSON.stringify(settings, undefined, 2),
        );
      },
      writeVSCodeExtensions: (extensions: vscConfig.Extension[]) => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(tsConfigPath)) fs.ensureDirSync(tsConfigPath);
        Deno.writeTextFileSync(
          configExtnFileName,
          JSON.stringify(
            vscConfig.extnRecommendations(extensions),
            undefined,
            2,
          ),
        );
      },
    },
  };
  return result;
}

export interface NodeProject extends ProjectPath {
  readonly isNodeProject: true;
  readonly nodeConfig: {
    settingsFileName: AbsoluteFsPathAndFileName;
    extensionsFileName: AbsoluteFsPathAndFileName;
    tsConfigPath: AbsoluteFsPath;
    pkgConfigPath: AbsoluteFsPath;
    esLintSettings: AbsoluteFsPathAndFileName;
    esLintIgnore: AbsoluteFsPathAndFileName;
    gitPrecommitHook: AbsoluteFsPathAndFileName;
    settingsExists: () => boolean;
    extensionsExists: () => boolean;
    configPathExists: () => boolean;
    writeVSCodeSettings: (settings: vscConfig.Settings) => void;
    writeVSCodeExtensions: (
      extensions: vscConfig.Extension[],
    ) => void;
    writePackageConfig: (settings: NodePackageConfig) => void;
    writeTypescriptConfig: (settings: TypeScriptCompilerConfig) => void;
    writeLintSettings: (
      settings: NodeESLintSettings,
      ignoreDirs: string[],
    ) => void;
  };
}

export const isNodeProject = safety.typeGuard<NodeProject>("isNodeProject");

export function enrichNodeProject(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | NodeProject {
  if (isNodeProject(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;
  const projectPath = pp.absProjectPath;
  const configPath = `${pp.absProjectPath}/.vscode`;
  const configSettingsFileName = `${configPath}/settings.json`;
  const configExtnFileName = `${configPath}/extensions.json`;
  const tsConfigPath = path.join(projectPath, "tsconfig.json");
  const pkgConfigPath = path.join(projectPath, "package.json");
  const esLintSettingsPath = `${pp.absProjectPath}/.eslintrc`;
  const esLintIgnorePath = `${pp.absProjectPath}/.eslintignore`;
  const gitTreePath = path.join(projectPath, ".git");
  const gitCheckFileName = `${gitTreePath}/hooks/pre-commit`;
  if (
    !fs.existsSync(tsConfigPath)
  ) {
    return pp;
  }
  const result: NodeProject = {
    ...pp,
    isNodeProject: true,
    nodeConfig: {
      settingsFileName: configSettingsFileName,
      extensionsFileName: configExtnFileName,
      tsConfigPath: tsConfigPath,
      pkgConfigPath: pkgConfigPath,
      esLintSettings: esLintSettingsPath,
      esLintIgnore: esLintIgnorePath,
      gitPrecommitHook: gitCheckFileName,
      configPathExists: (): boolean => {
        return fs.existsSync(tsConfigPath);
      },
      settingsExists: (): boolean => {
        return fs.existsSync(configSettingsFileName);
      },
      extensionsExists: (): boolean => {
        return fs.existsSync(configExtnFileName);
      },
      writeVSCodeSettings: (settings: vscConfig.Settings): void => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(configPath)) fs.ensureDirSync(configPath);
        Deno.writeTextFileSync(
          configSettingsFileName,
          JSON.stringify(settings, undefined, 2),
        );
      },
      writeVSCodeExtensions: (extensions: vscConfig.Extension[]) => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(configPath)) fs.ensureDirSync(configPath);
        Deno.writeTextFileSync(
          configExtnFileName,
          JSON.stringify(
            vscConfig.extnRecommendations(extensions),
            undefined,
            2,
          ),
        );
      },
      writePackageConfig: (settings: NodePackageConfig) => {
        if (!fs.existsSync(pkgConfigPath)) fs.ensureDirSync(pkgConfigPath);
        Deno.writeTextFileSync(
          pkgConfigPath,
          JSON.stringify(
            settings,
            undefined,
            2,
          ),
        );
      },
      writeTypescriptConfig: (settings: TypeScriptCompilerConfig) => {
        if (!fs.existsSync(tsConfigPath)) fs.ensureDirSync(tsConfigPath);
        Deno.writeTextFileSync(
          tsConfigPath,
          JSON.stringify(
            settings,
            undefined,
            2,
          ),
        );
      },
      writeLintSettings: (
        settings: NodeESLintSettings,
        ignoreDirs: string[],
      ) => {
        Deno.writeTextFileSync(
          esLintSettingsPath,
          JSON.stringify(settings, undefined, 2),
        );

        Deno.createSync(esLintIgnorePath);
        for (let ignore of ignoreDirs) {
          ignore += "\n";
          Deno.writeTextFileSync(
            esLintIgnorePath,
            ignore as string,
            { append: true },
          );
        }
      },
    },
  };
  return result;
}

export interface PythonProject extends ProjectPath {
  readonly isPythonProject: true;
  readonly pythonConfig: {
    settingsFileName: AbsoluteFsPathAndFileName;
    extensionsFileName: AbsoluteFsPathAndFileName;
    gitPrecommitHook: AbsoluteFsPathAndFileName;
    settingsExists: () => boolean;
    extensionsExists: () => boolean;
    writeVSCodeSettings: (settings: vscConfig.Settings) => void;
    writeVSCodeExtensions: (
      extensions: vscConfig.Extension[],
    ) => void;
  };
}

export const isPythonProject = safety.typeGuard<PythonProject>(
  "isPythonProject",
);

export function enrichPythonProject(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | PythonProject {
  if (isPythonProject(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;
  const projectPath = pp.absProjectPath;
  const configPath = `${pp.absProjectPath}/.vscode`;
  const configSettingsFileName = `${configPath}/settings.json`;
  const configExtnFileName = `${configPath}/extensions.json`;
  const pythonRequirements = path.join(projectPath, "requirements.txt");
  const pythonSetup = path.join(projectPath, "setup.py");
  const gitTreePath = path.join(projectPath, ".git");
  const gitCheckFileName = `${gitTreePath}/hooks/pre-commit`;
  if (
    !fs.existsSync(pythonSetup) && !fs.existsSync(pythonRequirements)
  ) {
    return pp;
  }
  const result: PythonProject = {
    ...pp,
    isPythonProject: true,
    pythonConfig: {
      settingsFileName: configSettingsFileName,
      extensionsFileName: configExtnFileName,
      gitPrecommitHook: gitCheckFileName,
      settingsExists: (): boolean => {
        return fs.existsSync(configSettingsFileName);
      },
      extensionsExists: (): boolean => {
        return fs.existsSync(configExtnFileName);
      },
      writeVSCodeSettings: (settings: vscConfig.Settings): void => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(configPath)) fs.ensureDirSync(configPath);
        Deno.writeTextFileSync(
          configSettingsFileName,
          JSON.stringify(settings, undefined, 2),
        );
      },
      writeVSCodeExtensions: (extensions: vscConfig.Extension[]) => {
        // we check first in case .vscode is an existing symlink
        if (!fs.existsSync(configPath)) fs.ensureDirSync(configPath);
        Deno.writeTextFileSync(
          configExtnFileName,
          JSON.stringify(
            vscConfig.extnRecommendations(extensions),
            undefined,
            2,
          ),
        );
      },
    },
  };
  return result;
}

/**
 * Take a ProjectPath and enrich it as a Deno project.
 * @param pp The ProjectPath we want to enrich as a Deno project
 * @returns the enriched ProjectPath
 */
export function forceDenoProject(pp: ProjectPath): DenoProject {
  const projectPath = pp.absProjectPath;
  const tsConfigFileName = path.join(projectPath, "tsconfig.json");
  const result: DenoProject = {
    ...pp,
    isTypeScriptProject: true,
    tsConfigFileName: fs.existsSync(tsConfigFileName)
      ? tsConfigFileName
      : undefined,
    isDenoProject: true,
    updateDepsCandidates: (): PolyglotFile[] => {
      return [
        ...guessPolyglotFiles(path.join(projectPath, "**", "mod.ts")),
        ...guessPolyglotFiles(path.join(projectPath, "**", "deps.ts")),
        ...guessPolyglotFiles(
          path.join(projectPath, "**", "deps-test.ts"),
        ),
      ];
    },
  };
  return result;
}

/**
 * Take a ProjectPath and enrich it as a Deno project if appropriate.
 * @param ctx the enrichment context
 * @param pp The ProjectPath we want to enrich as a Deno project
 * @returns the enriched ProjectPath
 */
export function enrichDenoProjectByVsCodePlugin(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | DenoProjectByVsCodePlugin {
  if (isDenoProjectByVsCodePlugin(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;

  if (isVsCodeProjectWorkTree(pp)) {
    if (pp.vsCodeConfig.configPathExists()) {
      const settingsJSON = new TypicalJsonFile(
        pp.vsCodeConfig.settingsFileName,
      );
      if (settingsJSON.fileExists) {
        const contentDict = settingsJSON.contentDict();
        if (contentDict && contentDict["deno.enable"]) {
          const result: DenoProjectByVsCodePlugin = {
            ...forceDenoProject(pp),
            isDenoProjectByVsCodePlugin: true,
          };
          return result;
        }
      }
    }
  }
  return pp;
}

// TODO: this is incomplete, needs implementation - it's designed to convert
//       a Deno project from a polyrepo into a monorepo by making all imports
//       local instead of remote.
//       # To make the libraries "local" monorepo
//       "https://denopkg.com/gov-suite/(.*?)(@.*?)/(.*?)/mod.ts"
//       ../../../$1/$3/mod.ts
//       # To make the libraries back to polyrepos
//       "https://denopkg.com/gov-suite/$1/mod.ts"

export function denoRewriteImportsAsMonoRepo(
  ctx: { projectHome: string },
  depsGlob = "**/*/deps{-test,}.ts",
): true | void {
  const matchURL = "https://denopkg.com/gov-suite/\\(.*\\)\\(@.*\\)/";
  for (const we of fs.expandGlobSync(depsGlob)) {
    if (we.isFile) {
      const relative = path.relative(ctx.projectHome, we.path);
      const relativeDirName = path.dirname(relative);
      const monoRepoLocalDest = "../".repeat(
        relativeDirName.split(path.sep).length + 1,
      );
      console.log(
        `sed -i 's!${matchURL}!${monoRepoLocalDest}\\1!g' ${relative}`,
      );
    }
  }
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

export const isNpmProject = safety.typeGuard<NpmProject>("isNpmProject");

export interface NpmPublishableProject extends NpmProject {
  readonly isNpmPublishableProject: true;
}

export const isNpmPublishableProject = safety.typeGuard<NpmPublishableProject>(
  "isNpmPublishableProject",
);

/**
 * Take a ProjectPath and enrich it as a NodeJS NPM project if appropriate.
 * @param ctx the enrichment context
 * @param pp The ProjectPath we want to enrich as a NodeJS NPM project
 * @returns the enriched ProjectPath
 */
export function enrichNpmProject(
  ctx: { absProjectPath: FsPathAndFileName },
  pp: ProjectPath,
): ProjectPath | NpmProject | NpmPublishableProject {
  if (isNpmProject(pp)) return pp;
  if (!pp.absProjectPathExists) return pp;

  const projectPath = pp.absProjectPath;
  const npmPkgConfig = new NpmPackageConfig(
    path.join(projectPath, "package.json"),
  );
  if (!npmPkgConfig.isValid) return pp;
  const regular: NpmProject = {
    ...pp,
    isNpmProject: true,
    npmPackageConfig: npmPkgConfig,
  };
  if (npmPkgConfig.isPublishable) {
    const publishable: NpmPublishableProject = {
      ...regular,
      isNpmPublishableProject: true,
    };
    return publishable;
  }
  return regular;
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
