import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // mirror tsconfig's "@/*" → "src/*" so tests can import app modules
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
