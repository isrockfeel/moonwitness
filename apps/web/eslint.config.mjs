import { next } from "@moonwitness/eslint-config/next";

export default [
  ...next,
  {
    ignores: [".next/**", "out/**", "next-env.d.ts", "postcss.config.mjs"],
  },
];
