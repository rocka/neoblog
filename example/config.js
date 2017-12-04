module.exports = {
    title: 'Rocka\'s Blog',
    port: 2233,
    articleDir: './article',
    plugins: [
        require('./plugin/test-api-plugin')
    ],
    templateDir: null,
    templateArgs: {
        nav: [
            {
                name: 'Rocka\'s Blog',
                link: '/'
            }
        ],
        side: [
            {
                name: 'Info',
                items: [
                    `OS: ${process.platform} ${process.arch}`,
                    `Node: ${process.version}`
                ]
            }
        ]
    }
};
