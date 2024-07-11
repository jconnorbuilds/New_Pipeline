import globals from 'globals';
import pluginJs from '@eslint/js';
import babelParser from '@babel/eslint-parser';

export default [
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, Intl: 'readonly' },
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: ['@babel/preset-env'],
        },
      },
    },
  },
  pluginJs.configs.recommended,
  {
    rules: {
      'no-unused-vars': 0,
    },
  },
];
