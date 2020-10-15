import type {
  Extension,
  Settings,
} from "./vscode-settings.ts";
import {
  commonSettings,
  commonExtensions,
} from "./vscode-settings.ts";

export interface ReactSettings {
  "typescript.tsdk": "node_modules/typescript/lib";
  "workbench.iconTheme": "vscode-icons";
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode";
    "editor.tabSize": 2;
  };
  "typescript.updateImportsOnFileMove.enabled": "always";
  "javascript.updateImportsOnFileMove.enabled": "always";
  "vsicons.projectDetection.autoReload": true;
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode";
  };
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode";
  };
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode";
  };
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode";
  };
  "jest.autoEnable": false;
  "jest.runAllTestsFirst": false;
}

export const reactSettings: Settings & ReactSettings = {
  ...commonSettings,
  "typescript.tsdk": "node_modules/typescript/lib",
  "workbench.iconTheme": "vscode-icons",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.tabSize": 2,
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "javascript.updateImportsOnFileMove.enabled": "always",
  "vsicons.projectDetection.autoReload": true,
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
  },
  "jest.autoEnable": false,
  "jest.runAllTestsFirst": false,
};

export const reactExtensions: Extension[] = [
  ...commonExtensions,
  { marketplaceId: "dbaeumer.vscode-eslint" },
  { marketplaceId: "esbenp.prettier-vscode" },
  { marketplaceId: "msjsdiag.debugger-for-chrome" },
  { marketplaceId: "vscode-icons-team.vscode-icons" },
  { marketplaceId: "Orta.vscode-jest" },
  { marketplaceId: "eg2.vscode-npm-script" },
  { marketplaceId: "jpoissonnier.vscode-styled-components" },
];
