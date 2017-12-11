'use strict';

const escapeHTML = require('escape-html');

function install(server) {
    server.parser.on('txt', (src, resolve) => {
        resolve(`<pre>${escapeHTML(src)}</pre>`);
    });
}

module.exports = {
    name: 'parse-txt-article',
    version: '0.1.0',
    description: 'neoblog plugin example for parsing txt file content to html.',
    author: 'rocka <i@rocka.me>',
    install: install
};
