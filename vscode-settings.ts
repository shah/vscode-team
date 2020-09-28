export type FontFamily = "CascadianCode NF";

export interface Settings {
  "editor.fontFamily": FontFamily;
  "explorer.openEditors.visible": number;
  "terminal.integrated.fontFamily": FontFamily;
  "editor.formatOnSave": boolean;
}

export interface DenoSettings {
  "deno.autoFmtOnSave": true;
  "deno.enable": true;
  "deno.unstable": true;
  "deno.lint": true;
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno";
  };
  "[typescriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno";
  };
}

export type ExtensionMarketplaceID = string;

export interface Extension {
  readonly marketplaceId: ExtensionMarketplaceID;
}

export interface ExtensionRecommendations {
  readonly recommendations: ExtensionMarketplaceID[];
}

export const commonSettings: Settings = {
  "editor.fontFamily": "CascadianCode NF",
  "explorer.openEditors.visible": 0,
  "terminal.integrated.fontFamily": "CascadianCode NF",
  "editor.formatOnSave": true,
};

export const denoSettings: Settings & DenoSettings = {
  ...commonSettings,
  "deno.autoFmtOnSave": true,
  "deno.enable": true,
  "deno.unstable": true,
  "deno.lint": true,
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
  },
};

export const commonExtensions: Extension[] = [
  { marketplaceId: "christian-kohler.path-intellisense" },
  { marketplaceId: "coenraads.bracket-pair-colorizer-2" },
  { marketplaceId: "shd101wyy.markdown-preview-enhanced" },
  { marketplaceId: "visualstudioexptteam.vscodeintellicode" },
  { marketplaceId: "quicktype.quicktype" },
  { marketplaceId: "axetroy.vscode-changelog-generator" },
];

export const denoExtensions: Extension[] = [
  ...commonExtensions,
  { marketplaceId: "denoland.vscode-deno" },
];

export function extnRecommendations(
  extns: Extension[],
): ExtensionRecommendations {
  return {
    recommendations: extns.map((extn) => extn.marketplaceId),
  };
}
