'use strict';

const fs = require('fs');
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
     * get excerpt of HTML string
     * 
     * @static
     * @param {string} html 
     * @returns {string}
     * @memberof ArticleParser
     */
    static excerptHTML(html) {
        const imgRegxp = /<img[^>]+>/;
        const imgTag = imgRegxp.exec(html);
        const firstImgEnd = imgRegxp.lastIndex + imgTag ? imgTag[0].length : 0;
        let firstFigEnd = html.indexOf('</figure>') + 9;
        if (firstFigEnd < firstImgEnd) firstFigEnd = firstImgEnd;
        let paraEnd = -1;
        for (let i = 0; i < 5; i++) {
            paraEnd = html.indexOf('</p>', paraEnd + 1) + 4;
        }
        let index = paraEnd;
        if (firstFigEnd >= paraEnd) index = firstFigEnd;
        return html.substr(0, index);
    }

    /** 
     * @typedef {{path: string, base: string, ext: string}} FileMeta 
     * @typedef {{title: string; date: Date; tags: string[]}} ArticleMeta
     */
    /**
     * Parse file to Article Object
     * 
     * @param {FileMeta} file 
     * @returns {null}
     * @memberof ArticleParser
     */
    async parse(file) {
        const metaRegxp = /```meta\n([^`]+)\n```/g;
        try {
            const src = (await read(file.path)).toString();
            const result = metaRegxp.exec(src);
            /** @type {ArticleMeta} */
            const meta = JSON.parse(result[1]);
            meta.date = new Date(meta.date);
            // TODO: refine markdown parse into plugin
            const html = await marked(src.replace(metaRegxp, ''));
            const excerpt = ArticleParser.excerptHTML(html);
            return { file, meta, src, html, excerpt };
        } catch (err) {
            const msg = `<pre>Error when parsing:\n${file.path}\n${err.name}\n${err.message}\n${err.stack}</pre>`;
            return {
                meta: {
                    tags: ['error'],
                    title: `Error Parsing ${file.base}.${file.ext}`,
                    date: new Date()
                },
                file,
                src: msg,
                html: msg,
                excerpt: msg
            };
        }
    }
}

module.exports = ArticleParser;
