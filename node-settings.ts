import { GitCommitCheckSettings } from "./git-settings.ts";
import type { Extension, Settings } from "./vscode-settings.ts";
import { commonExtensions, commonSettings } from "./vscode-settings.ts";

export const nodeSettings: Settings = {
  ...commonSettings,
};

export const nodeExtensions: Extension[] = [
  ...commonExtensions,
];

export const gitNodePrecommitCmd: GitCommitCheckSettings = `#!/bin/zsh
npm run lint`;

export interface NodeESLintSettings {
  "root": true;
  "parser": "@typescript-eslint/parser";
  "parserOptions": {
    project: "./tsconfig.json";
  };
  "plugins": [
    "@typescript-eslint",
  ];
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ];
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
