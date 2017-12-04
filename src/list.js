'use strict';

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class ArticleList extends EventEmitter {
    static ResolveFileName(fullName = '') {
        const regxp = /^([^.]+)\.([^.]+)$/;
        const result = regxp.exec(fullName);
        return {
            base: result[1],
            ext: result[2]
        };
    }

    constructor({ basePath, nameRegxp }) {
        super();
        if (!basePath) throw new Error('[ArticleList] basePath not specificed.');
        this.basePath = path.resolve(basePath);
        if (!nameRegxp) throw new Error('[ArticleList] nameRegxp not specificed.');
        this.nameRegxp = nameRegxp;
        /** @type {Array.<{path: string, base: string, ext: string}>} */
        this.files = [];
        fs.readdir(this.basePath, (err, files) => {
            this.files = this.resolveFiles(files);
            this.emit('change', this.files);
        });
        fs.watch(this.basePath, (type, fileName) => {
            const file = this.resolveFiles([fileName]);
            this.emit('change', [file]);
        });
    }

    resolveFiles(files) {
        return files.filter(n => n.match(this.nameRegxp))
            .map(n => {
                const meta = ArticleList.ResolveFileName(n);
                return {
                    path: path.join(this.basePath, n),
                    ...meta
                };
            });
    }
}

module.exports = ArticleList;
