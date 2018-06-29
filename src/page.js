'use strict';

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const Pug = require('pug');

class PageRenderer extends EventEmitter {
    constructor({ basePath, baseLocals }) {
        super();
        if (!basePath) throw new Error('[PageRenderer] basePath not specified.');
        this.basePath = path.resolve(basePath);
        if (!baseLocals) throw new Error('[PageRenderer] baseLocals not specified.');
        this.baseLocals = {
            ...baseLocals,
            assets: name => `/assets/${name}`,
            permalink(host = '', path = '') {
                if (!path) return '';
                if (path.match(/^https?:/)) return path;
                if (path.startsWith('//')) return `http:${path}`;
                if (path[0] !== '/') path = `/${path}`;
                return `http://${host}${path}`;
            },
            oneOf(a) {
                if (Array.isArray(a)) return a[Math.floor(Math.random() * a.length)];
                return a;
            },
            firstTruely(...args) {
                for (const i of args) {
                    if (i) return i;
                }
            },
            formatDate(dt) {
                if (!(dt instanceof Date)) dt = new Date(dt);
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
        this.watcher = fs.watch(basePath, (event, filename) => {
            if (Reflect.ownKeys(Pug.cache).length) {
                console.log(`[PageRenderer] ${event}: ${filename}, clear cache`);
                Pug.cache = {};
            }
        });
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

    destroy() {
        Pug.cache = {};
        this.watcher.close();
    }
}

module.exports = PageRenderer;
