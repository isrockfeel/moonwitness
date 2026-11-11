import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
function makeBase() {
  return [
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
}

/** @type {import("eslint").Linter.Config[]} */
function makeNode() {
  const base = makeBase();
  const tsConfig = base[2]; // tseslint.configs.recommended
  return [
    ...base,
    {
      files: ["**/*.ts", "**/*.mjs", "**/.cjs"],
      languageOptions: {
        globals: { ...globals.node },
      },
      rules: {
        ...tsConfig.rules,
        // Node.js specific strict rules
        "no-console": "warn",
        "no-restricted-syntax": ["error", "LabeledStatement", "WithStatement", "DebuggerStatement"],
        "no-debugger": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "no-use-before-define": "error",
      },
    },
  ];
}

/** @type {import("eslint").Linter.Config[]} */
function makeApi() {
  const node = makeNode();
  const tsConfig = node[3]; // the last added config in node
  return [
    ...node,
    {
      files: ["**/*.ts", "**/*.mjs"],
      languageOptions: {
        globals: { ...globals.node },
      },
      rules: {
        ...tsConfig.rules,
        // API-specific strict rules
        "no-floating-decimal": "error",
        "no-implicit-coercion": "error",
        "no-unused-expressions": "error",
        "no-extra-semi": "error",
        // comma-dangle handled by prettier
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
}

export const base = makeBase();
export const node = makeNode();
export const api = makeApi();
export default base;
