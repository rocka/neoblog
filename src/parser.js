'use strict';

const fs = require('fs');
const util = require('util');
const EventEmitter = require('events');

const read = util.promisify(fs.readFile);

/** 
 * @typedef {{path: string, base: string, ext: string}} FileMeta 
 * @typedef {{title: string; date: Date; tags: string[]}} ArticleMeta
 */

class ArticleParser extends EventEmitter {
    constructor() {
        super();
    }

    /**
     * get excerpt of HTML string
     * 
     * Strategy:
     * first find 1st image or figure ('</figure>)
     * then find the 5th (if not more than 5 paragraph, just the last) paragraph end ('</p>')
     * figure ends before paragraph -> cut until </figure>
     * 5th paragraph ends before figure -> cut until </p>
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
     * @param {FileMeta} file file ext name
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
     * @param {FileMeta} file 
     * @returns {Article}
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
            const html = (await this.parseContent(file, src.replace(metaRegxp, ''))).trim();
            const excerpt = ArticleParser.excerptHTML(html);
            const more = excerpt.length < html.length;
            return { file, meta, src, html, excerpt, more };
        } catch (err) {
            const msg = `<pre>Error when parsing:\n${file.path}\n\n${err.stack}</pre>`;
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
                more: false
            };
        }
    }
}

module.exports = ArticleParser;
