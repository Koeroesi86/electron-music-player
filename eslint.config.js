const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  {
    ignores: ['**/dist/**', '**/build/**', '**/out/**', 'icons/**', '.idea/**', '.cache/**', 'coverage/**', '**/node_modules/**', '**/*.js'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { '@typescript-eslint': tsPlugin, prettier: prettierPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'prettier/prettier': [
        'error',
        {
          semi: true,
          singleQuote: true,
          printWidth: 160,
          trailingComma: 'es5',
        },
        { usePrettierrc: false },
      ],
    },
  },
];
