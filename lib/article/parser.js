'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

const read = util.promisify(fs.readFile);

const Marked = require('marked');
const Highlight = require('highlight.js');

/**
 * convert markdown to html asynchronously
 * @param {string} src markdown string
 * @param {marked.MarkedOptions} opts 
 */
function marked(src, opts) {
    return new Promise((resolve, reject) => {
        Marked(src, opts, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

class ArticleParser {
    constructor(basePath = './userdata/article') {
        this.basePath = path.resolve(basePath);
        this.renderer = new Marked.Renderer({ breaks: true });
        this.renderer.image = function (href, title) {
            return `<figure><img src="${href}"><figcaption>${title}</figcaption></figure>`;
        };
        this.renderer.code = function (code, lang) {
            const hl = Highlight.highlight(lang, code).value;
            return `<pre><code class="hljs lang-${lang}">${hl}</code></pre>`;
        };
        Marked.setOptions({ renderer: this.renderer });
    }

    async parse(fileName) {
        const metaRegxp = /```meta\n([^`]+)\n```/g;
        const fullPath = path.join(this.basePath, fileName);
        const baseName = fileName.replace(/\.([a-zA-Z0-9]){1,4}$/g, '');
        try {
            const src = (await read(fullPath)).toString();
            const result = metaRegxp.exec(src);
            /** @type {{baseName: string; title: string; date: string; tags: string[]}} */
            const meta = JSON.parse(result[1]);
            meta.baseName = baseName;
            let html = await marked(src.replace(metaRegxp, ''));
            html = `<h1>${meta.title}</h1>${html}`;
            return { src, html, meta };
        } catch (err) {
            return {
                html: `<pre>Error when parsing:\n${fullPath}\n${err.name}\n${err.message}\n${err.stack}</pre>`,
                meta: {
                    baseName,
                    tags: ['error'],
                    title: `Error Parsing ${fileName}`,
                    date: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = ArticleParser;
