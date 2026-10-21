import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `workbench/**` holds the Workbench control surface: Markdown plus
  // receipt-backed managed runtime tools that must never be hand-edited.
  // It is not application source, so it is linted upstream, not here.
  { ignores: ["dist/**", "node_modules/**", "data/**", "outputs/**", "tools/**", "workbench/**", "design/**", "output/playwright/**", ".tmp-workbook-inspect/**", "src/**/*.js", "src/**/*.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    files: ["src/server/**/*.ts", "src/domain/**/*.ts", "tests/**/*.ts", "*.config.ts"],
    languageOptions: { globals: globals.node },
  },
);
