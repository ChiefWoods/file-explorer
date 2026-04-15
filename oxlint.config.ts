import { defineConfig } from "oxlint";

export default defineConfig({
  $schema: "./node_modules/oxlint/configuration_schema.json",
  ignorePatterns: ["dist", "src/routeTree.gen.ts", "src/components/ui/**"],
  jsPlugins: [{ name: "tailwindcss", specifier: "eslint-plugin-tailwindcss" }],
  settings: {
    tailwindcss: {
      config: {},
    },
  },
  rules: {
    "tailwindcss/classnames-order": "error",
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: ["typescript", "react"],
      env: {
        es2020: true,
        browser: true,
      },
    },
  ],
});
