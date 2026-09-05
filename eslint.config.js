// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/*"]),
  expoConfig,
  {
    files: ["babel.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
