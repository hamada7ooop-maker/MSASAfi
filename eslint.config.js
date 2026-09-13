import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "android/**",
      "ios/**",
      "node_modules/**",
      "public/**",
      "scripts/**",
      "src/locales/**",
      "src/translations.js",
      "coverage/**",
      "*.zip",
      "*.apk"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        t: "readonly",
        db: "readonly",
        state: "readonly",
        capacitorExports: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrors": "none" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
      "no-undef": "off",
      "no-empty": ["warn", { "allowEmptyCatch": true }],
      "no-useless-assignment": "off",
      "no-control-regex": "off",
      "no-useless-escape": "off",
      "prefer-const": "warn",
      "no-case-declarations": "off",
      // Promoted from "warn" to "error" once the 12 outstanding suppressions
      // in application code were resolved (L-7). As a warning it could not
      // fail a build, so stale dependency arrays accumulated silently — and
      // three of them turned out to be real staleness bugs. The arcade games
      // keep their suppressions (see the override below); they are
      // self-contained game loops, not financial screens.
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-imports": ["error", {
        "paths": [
          { "name": "@/db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "../db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "../../db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "../../../db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "../../../../db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "./db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "./src/db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "../src/db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "../../src/db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" },
          { "name": "../../../src/db", "message": "استورد مباشرة من @/core/db/core أو @/core/db/repositories/*" }
        ]
      }]
    }
  }
);
