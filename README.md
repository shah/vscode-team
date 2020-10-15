# Visual Studio Code Team utilities

This repo contains common Visual Studio Code and similar IDE reusable artifacts to automatically setup sandbox engineering environments for a variety of project types.

## Deno

This library requires Deno. The following instructions assume Deno is installed.

To make calling these scripts more convenient, you should add the following to your shell:

```bash
# Get the latest version of the module(s)
export VSCODE_TEAM_VERSION=`curl -s https://api.github.com/repos/shah/vscode-team/tags  | jq '.[0].name' -r`

# Setup aliases tied to the latest version
alias projectctl="deno run -A --unstable 'https://denopkg.com/shah/vscode-team@${VSCODE_TEAM_VERSION}/projectctl.ts'"
alias configctl="deno run -A --unstable 'https://denopkg.com/shah/vscode-team@${VSCODE_TEAM_VERSION}/configctl.ts'"
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
  projectctl git (setup|upgrade) [<project-home>] [--dry-run] [--verbose]
  projectctl hugo (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run][--verbose]
  projectctl react (setup|upgrade) [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
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

This will run the latest version directly from GitHub and setup your Deno project by generating `.vscode/settings.json` and `.vscode/extensions.json` from the typesafe configuration settings defined in [vscode-settings.ts](vscode-settings.ts). 

In order to use the settings, just run: 

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

To setup linter checks and formatting as Git pre-commit hooks, for example.

```bash
projectctl git setup
```

# Visual Studio Code Configuration Controller 

Visual Studio Code and other configuration settings are managed in [vscode-settings.ts](vscode-settings.ts). In order to use the settings you can run, for example, `projectctl deno setup` (see above). 

If you want to run other config-related commands, use the `configctl.ts` script:

```bash
❯ configctl --help
Visual Studio Settings Configuration Controller.

Usage:
  configctl inspect deno settings
  configctl inspect deno extensions [--recommended]
  configctl -h | --help
  configctl --version

Options:
  -h --help            Show this screen
  --version            Show version
```

## Running in any project directories:

This will run the latest version directly from GitHub and show the settings that should be put into `.vscode` (`settings.json` and `extensions.json`):

```bash
configctl inspect deno settings
configctl inspect deno extensions --recommended
```

The above commnands are helpful because the actual Deno settings are managed as type-safe content in [vscode-settings.ts](vscode-settings.ts) but VS Code expects settings to be in JSON. The `configctl` command can emit settings in JSON and other more common formats but keep the source in a type-safe language like TypeScript. 

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

* The `configctl.ts` file is newer than `projectctl.ts` and `wsctl.ts` and `configctl.ts` uses a better, more reusable, CLI infrastructure. We need to refactor `wsctl.ts` and `projectctl.ts` to use that newer structure.
* The `projectctl.ts` file is newer than `wsctl.ts` and has updated functionality at the project level that needs to be carried over to the workspace processors level. 
* Use [github.com/tsconfig/bases](https://github.com/tsconfig/bases) as good example for how to create `tsconfig.json` versions in stdlib.
* Define standard approach to using [python-shell](https://github.com/extrabacon/python-shell) to integrate Pyton scripts in from NodeJS. Consider adapting it to Deno too, see [how-to-run-a-python-script-from-deno](https://stackoverflow.com/questions/61710787/how-to-run-a-python-script-from-deno).
* Add support for [Executable Books](https://executablebooks.org) project
* Should libraries like this be managed in workspaces, Pip, or somewhere else:
  * [PyHealth](https://github.com/yzhao062/PyHealth)