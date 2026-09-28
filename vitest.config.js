import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const keysDev = path.join(root, "keys.dev.js");
const tempKeysDev = path.join(root, "tempkeys.dev.js");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": root,
      // CI has no gitignored keys.dev.js — same fallback as next.config.mjs
      [keysDev]: tempKeysDev,
      "./keys.dev.js": tempKeysDev,
    },
  },
});
