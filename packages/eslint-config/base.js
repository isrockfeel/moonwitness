import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export const base = [
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
];

/** @type {import("eslint").Linter.Config[]} */
export const node = [
  ...base,
  {
    files: ["**/*.ts", "**/*.mjs", "**/.cjs"],
    languageOptions: {
      ...base[2].languageOptions,
    },
    rules: {
      ...base[2].rules,
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

/** @type {import("eslint").Linter.Config[]} */
export const next = [
  ...base,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ...tseslintPluginReact.configs.recommended,
    languageOptions: {
      ...base[2].languageOptions,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...base[2].rules,
      ...tseslintPluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-target-blank": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/jsx-no-bind": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];

/** @type {import("eslint").Linter.Config[]} */
export const api = [
  ...node,
  {
    files: ["**/*.ts", "**/*.mjs"],
    languageOptions: {
      ...base[2].languageOptions,
    },
    rules: {
      ...base[2].rules,
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
