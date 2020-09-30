'use strict';

const Marked = require('marked');
const HLJS = require('highlight.js');
const EscapeHTML = require('escape-html');

const renderer = new Marked.Renderer();

renderer.image = function (href, title, text) {
    return `<figure><img src="${href}"><figcaption>${text}</figcaption></figure>`;
};

// https://github.com/markedjs/marked/issues/773#issuecomment-238095374
renderer.paragraph = function (text) {
    if (text.startsWith('<figure') && text.endsWith('</figure>')) {
        return text;
    }
    return '<p>' + text + '</p>';
};

renderer.heading = function (text, level) {
    const escaped = EscapeHTML(text).replace(/ /g, '_');
    // <h1><a id="heading" href="#heading" class="anchor">heading</a></h1>
    return `<h${level}><a id="${escaped}" href="#${escaped}" class="anchor">${text}</a></h${level}>`;
};

const NoHighlight = ['txt', 'text', 'plain'];

renderer.code = function (code, lang) {
    if (!lang || NoHighlight.includes(lang)) {
        return `<pre class="hljs"><code>${code}</code></pre>`;
    }
    /** @type {HighlightResult} */
    let result = {};
    if (HLJS.getLanguage(lang)) {
        result = HLJS.highlight(lang, code);
    } else {
        result = HLJS.highlightAuto(code);
    }
    return `<pre class="hljs"><code class="lang-${result.language}" data-language="${result.language}">${result.value}</code></pre>`;
};

renderer.table = function (header, body) {
    return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tobody></table></table>`;
};

function install(server) {
    server.parser.on('md', (src, resolve) => {
        resolve(Marked(src, { renderer }).trim());
    });
}

module.exports = {
    name: 'markdown',
    version: '0.1.0',
    description: 'neoblog bulit-in plugin, parse markdown content to HTML, including code highlight.',
    author: 'rocka <i@rocka.me>',
    install: install
};
