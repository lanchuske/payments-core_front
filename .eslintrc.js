module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'dot-notation': 'error',
    'no-eval': 'error',
  },
  ignorePatterns: [
    'node_modules/**',
    'sandbox/**',
    'frontend/**',
    'dist/**',
    'build/**',
    '*.min.js',
  ],
};
