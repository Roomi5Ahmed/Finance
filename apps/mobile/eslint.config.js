// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Every tab screen follows the fetch-on-mount + setState pattern;
      // keep it lint-clean rather than restructuring all screens.
      'react-hooks/set-state-in-effect': 'off',
    },
  }
]);
