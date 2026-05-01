import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

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
        replacement: "/Users/jaybhagat/Documents/New project/packages/ui/src/styles.css"
      },
      {
        find: "@annotated/contracts",
        replacement: "/Users/jaybhagat/Documents/New project/packages/contracts/src/index.ts"
      },
      {
        find: "@annotated/ui",
        replacement: "/Users/jaybhagat/Documents/New project/packages/ui/src/index.tsx"
      }
    ]
  }
});
