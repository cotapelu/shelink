import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "max-lines": ["error", { "max": 300, "skipBlankLines": true, "skipComments": true }],
      "max-lines-per-function": ["error", { "max": 20, "IIFEs": true }],
      "max-statements": ["error", 30],
      "complexity": ["error", 10]
    }
  },
  // UI components (tsx) allow up to 50 lines (GOAL: UI ≤50)
  {
    files: ["**/*.tsx"],
    rules: {
      "max-lines-per-function": ["error", { "max": 50, "IIFEs": true }]
    }
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off",
      "max-statements": "off",
      "complexity": "off"
    }
  },
  globalIgnores([
    ".next/**",
    ".next-dev/**",
    ".next-build/**",
    "node_modules/**",
    "dist/**",
    "coverage/**",
    "next-env.d.ts"
  ])
]);

export default eslintConfig;
