module.exports = {
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: 8,
        ecmaFeatures: {
            impliedStrict: true,
            experimentalObjectRestSpread: true
        }
    },
    env: {
        browser: true,
        node: true,
        commonjs: true,
        es6: true
    },
    rules: {
        semi: 'error',
        quotes: ['error', 'single']
    }
};
