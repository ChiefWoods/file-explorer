import { defineConfig } from "oxlint";

export default defineConfig({
  $schema: "./node_modules/oxlint/configuration_schema.json",
  ignorePatterns: [
    "dist",
    "src/routeTree.gen.ts",
    "src/components/ui/**",
    ".output/**",
    "generated/**",
  ],
  jsPlugins: [
    {
      name: "tailwindcss",
      specifier: "eslint-plugin-tailwindcss",
    },
    {
      name: "react-doctor",
      specifier: "react-doctor/oxlint-plugin",
    },
  ],
  settings: {
    tailwindcss: {
      config: {},
    },
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
