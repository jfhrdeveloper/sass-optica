import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores de eslint-config-next (con "**/" para que también
    // excluyan los .next/out/build anidados dentro de .claude/worktrees/):
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",
    // Worktrees locales de Claude Code, no son parte del proyecto.
    ".claude/**",
  ]),
]);

export default eslintConfig;
