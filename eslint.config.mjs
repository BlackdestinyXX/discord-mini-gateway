import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    rules: {
      quotes: ['error', 'single'], // Forza l'uso delle single quotes
    }
  },
  {files: ['**/*.{js,mjs,cjs,ts}']},
  {files: ['**/*.js'], languageOptions: {sourceType: 'script'}},
  {languageOptions: { globals: globals.browser }},
  ...tseslint.configs.recommended,
];
