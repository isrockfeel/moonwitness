import { node } from "./node.js";

/** @type {import("eslint").Linter.Config[]} */
export const api = [
  ...node,
  {
    files: ["**/*.ts", "**/*.mjs"],
    languageOptions: {
      ...arguments[0].languageOptions,
    },
    rules: {
      ...arguments[0].rules,
      // API-specific strict rules
      "no-floating-decimal": "error",
      "no-implicit-coercion": "error",
      "no-unused-expressions": "error",
      "no-extra-semi": "error",
      "comma-dangle": "error",
      "eol-last": ["error", "always"],
      "no-trailing-spaces": "error",
      "spaced-comment": ["error", "always"],
      "object-curly-newline": "error",
      "object-shorthand": ["error", "always"],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "import" },
      ],
      "padding-line-between-statements": [
        "error",
        { blankLine: "any", prev: ["const", "let", "var"], next: "const" },
      ],
    },
  },
];