import { fs } from "./deps.ts";

// Based on: https://github.com/deno-module/download

export interface Destination {
  dir?: string;
  file?: string;
  mode?: number;
}

export interface DownlodedFile {
  file: string;
  dir: string;
  fullPath: string;
  size: number;
}

export async function download(
  src: string | URL,
  dest?: Destination,
  options?: RequestInit,
): Promise<DownlodedFile> {
  let file: string;
  let fullPath: string;
  let dir: string = "";
  // deno-lint-ignore ban-types
  let mode: object = {};
  let finalUrl: string;
  let size: number;

  const response = await fetch(src, options);
  finalUrl = response.url.replace(/\/$/, "");
  if (response.status != 200) {
    return Promise.reject(
      new Deno.errors.Http(
        `${finalUrl}: status ${response.status}-'${response.statusText}' while writing to ${
          JSON.stringify(dest)
        }`,
      ),
    );
  }
  const content = await response.blob();
  size = content.size;
  const buffer = await content.arrayBuffer();
  const unit8arr = new Deno.Buffer(buffer).bytes();
  if (
    typeof dest === "undefined" || typeof dest.dir === "undefined"
  ) {
    dir = Deno.makeTempDirSync({ prefix: "vscode-team-download" });
  } else {
    dir = dest.dir;
  }
  if (
    typeof dest === "undefined" ||
    typeof dest.file === "undefined"
  ) {
    file = finalUrl.substring(finalUrl.lastIndexOf("/") + 1);
  } else {
    file = dest.file;
  }
  if (
    typeof dest != "undefined" && typeof dest.mode != "undefined"
  ) {
    mode = { mode: dest.mode };
  }

  dir = dir.replace(/\/$/, "");
  fs.ensureDirSync(dir);

  fullPath = `${dir}/${file}`;
  Deno.writeFileSync(fullPath, unit8arr, mode);
  return Promise.resolve({ file, dir, fullPath, size });
}
