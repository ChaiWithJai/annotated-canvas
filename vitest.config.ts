import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    include: ["apps/**/*.test.ts", "apps/**/*.test.tsx", "packages/**/*.test.ts"],
    exclude: ["apps/**/*.worker.test.ts"]
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
