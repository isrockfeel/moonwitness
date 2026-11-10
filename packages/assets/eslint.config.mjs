import { base } from "@moonwitness/eslint-config/base";

export default [
  ...base,
  {
    ignores: ["references/**"],
  },
];
