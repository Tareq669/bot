module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Possible Errors
    'no-console': 'off', // Allow console for logging
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],

    // Best Practices
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-with': 'error',
    'prefer-promise-reject-errors': 'error',

    // Variables
    'no-shadow': 'warn',
    'no-undef-init': 'error',

    // Stylistic Issues
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],

    // ES6
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'warn',

    // Node.js specific
    'callback-return': 'warn',
    'handle-callback-err': 'warn',
    'no-path-concat': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'logs/',
    '*.log'
  ]
};
