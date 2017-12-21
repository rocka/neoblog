'use strict';

const path = require('path');
const EventEmitter = require('events');

const Pug = require('pug');

class PageRenderer extends EventEmitter {
    constructor({ basePath, baseLocals }) {
        super();
        if (!basePath) throw new Error('[PageRenderer] basePath not specificed.');
        this.basePath = path.resolve(basePath);
        if (!baseLocals) throw new Error('[PageRenderer] baseLocals not specificed.');
        this.baseLocals = {
            ...baseLocals,
            assets: name => `/assets/${name}`
        };
        this.renderCache = new Map();
    }

    render(name, locals) {
        const fullPath = path.join(this.basePath, `${name}.pug`);
        return Pug.renderFile(fullPath, {
            cache: true,
            ...this.baseLocals,
            ...locals
        });
    }
}

module.exports = PageRenderer;
