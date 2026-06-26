import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'scripts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The filter engine must never import display/FX helpers — keeps "FX is display-only" structural.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/data/schema', '**/data/schema'],
              message: 'zod schema is build-only (dev/vitest). Do not import it into runtime code.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests legitimately exercise the build-only zod schema.
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/lib/filter.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/currency',
              importNames: ['displayBand', 'fxApprox', 'formatSalary', 'FX', 'USD_TO_RUB', 'EUR_TO_RUB'],
              message: 'filter.ts may only import marketBand from currency — FX is display-only.',
            },
          ],
        },
      ],
    },
  },
)
