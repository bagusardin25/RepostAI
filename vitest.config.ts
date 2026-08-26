import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["backend/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@frontend": path.resolve(__dirname, "./frontend"),
      "@backend": path.resolve(__dirname, "./backend"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});