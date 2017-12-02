'use strict';

const path = require('path');
const EventEmitter = require('events');

const Pug = require('pug');

class PageRenderer extends EventEmitter {
    constructor(
        basePath = './template',
        { layout, index, article, error } = {
            layout: 'layout.pug',
            index: 'index.pug',
            article: 'article.pug',
            error: 'error.pug'
        }
    ) {
        super();
        this.basePath = path.resolve(basePath);

        this.layoutPath = path.join(this.basePath, layout);
        this.indexPath = path.join(this.basePath, index);
        this.articlePath = path.join(this.basePath, article);
        this.errorPath = path.join(this.basePath, error);

        this.layout = Pug.compileFile(this.layoutPath);
        this.index = Pug.compileFile(this.indexPath);
        this.article = Pug.compileFile(this.articlePath);
        this.error = Pug.compileFile(this.errorPath);
    }
}

module.exports = PageRenderer;
