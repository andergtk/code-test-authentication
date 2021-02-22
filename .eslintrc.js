module.exports = {
  env: {
    mocha: true,
    node: true,
    es6: true
  },
  extends: [
    'airbnb-base'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: [
    'mocha'
  ],
  rules: {
    'mocha/no-exclusive-tests': 'error',
    'no-console': 'off',
    'import/no-extraneous-dependencies': ['error', { 'devDependencies': ['**/*.test.js', '**/*.spec.js'] }],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single']
  }
};