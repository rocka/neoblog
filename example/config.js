module.exports = {
    // title of all HTML pages. Cannot be null.
    title: 'NeoBlog',
    // local server port. default to `2233` .
    port: 2233,
    // path to article directory. default to `./article` .
    articleDir: './article',
    // path to template directory. set `null` to use built-in template.
    templateDir: null,
    // plugins to load. At least an empty array.
    plugins: [
        require('./plugin/test-api-plugin')
    ],
    // arguments passed to template. can be anything but null.
    templateArgs: {
        indexHeading: 'NeoBlog\'s default template theme',
        side: {
            title: 'NeoBlog',
            items: [
                [
                    {
                        name: 'Index',
                        link: '/'
                    }
                ],
                [
                    { text: `OS: ${process.platform} ${process.arch}` },
                    { text: `Node: ${process.version}` }
                ]
            ]
        }
    }
};
