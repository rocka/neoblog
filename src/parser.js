'use strict';

const fs = require('fs');
const util = require('util');

const read = util.promisify(fs.readFile);

// TODO: refine markdown parse into plugin
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
    constructor() {
        this.renderer = new Marked.Renderer({ breaks: true });
        this.renderer.image = function (href, title, text) {
            return `<figure><img src="${href}"><figcaption>${text}</figcaption></figure>`;
        };
        this.renderer.code = function (code, lang) {
            const hl = Highlight.highlight(lang, code).value;
            return `<pre class="hljs"><code class="lang-${lang}">${hl}</code></pre>`;
        };
        Marked.setOptions({ renderer: this.renderer });
    }

    /**
     * Parse file to Article Object
     * 
     * @param {{path: string, base: string, ext: string}} file 
     * @returns {null}
     * @memberof ArticleParser
     */
    async parse(file) {
        const metaRegxp = /```meta\n([^`]+)\n```/g;
        try {
            const src = (await read(file.path)).toString();
            const result = metaRegxp.exec(src);
            /** @type {{baseName: string; title: string; date: string; tags: string[]}} */
            const meta = JSON.parse(result[1]);
            meta.baseName = file.base;
            let html = await marked(src.replace(metaRegxp, ''));
            html = `<h1>${meta.title}</h1>${html}`;
            return { src, html, meta };
        } catch (err) {
            return {
                html: `<pre>Error when parsing:\n${file.path}\n${err.name}\n${err.message}\n${err.stack}</pre>`,
                meta: {
                    baseName: file.base,
                    tags: ['error'],
                    title: `Error Parsing ${file.path}`,
                    date: new Date().toISOString()
                }
            };
        }
    }
}

module.exports = ArticleParser;
