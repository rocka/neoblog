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
        let cached = this.renderCache.get(name);
        if (!cached) {
            cached = Pug.compileFile(path.join(this.basePath, `${name}.pug`));
            this.renderCache.set(name, cached);
        }
        return cached({ ...this.baseLocals, ...locals });
    }
}

module.exports = PageRenderer;
