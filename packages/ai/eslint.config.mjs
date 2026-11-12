import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import baseConfig from "@moonwitness/eslint-config/base.js";

export default tseslint.config(
  baseConfig,
  {
    files: ["**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [
            { pattern: "@moonwitness/**", group: "internal", position: "after" },
          ],
          pathGroupsExcludedImportTypes: ["builtin", "external"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-unresolved": ["error", { ignore: ["^vitest"] }],
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".ts", ".js"],
        },
      },
    },
  },
);