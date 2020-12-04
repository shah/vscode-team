export interface Image {
  name: string;
}
export interface DenoTest {
  image: Image;
  stage: string;
  script: string[];
}

export interface GitLabCICDSettings {
  stages: string[];
  DenoTest: DenoTest;
}

export function gitLabCIConfig(
  config: Partial<GitLabCICDSettings>,
): Record<string, unknown> {
  return {
    stages: config.stages || ["testing"],
    DenoTest: config.DenoTest || {
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
  };
}
