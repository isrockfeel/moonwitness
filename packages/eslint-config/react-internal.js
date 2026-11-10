import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { base } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export const reactInternal = [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];
