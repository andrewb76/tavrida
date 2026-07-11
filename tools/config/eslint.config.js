import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import globals from 'globals';

export default defineConfigWithVueTs(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/dist-test/',
      '**/.turbo/',
      '**/.vite/',
      '**/.vscode/',
      '**/.gigacode/',
    ],
  },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      // Match vue --fix formatting so new .vue code stays consistent in CI.
      'vue/max-attributes-per-line': ['warn', { singleline: 3, multiline: 1 }],
      'vue/singleline-html-element-content-newline': 'warn',
      'vue/html-self-closing': [
        'warn',
        {
          html: { void: 'never', normal: 'always', component: 'always' },
          svg: 'always',
          math: 'always',
        },
      ],
    },
  },
);
