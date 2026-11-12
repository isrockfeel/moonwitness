export default [
  {
    ignores: ['dist/', 'node_modules/', '.turbo/', '*.config.*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    settings: {
      react: {
        version: '19',
      },
    },
    plugins: {
      react: await import('eslint-plugin-react'),
      'react-hooks': await import('eslint-plugin-react-hooks'),
      '@typescript-eslint': await import('typescript-eslint'),
    },
    rules: {
      ...(await import('eslint-plugin-react')).configs.recommended.rules,
      ...(await import('eslint-plugin-react-hooks')).configs.recommended.rules,
      ...(await import('typescript-eslint')).configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];