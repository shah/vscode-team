import { GitPrecommitScript } from "./git-settings.ts";
import type { Extension, Settings } from "./vscode-settings.ts";
import { commonExtensions, commonSettings } from "./vscode-settings.ts";

export const nodeSettings: Settings = {
  ...commonSettings,
};

export const nodeExtensions: Extension[] = [
  ...commonExtensions,
];

export interface NodePackageConfig {
  name: string;
  version: string;
  description: string;
  main: string;
  types: string;
  files: string[];
  scripts: NodePackageScriptsConfig;
  repository: {
    url: string;
  };
  publishConfig: {
    registry: string;
  };
  keywords: string[];
  author: string;
  license: string;
  dependencies: Record<string, string>;
  bugs: {
    url: string;
  };
  homepage: string;
  devDependencies: Record<string, string>;
}

export interface NodePackageScriptsConfig {
  prepublishOnly: string;
  build: string;
  test: string;
  lint: string;
}

export function nodeConfig(
  config: Partial<NodePackageConfig>,
): NodePackageConfig {
  return {
    name: config.name || "<no name provided>",
    version: config.version || "<no version provided>",
    description: config.description || "<no description provided>",
    main: "",
    types: "",
    files: [
      "dist",
    ],
    scripts: config.scripts || {
      prepublishOnly: "tsc --project tsconfig.json",
      build: "tsc --project tsconfig.json",
      test: "alsatian './**/*.spec.ts'",
      lint: "eslint . --ext .ts",
    },
    repository: config.repository || {
      url: "<no repository provided>",
    },
    publishConfig: config.publishConfig || {
      registry: "https://npm.pkg.github.com/",
    },
    keywords: [
      "url",
      "uri",
      "urn",
    ],
    author: config.author || "<no author provided>",
    license: config.license || "MIT",
    dependencies: config.dependencies || {
      "npm-package-name": "npm-package-version",
    },
    bugs: {
      url: "",
    },
    homepage: config.homepage || "<no-homepage-provided>",
    devDependencies: config.devDependencies || {
      "npm-package-name": "npm-package-version",
    },
  };
}

export const nodeGitPrecommitScript: GitPrecommitScript = `eslint . --ext .ts`;

export interface NodeESLintSettings {
  "root": true;
  "parser": string;
  "parserOptions": {
    project: string;
  };
  "plugins": string[];
  "extends": string[];
}

export const nodeESLintSettings: NodeESLintSettings = {
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    project: "./tsconfig.json",
  },
  "plugins": [
    "@typescript-eslint",
  ],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
};

export const nodeESLintIgnoreDirs: string[] = ["node_modules", "dist"];
