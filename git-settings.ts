import { gitNodePrecommitCmd } from "./node-settings.ts";
import { gitPythonPrecommitCmd } from "./python-settings.ts";

export enum ProjectType {
  Deno,
  Node,
  Python,
  React,
}

export type ProjectLanguageReturnType = ProjectType | undefined;
export type GitCommitCheckSettings = string | undefined;

export function gitPreCommitCheckCommands(
  language: ProjectType,
): GitCommitCheckSettings {
  let checkCmds: GitCommitCheckSettings;
  switch (language) {
    case ProjectType.Node:
      checkCmds = gitNodePrecommitCmd;
      break;
    case ProjectType.Deno:
      checkCmds = `#!/bin/zsh
  deno lint --unstable && deno fmt --check;`;
      break;
    case ProjectType.Python:
      checkCmds = gitPythonPrecommitCmd;
      break;
    default:
      return undefined;
  }
  return checkCmds;
}
