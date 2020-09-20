# Visual Studio Code Team utilities

This repo contains common Visual Studio Code and similar IDE reusable artifacts
to automatically setup sandbox engineering environments for a variety of
project types.

## Deno and `teamctl.ts`

The main control utility is called `teamctl.ts` and depends on Deno. The following 
instructions assume Deno is installed and an alias `deno-run` which resolves to
`deno run -A --unstable` has been setup.

First, let's check out what the `teamctl.ts` script can do:

```bash
❯ deno-run teamctl.ts --help
Visual Studio Team Projects Controller.

Usage:
  teamctl.ts setup deno [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  teamctl.ts upgrade deno [<project-home>] [--tag=<tag>] [--dry-run] [--verbose]
  teamctl.ts -h | --help
  teamctl.ts --version

Options:
  -h --help         Show this screen
  --version         Show version
  <project-home>    The root of the project folder (usually ".")
  --tag=<tag>       A specific version of the settings to use (default: "master")
  --dry-run         Show what will happen instead of executing
  --verbose         Be descriptive about what's going on
```

# Running in any VS Code project

This will run the latest version directly from GitHub and setup your Deno project
with `.vscode` (`settings.json` and `extensions.json`):

```bash
deno-run "https://denopkg.com/shah/vscode-team/teamctl.ts" setup deno
```

Later, to upgrade:

```bash
deno-run "https://denopkg.com/shah/vscode-team/teamctl.ts" upgrade deno
```
