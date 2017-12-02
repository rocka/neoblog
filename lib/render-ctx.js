'use strict';

class RenderContext {
    /**
     * constructor of RenderContext
     * @param {{articles: any[], pageOffset: number, pageSize: number, head: any[], content: any[]}} options 
     */
    constructor(options) {
        /** @typedef {{baseName: string; title: string; date: string; tags: string[]}} ArticleMeta */
        /** @type {Array.<{src: string; html: string; meta: ArticleMeta}>} */
        this.articles = options.articles || [];
        this.pageOffset = options.articles || 0;
        this.pageSize = options.pageSize || 10;
        this.head = options.head || [];
        this.content = options.content || [];
    }
}

module.exports = RenderContext;
