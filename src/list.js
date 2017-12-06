'use strict';

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class ArticleList extends EventEmitter {
    constructor({ basePath, nameRegxp }) {
        super();
        if (!basePath) throw new Error('[ArticleList] basePath not specificed.');
        this.basePath = path.resolve(basePath);
        if (!nameRegxp) throw new Error('[ArticleList] nameRegxp not specificed.');
        this.nameRegxp = nameRegxp;
        /** @typedef {{path: string, base: string, ext: string}} FileMeta */
        /** @type {FileMeta[]} */
        this.files = [];
        fs.readdir(this.basePath, (err, fileNames) => {
            this.files = fileNames
                .filter(name => name.match(this.nameRegxp))
                .map(name => {
                    const meta = this.resolveFileName(name);
                    this.emit('create', meta);
                    return meta;
                });
        });
        fs.watch(this.basePath, (type, fileName) => {
            if (!fileName.match(this.nameRegxp)) return;
            /** @type {FileMeta} */
            const file = this.resolveFileName(fileName);
            switch (type) {
                // create or delete
                case 'rename':
                    fs.access(file.path, fs.constants.F_OK, (err) => {
                        if (!err) {
                            this.files.push(file);
                            this.emit('create', file);
                        } else {
                            const i = this.files.findIndex(f => f.path === file.path);
                            this.files.splice(i, 1);
                            this.emit('remove', file);
                        }
                    });
                    break;
                // modify
                case 'change':
                    this.emit('change', file);
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * parse file name into FileMeta
     * 
     * @param {string} [fileName=''] 
     * @returns {FileMeta}
     * @memberof ArticleList
     */
    resolveFileName(fileName = '') {
        const regxp = /^(([^.]+\.?)*)\.([^.]+)?$/;
        const result = regxp.exec(fileName);
        return {
            path: path.join(this.basePath, fileName),
            base: result[1],
            ext: result[3] || ''
        };
    }
}

module.exports = ArticleList;
