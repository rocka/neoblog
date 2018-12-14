module.exports = {
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: 2018
    },
    env: {
        browser: true,
        node: true,
        commonjs: true,
        es6: true
    },
    rules: {
        semi: 'error',
        quotes: ['error', 'single', { 'avoidEscape': true }],
        'no-console': 'off'
    }
};
