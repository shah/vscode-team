export interface TypeScriptCompilerConfig {
  compilerOptions: CompilerOptions;
  include: string[];
  exclude: string[];
}

export interface CompilerOptions {
  outDir: string;
  declaration: boolean;
  sourceMap: boolean;
  target: string;
  lib: string[];
  allowJs: boolean;
  skipLibCheck: boolean;
  esModuleInterop: boolean;
  allowSyntheticDefaultImports: boolean;
  strict: boolean;
  alwaysStrict: boolean;
  noImplicitAny: boolean;
  forceConsistentCasingInFileNames: boolean;
  module: string;
  moduleResolution: string;
  resolveJsonModule: boolean;
  isolatedModules: boolean;
  noEmit: boolean;
  jsx: string;
  typeRoots: string[];
  emitDecoratorMetadata: boolean;
  experimentalDecorators: boolean;
}

export function tsConfig(
  config: Partial<TypeScriptCompilerConfig>,
): TypeScriptCompilerConfig {
  return {
    compilerOptions: {
      outDir: config.compilerOptions?.outDir || "dist",
      declaration: true,
      sourceMap: true,
      target: config.compilerOptions?.target || "es6",
      lib: [
        "dom",
        "dom.iterable",
        "esnext",
      ],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      alwaysStrict: true,
      noImplicitAny: true,
      forceConsistentCasingInFileNames: true,
      module: config.compilerOptions?.module || "umd",
      moduleResolution: "node",
      resolveJsonModule: false,
      isolatedModules: true,
      noEmit: false,
      jsx: "preserve",
      typeRoots: [
        "./node_modules/@types",
      ],
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
    },
    include: [
      "**/*.ts",
    ],
    exclude: [
      "**/node_modules",
      "dist",
      "**/.*/",
    ],
  };
}
