'use strict';

const fs = require('fs');
const util = require('util');
const EventEmitter = require('events');

const YAML = require('yaml');

const read = util.promisify(fs.readFile);

class ArticleParser extends EventEmitter {
    constructor() {
        super();
    }

    /**
     * get excerpt of HTML string
     * 
     * Strategy:
     * cut before HTML string `<!-- more -->`
     * if not found:
     * find 1st image or figure end (`</img>` or `</figure>`)
     * find the 5th (or the last) paragraph end (`</p>`)
     * if figure ends before paragraph -> cut until `</figure>`
     * else -> cut until `</p>`
     * 
     * @static
     * @param {string} html 
     * @returns {string}
     */
    static excerptHTML(html) {
        const moreRegxp = /<!--[\s]*?more[\s]*?-->/i;
        const moreResult = moreRegxp.exec(html);
        if (moreResult) {
            return html.substr(0, moreResult.index);
        }
        const imgRegxp = /<img[^>]+>/;
        const imgTag = imgRegxp.exec(html);
        const firstImgEnd = imgRegxp.lastIndex + imgTag ? imgTag[0].length : 0;
        // got index of character '<'
        let firstFigEnd = html.indexOf('</figure>');
        // if found any, forward 9 to character '>'
        if (firstFigEnd > 0) firstFigEnd += 9;
        if (firstFigEnd < firstImgEnd) firstFigEnd = firstImgEnd;
        let paraEnd = -1;
        for (let i = 0; i < 5; i++) {
            // find index of character '<'
            const newEnd = html.indexOf('</p>', paraEnd + 1);
            if (newEnd >= 0) {
                // if found any, forward 4 for character '>'
                paraEnd = newEnd + 4;
            } else {
                // not found any, no '</p>' below, so break
                break;
            }
        }
        let index = paraEnd;
        if (firstFigEnd <= paraEnd && firstFigEnd > 0) index = firstFigEnd;
        return html.substr(0, index);
    }

    /**
     * convert article src to html asynchronously
     * 
     * @param {Model.ArticleFile} file file ext name
     * @param {string} src article content string
     */
    parseContent(file, src) {
        return new Promise((resolve) => {
            const eventName = file.ext;
            if (this.listenerCount(eventName) > 0) {
                this.emit(eventName, src, resolve);
            } else {
                console.log(`[ArticleParser] no parser accepts file ext ${file.ext}. Using raw output.\nFile path: ${file.path}`);
                resolve(src);
            }
        });
    }

    /**
     * Parse file to Article Object
     * 
     * @param {Model.ArticleFile} file 
     * @returns {Model.Article}
     */
    async parse(file) {
        try {
            const src = (await read(file.path)).toString().trimLeft();
            /** @type {Model.Article} */
            const article = {
                file,
                meta: null,
                src,
                html: null,
                excerpt: null,
                excerptText: null,
                excerptImg: null,
                more: false
            };
            let md = '';
            /** @type {Model.ArticleMeta} */
            let meta = null;
            if (src.startsWith('```meta')) {
                const jsonStop = src.indexOf('\n```\n', 7);
                const json = src.substring(7, jsonStop);
                meta = JSON.parse(json);
                md = src.slice(jsonStop + 5);
            } else if (src.startsWith('---')) {
                const yamlStop = src.indexOf('\n---\n', 3);
                const yaml = src.substring(3, yamlStop);
                meta = YAML.parse(yaml);
                md = src.slice(yamlStop + 5);
            }
            meta.date = new Date(meta.date);
            article.meta = meta;
            article.html = await this.parseContent(file, md);
            article.excerpt = meta.excerpt || ArticleParser.excerptHTML(article.html);
            article.excerptText = meta.excerpt || article.excerpt.replace(/<[^>]+>/g, '').slice(0, 150);
            article.excerptImg = meta.img || (article.html.match(/<img.+?src="([^"]+)"/) || [])[1];
            article.more = article.excerpt.length < article.html.length;
            return article;
        } catch (err) {
            const msg = `<pre class="hljs"><code>Error when parsing:\n${file.path}\n\n${err.stack}</code></pre>`;
            return {
                meta: {
                    tags: ['error'],
                    title: `Error Parsing ${file.base}.${file.ext}`,
                    date: new Date()
                },
                file,
                src: msg,
                html: msg,
                excerpt: msg,
                excerptText: msg,
                excerptImg: '',
                more: false
            };
        }
    }

    destroy() {
        this.removeAllListeners();
    }
}

module.exports = ArticleParser;
