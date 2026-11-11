import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export const node = [
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.mjs", "**/.cjs"],
    languageOptions: {
      ...arguments[0].languageOptions,
    },
    rules: {
      ...arguments[0].rules,
      // Node.js specific strict rules
      "no-console": "warn",
      "no-restricted-syntax": [
        "error",
        "LabeledStatement",
        "WithStatement",
        "DebuggerStatement",
      ],
      "no-debugger": "error",
      "no-unused-vars": "error",
      "no-use-before-define": "error",
    },
  },
];