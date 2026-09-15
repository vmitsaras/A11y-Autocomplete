import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    datalist: "./src/datalist.ts",
    "addons/form-validator": "./src/addons/form-validator.ts",
    "addons/tag-input": "./src/addons/tag-input.ts",
    docs: "./src/docs.ts",
    diagnostics: "./src/diagnostics.ts"
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  platform: "neutral",
  outDir: "dist"
});
