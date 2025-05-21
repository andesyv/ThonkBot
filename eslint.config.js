import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import parser from '@typescript-eslint/parser';
import tslintprettier from '@typescript-eslint/eslint-plugin';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

export default [
  js.configs.recommended,
  ...compat.extends('plugin:@typescript-eslint/recommended'), // "@typescript-eslint/eslint-plugin"
  prettierRecommended,
  {
    languageOptions: {
      // sourceType: "commonjs"
      sourceType: 'module',
      parser: parser
    },
    plugins: {
      tslintprettier: tslintprettier
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    ignores: ['node_modules/*', '*/**/*.js', 'ecosystem.config.cjs']
  }
];
