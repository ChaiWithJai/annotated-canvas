import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

export default defineConfig({
  plugins: [react()],
  root: "apps/web",
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true
  },
  resolve: {
    alias: [
      {
        find: /^@annotated\/ui\/styles\.css$/,
        replacement: resolve(root, "packages/ui/src/styles.css")
      },
      {
        find: "@annotated/contracts",
        replacement: resolve(root, "packages/contracts/src/index.ts")
      },
      {
        find: "@annotated/ui",
        replacement: resolve(root, "packages/ui/src/index.tsx")
      }
    ]
  }
});
