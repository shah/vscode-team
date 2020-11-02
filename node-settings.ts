import { GitCommitCheckSettings } from "./git-settings.ts";
import type { Extension, Settings } from "./vscode-settings.ts";
import { commonExtensions, commonSettings } from "./vscode-settings.ts";

export const nodeSettings: Settings = {
  ...commonSettings,
};

export const nodeExtensions: Extension[] = [
  ...commonExtensions,
];

export interface NodeNPMConfig {
  name: string;
  version: string;
  description: string;
  main: string;
  types: string;
  files: string[];
  scripts: {
    "prepublishOnly": "tsc --project tsconfig.json";
    "build": "tsc --project tsconfig.json";
    "test": "alsatian './**/*.spec.ts'";
    "lint": "eslint . --ext .ts";
  };
  repository: {
    url: string;
  };
  publishConfig: {
    registry: string;
  };
  keywords: string[];
  author: string;
  license: string;
  dependencies: {
    "content-disposition": "^0.5.3";
    "file-type": "^14.7.1";
    "jsdom": "^16.4.0";
    "uuid": "^8.3.0";
    "whatwg-mimetype": "^2.3.0";
  };
  bugs: {
    url: string;
  };
  homepage: string;
  devDependencies: {
    "@types/node": "^14.0.26";
    "alsatian": "^3.2.1";
    "ts-node": "^8.10.2";
    "typescript": "^3.9.7";
  };
}

export interface Scripts {
  "prepublishOnly": string;
  "build": string;
  "test": string;
  "lint": string;
}

export const defaultNodeConfig: NodeNPMConfig = {
  name: "",
  version: "",
  description: "",
  main: "",
  types: "",
  files: [
    "dist",
  ],
  scripts: {
    "prepublishOnly": "tsc --project tsconfig.json",
    "build": "tsc --project tsconfig.json",
    "test": "alsatian './**/*.spec.ts'",
    "lint": "eslint . --ext .ts",
  },
  repository: {
    "url": "",
  },
  publishConfig: {
    "registry": "https://npm.pkg.github.com/",
  },
  keywords: [
    "url",
    "uri",
    "urn",
  ],
  author: "",
  license: "MIT",
  dependencies: {
    "content-disposition": "^0.5.3",
    "file-type": "^14.7.1",
    "jsdom": "^16.4.0",
    "uuid": "^8.3.0",
    "whatwg-mimetype": "^2.3.0",
  },
  bugs: {
    "url": "",
  },
  homepage: "",
  devDependencies: {
    "@types/node": "^14.0.26",
    "alsatian": "^3.2.1",
    "ts-node": "^8.10.2",
    "typescript": "^3.9.7",
  },
};

export const gitNodePrecommitCmd: GitCommitCheckSettings = `#!/bin/zsh
eslint . --ext .ts`;

export const nodeESlintTSDependency = `npm install typescript --save-dev`;
export const nodeESLint =
  `npm install eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin --save-dev`;

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
