import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  fmt: {
    ignorePatterns: ["dist/**"],
    semi: true,
    singleQuote: false,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: ["dist/**"],
    plugins: ["eslint", "typescript", "oxc", "react", "jsx-a11y", "vitest"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "warn",
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
