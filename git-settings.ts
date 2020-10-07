export type GitCommitCheckSettings = string;

export function gitPreCommitCheckCommands(): GitCommitCheckSettings {
  return `#!/bin/zsh
  deno lint --unstable && deno fmt --check;`;
}
