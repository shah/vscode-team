import type { Extension, Settings } from "./vscode-settings.ts";
import { commonExtensions, commonSettings } from "./vscode-settings.ts";

export const nodeSettings: Settings = {
  ...commonSettings,
};

export const nodeExtensions: Extension[] = [
  ...commonExtensions,
];
