export interface GitLabCICDSettings {
  cicdConfigProperties: Record<string, unknown>;
}

export function gitLabCIConfig(
  config: Partial<GitLabCICDSettings>,
): GitLabCICDSettings {
  return {
    cicdConfigProperties: config.cicdConfigProperties || {
      stages: ["testing"],
      DenoTest: {
        image: { name: "hayd/deno:latest" },
        stage: "testing",
        script: [
          "deno --version",
          "deno info",
          "deno lint --unstable",
          "deno fmt --unstable",
          "deno test -A --unstable",
        ],
      },
    },
  };
}
