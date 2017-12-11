'use strict';

const Marked = require('marked');
const HLJS = require('highlight.js');

const renderer = new Marked.Renderer({ breaks: true });

renderer.image = function (href, title, text) {
    return `<figure><img src="${href}"><figcaption>${text}</figcaption></figure>`;
};

renderer.heading = function (text, level) {
    const escapedText = text.replace(/[^\w]+/g, '-');
    // <h1><a name="heading" href="#heading" class="anchor"><span class="header-link">heading</span></a></h1>
    return `<h${level}><a name="${escapedText}" href="#${escapedText}" class="anchor"><span class="header-link">${text}</span></a></h${level}>`;
};

renderer.code = function (code, lang) {
    /** @type {hljs.IHighlightResultBase} */
    let result = {};
    if (lang) {
        result = HLJS.highlight(lang, code);
    } else {
         result = HLJS.highlightAuto(code);
    }
    return `<pre class="hljs"><code class="lang-${result.language}" data-language="${result.language}">${result.value}</code></pre>`;
};

Marked.setOptions({ renderer: renderer });

function install(server) {
    server.parser.on('md', (src, resolve) => {
        resolve(Marked(src));
    });
}

module.exports = {
    name: 'markdown',
    version: '0.1.0',
    description: 'neoblog bulit-in plugin, parse markdown content to HTML, including code highlight.',
    author: 'rocka <i@rocka.me>',
    install: install
};
