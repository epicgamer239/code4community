import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
