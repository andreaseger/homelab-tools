import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

// Base ESLint config for the monorepo.
// Projects can import and spread this in their own eslint.config.js,
// or define a fully custom config.
export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '.nx/**'],
  },
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
];
