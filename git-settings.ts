export type GitPrecommitScript = string | string[];

export interface GitCommitCheckDefn {
  readonly scriptLanguage: "/bin/bash" | "/bin/zsh" | "deno";
  readonly script: string | string[];
}
