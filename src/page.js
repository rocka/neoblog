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
            assets: name => `/assets/${name}`,
            formatDate(dt) {
                if (!(dt instanceof Date)) {
                    dt = new Date(dt);
                }
                return dt.toLocaleDateString('zh', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    hour12: false,
                    minute: '2-digit'
                });
            },
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
