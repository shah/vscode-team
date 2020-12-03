export interface RunsOn {
  "runs-on": string;
}

export interface Steps {
  steps: ({
    name: string;
    uses: string;
  } | {
    name: string;
    run: string;
  })[];
}

export interface Test {
  "runs-on": string;
  strategy: { [key: string]: unknown };
  steps: { [key: string]: unknown };
}

export interface Matrix {
  deno: string[];
}

export interface Strategy {
  matrix: Matrix;
}

export interface OnEvent {
  push: { branches: string };
  pull_request: { branches: string };
}

export interface Jobs {
  test: Test;
}

export interface GitHubActionsSettings {
  name: string;
  on: { [key: string]: unknown };
  jobs: { [key: string]: unknown };
}

export function gitHubActionsConfig(
  config: Partial<GitHubActionsSettings>,
): Record<string, unknown> {
  return {
    name: config.name || "Deno",
    on: config.on || {
      push: { branches: "main" },
      pull_request: { branches: "main" },
    },
    jobs: config.jobs || {
      test: {
        "runs-on": "ubuntu-latest",
        strategy: {
          matrix: { deno: ["v1.x", "nightly"] },
        },
        steps: [
          { name: "Setup repo", uses: "actions/checkout@v2" },
          {
            name: "Install Deno and execute unit testing",
            run: `curl -fsSL https://deno.land/x/install/install.sh | sh &&
                    export PATH=$PATH:/home/runner/.deno/bin; deno --version; deno info; deno lint --unstable && deno fmt --unstable && deno test -A --unstable;`,
          },
        ],
      },
    },
  };
}
