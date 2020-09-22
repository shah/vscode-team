# Visual Studio Code Team utilities

This repo contains common Visual Studio Code and similar IDE reusable artifacts
to automatically setup sandbox engineering environments for a variety of
project types.

## Deno

This library requires Deno. The following instructions assume Deno is installed.
You should the following to your shell:

```bash
# Get the latest version of the module(s)
export VSCODE_TEAM_VERSION=`curl -s https://api.github.com/repos/shah/vscode-team/tags  | jq '.[0].name' -r`

# Setup aliases tied to the latest version
alias projectctl="deno run -A --unstable 'https://denopkg.com/shah/vscode-team@${VSCODE_TEAM_VERSION}/projectctl.ts'"
alias wsctl="deno run -A --unstable 'https://denopkg.com/shah/vscode-team@${VSCODE_TEAM_VERSION}/wsctl.ts'"
```

# Projects Controller `projectctl.ts`

Let's check out what the `projectctl.ts` script can do:

```bash
❯ projectctl --help
Visual Studio Team Projects Controller.

Usage:
  projectctl inspect [<project-home>]
  projectctl version [<project-home>]
  projectctl publish [<project-home>] [--semtag=<version>] [--dry-run]
  projectctl deno (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  projectctl deno update [<project-home>] [--dry-run]
  projectctl -h | --help
  projectctl --version

Options:
  -h --help            Show this screen
  --version            Show version
  <project-home>       The root of the project folder (defaults to ".")
  --tag=<tag>          A specific version of the settings to use (default: "master")
  --semtag=<version>   A specific semantic version to apply as a tag
  --dry-run            Show what will happen instead of executing
  --verbose            Be descriptive about what's going on
```

## Running in any project directories:

This will run the latest version directly from GitHub and setup your Deno project
with `.vscode` (`settings.json` and `extensions.json`):

```bash
projectctl deno setup
```

Later, to upgrade:

```bash
projectctl upgrade
```

To publish the project (tag it and push it to GitHub, for example):

```bash
projectctl deno publish
```

# Workspaces Controller `wsctl.ts`

Let's check out what the `wsctl.ts` script can do:

```bash
❯ deno-run wsctl.ts --help
Check file:///home/snshah/workspaces/github.com/shah/vscode-team/wsctl.ts
Visual Studio Team Workspaces Controller.

Usage:
  wsctl setup <workspaces-home-path> <repos-home-path> [--create-repos-path] [--dry-run] [--verbose]
  wsctl vscws inspect folders <file.code-workspace>
  wsctl vscws settings sync (deno|auto) <file.code-workspace> [--tag=<tag>] [--dry-run] [--verbose]
  wsctl vscws git clone <file.code-workspace> <repos-home-path> [--create-repos-path] [--dry-run] [--verbose]
  wsctl vscws git pull <file.code-workspace> [--dry-run]
  wsctl vscws git status <file.code-workspace> [--dry-run]
  wsctl vscws git commit <message> <file.code-workspace> [--dry-run]
  wsctl vscws git add-commit <message> <file.code-workspace> [--dry-run]
  wsctl vscws git add-commit-push <message> <file.code-workspace> [--dry-run]
  wsctl vscws npm install <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm publish <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm update <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm test <file.code-workspace> [--node-home=<path>] [--dry-run]
  wsctl vscws npm version bump (major|minor|patch) <file.code-workspace> [--no-git-tag-version] [--node-home=<path>] [--dry-run]
  wsctl vscws deno lint <file.code-workspace> [--dry-run]
  wsctl vscws deno fmt <file.code-workspace> [--dry-run]
  wsctl vscws deno test <file.code-workspace> [--dry-run]
  wsctl vscws deno update <file.code-workspace> [--dry-run]
  wsctl -h | --help
  wsctl --version

Options:
  -h --help                 Show this screen
  --version                 Show version  
  <file.code-workspace>     Visual Studio Code workspace file
  <repos-home-path>         Usually $HOME/workspaces
  --node-home=<path>        NodeJS home path (e.g. $HOME/.nvm/versions/node/v14.5.0)
  --tag=<tag>               A specific version of a repo to use (default: "master")
  --dry-run                 Show what will happen instead of executing
  --verbose                 Be descriptive about what's going on
```

# Working with Visual Studio Workspaces

To see what the `wscts.ts` command knows about a Visual Studio Code workspace, give it a `*.code-workspace` file:

```bash
cd $SANDBOX_WORKSP_HOME
wsctl vscws inspect folders gov-suite.deno.code-workspace
```

To see how `wsctl.ts` would clone folders in, say, the `gov-suite.deno.code-workspace` workspace use the following command with `--dry-run`:

```bash
cd $SANDBOX_WORKSP_HOME
wsctl vscws git clone gov-suite.deno.code-workspace $HOME/workspaces --dry-run --verbose
```

Now remove `--dry-run` to clone all folders:

```bash
cd $SANDBOX_WORKSP_HOME
wsctl vscws git clone gov-suite.deno.code-workspace $HOME/workspaces --verbose
```

# Regular usage

To automatically check `git status` in each workspace folder:

```bash
cd $SANDBOX_WORKSP_HOME
wsctl vscws git status gov-suite.deno.code-workspace
```

To run `npm update` in each workspace folder:

```bash
cd $SANDBOX_WORKSP_HOME
wsctl vscws npm update periodicals.node.code-workspace --node-home=/home/snshah/.nvm/versions/node/v14.5.0
```

# Contributing

At the momemt there are no unit tests so starting there would be great. If you make any code modifications and want to publish a new version:

* Run `projectctl version --next`
* Go into `projectctl.ts` and update the $VERSION variable (TODO: needs to be automated)
* Go into `wsctl.ts` and update the $VERSION variable (TODO: needs to be automated)

Run publish:

```bash
projectl deno publish
```

# TODO and Roadmap

* The `projectctl.ts` file is newer than `wsctl.ts` and has updated functionality at the project level that needs to be carried over to the workspace processors level. 

* Use [github.com/tsconfig/bases](https://github.com/tsconfig/bases) as good example for how to create `tsconfig.json` versions in stdlib.
* Define standard approach to using [python-shell](https://github.com/extrabacon/python-shell) to integrate Pyton scripts in from NodeJS. Consider adapting it to Deno too, see [how-to-run-a-python-script-from-deno](https://stackoverflow.com/questions/61710787/how-to-run-a-python-script-from-deno).
* Add support for [Executable Books](https://executablebooks.org) project
* Should libraries like this be managed in workspaces, Pip, or somewhere else:
  * [PyHealth](https://github.com/yzhao062/PyHealth)