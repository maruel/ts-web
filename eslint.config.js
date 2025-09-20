import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'backend/coverage',
      'backend/dist',
      'backend/drizzle',
      'backend/node_modules',
      'backend/public',
      'shared/dist',
      'frontend/dist'
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      indent: ['error', 2],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
