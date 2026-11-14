import { reactInternal } from "@moonwitness/eslint-config/react-internal";

export default [
  ...reactInternal,
  {
    ignores: ["dist/**", "src-tauri/**", "node_modules/**"],
  },
];
