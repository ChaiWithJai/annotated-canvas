import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
