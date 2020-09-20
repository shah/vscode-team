function commandComponents(command: string): string[] {
  // split components of the command with double-quotes support
  const splitCmdRegExp = /[^\s"]+|"([^"]*)"/gi;
  const components = [];

  let match: RegExpExecArray | null;
  do {
    //Each call to exec returns the next regex match as an array
    match = splitCmdRegExp.exec(command);
    if (match != null) {
      //Index 1 in the array is the captured group if it exists
      //Index 0 is the matched text, which we use if no captured group exists
      components.push(match[1] ? match[1] : match[0]);
    }
  } while (match != null);

  return components;
}

export interface ShellCommandStatusHandler {
  (
    rawOutput: Uint8Array,
    code: number,
    runOpts: Deno.RunOptions,
  ): void;
}

export interface ShellCmdStatusReporter {
  before?(
    writer: Deno.WriterSync,
    rawOutput: Uint8Array,
    code: number,
    runOpts: Deno.RunOptions,
  ): void;
  after?(
    writer: Deno.WriterSync,
    rawOutput: Uint8Array,
    code: number,
    runOpts: Deno.RunOptions,
  ): void;
}

export function postShellCmdBlockStatusReporter(
  heading: string,
): ShellCmdStatusReporter {
  return {
    before: (
      writer: Deno.WriterSync,
    ): void => {
      // if Deno.Run produced any output, add a heading
      writer.writeSync(new TextEncoder().encode(heading + "\n"));
    },
    after: (
      writer: Deno.WriterSync,
      rawOutput: Uint8Array,
    ): void => {
      // if Deno.Run produced any output, add a blank line (otherwise nothing)
      const text = new TextDecoder().decode(rawOutput);
      if (text.trim()) {
        writer.writeSync(new TextEncoder().encode(""));
      }
    },
  };
}

export function prepShellCmdStdOutReporter(
  reporter: ShellCmdStatusReporter,
): ShellCommandStatusHandler {
  return (
    rawOutput: Uint8Array,
    code: number,
    runOpts: Deno.RunOptions,
  ): void => {
    if (reporter.before) reporter.before(Deno.stdout, rawOutput, code, runOpts);
    Deno.stdout.writeSync(rawOutput);
    if (reporter.after) reporter.after(Deno.stdout, rawOutput, code, runOpts);
  };
}

export function prepShellCmdStdErrReporter(
  reporter: ShellCmdStatusReporter,
): ShellCommandStatusHandler {
  return (
    rawOutput: Uint8Array,
    code: number,
    runOpts: Deno.RunOptions,
  ): void => {
    if (reporter.before) reporter.before(Deno.stderr, rawOutput, code, runOpts);
    Deno.stderr.writeSync(rawOutput);
    if (reporter.after) reporter.after(Deno.stderr, rawOutput, code, runOpts);
  };
}

export function shellCmdStdOutHandler(rawOutput: Uint8Array): void {
  Deno.stdout.writeSync(rawOutput);
}

export function shellCmdStdErrHandler(rawOutput: Uint8Array): void {
  Deno.stderr.writeSync(rawOutput);
}

export async function runShellCommand(
  ctx: { readonly dryRun: boolean },
  command: Deno.RunOptions | string,
  onSuccessStatus?: ShellCommandStatusHandler,
  onNonZeroStatus?: ShellCommandStatusHandler,
): Promise<void> {
  const runOpts = typeof command === "string"
    ? {
      cmd: commandComponents(command),
    }
    : command;
  if (ctx.dryRun) {
    if (runOpts.cwd) {
      console.log(`cd ${runOpts.cwd}`);
    }
    if (runOpts.env) {
      console.dir(runOpts.env);
    }
    console.log(runOpts.cmd.join(" "));
  } else {
    if (onSuccessStatus) {
      runOpts.stdout = "piped";
    }
    if (onNonZeroStatus) {
      runOpts.stderr = "piped";
    }
    const p = Deno.run(runOpts);
    const { code } = await p.status();
    if (code === 0) {
      if (onSuccessStatus) {
        onSuccessStatus(await p.output(), code, runOpts);
      }
    } else {
      if (onNonZeroStatus) {
        onNonZeroStatus(await p.stderrOutput(), code, runOpts);
      }
    }
    p.close();
  }
}
