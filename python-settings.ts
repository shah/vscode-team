import { GitPrecommitScript } from "./git-settings.ts";
import type { Extension, Settings } from "./vscode-settings.ts";
import { commonExtensions, commonSettings } from "./vscode-settings.ts";

export interface PythonSettings {
  "explorer.openEditors.visible": 0;
  "terminal.integrated.shell.linux": "/bin/zsh";
  "terminal.integrated.fontFamily": "CascadianCode NF";
  "python.formatting.provider": "black";
  "python.formatting.blackArgs": ["--line-length", "100"];
  "python.linting.enabled": true;
  "python.linting.pylintEnabled": false;
  "python.linting.mypyEnabled": true;
  "python.linting.lintOnSave": true;
}

export const pythonSettings: Settings & PythonSettings = {
  ...commonSettings,
  "explorer.openEditors.visible": 0,
  "terminal.integrated.shell.linux": "/bin/zsh",
  "terminal.integrated.fontFamily": "CascadianCode NF",
  "python.formatting.provider": "black",
  "python.formatting.blackArgs": ["--line-length", "100"],
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.mypyEnabled": true,
  "python.linting.lintOnSave": true,
};

export const pythonExtensions: Extension[] = [
  ...commonExtensions,
  { marketplaceId: "ms-python.python" },
  { marketplaceId: "ms-python.vscode-pylance" },
  { marketplaceId: "mechatroner.rainbow-csv" },
  { marketplaceId: "esbenp.prettier-vscode" },
  { marketplaceId: "eamodio.gitlens" },
  { marketplaceId: "bungcip.better-toml" },
];

export const pythonGitPrecommitScript: GitPrecommitScript =
  `find . -type f -name "*.py" | xargs pylint `;
