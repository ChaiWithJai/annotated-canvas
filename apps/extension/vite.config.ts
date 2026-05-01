import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "apps/extension",
  build: {
    outDir: "../../dist/extension",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: "apps/extension/sidepanel.html",
        "service-worker": "apps/extension/src/service-worker.ts",
        "content-script": "apps/extension/src/content-script.ts"
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
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
