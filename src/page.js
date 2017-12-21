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

    /**
     * render template file to HTML string with locals
     * 
     * @param {string} name template file name or absolute path
     * @param {any} locals pug template locals
     */
    render(name, locals = {}) {
        if (!path.isAbsolute(name)) {
            name = path.join(this.basePath, name);
        }
        return Pug.renderFile(name, {
            cache: true,
            ...this.baseLocals,
            ...locals
        });
    }
}

module.exports = PageRenderer;
