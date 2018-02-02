'use strict';

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const _ = {
    uniqBy: require('lodash.uniqby'),
    differenceBy: require('lodash.differenceby'),
    intersectionBy: require('lodash.intersectionby')
};

/** 
 * @typedef {{path: string, base: string, ext: string}} FileMeta
 */

class ArticleList extends EventEmitter {
    constructor({ basePath, nameRegxp }) {
        super();
        if (!basePath) throw new Error('[ArticleList] basePath not specificed.');
        this.basePath = path.resolve(basePath);
        if (!nameRegxp) throw new Error('[ArticleList] nameRegxp not specificed.');
        /** @type {RegExp} */
        this.nameRegxp = nameRegxp;
        /** @type {NodeJS.Timer} */
        this.emitTimer = null;
        /** @type {FileMeta[]} */
        this.files = [];
        /** @type {FileMeta[]} */
        this._changedList = [];
        this._init();
    }

    _init() {
        this.readFiles()
            .then(files => {
                files.forEach(file => this.emit('create', file));
                this.files = files;
            });
        fs.watch(this.basePath, (type, fileName) => {
            if (!fileName.match(this.nameRegxp)) return;
            const file = this.resolveFileName(fileName);
            if (type === 'change') {
                this._changedList.push(file);
                this._changedList = _.uniqBy(this._changedList, 'base');
            }
            if (!this.emitTimer) {
                this.emitTimer = this.createEmitTimer();
            } else {
                clearTimeout(this.emitTimer);
                this.emitTimer = this.createEmitTimer();
            }
        });
    }

    /**
     * parse file name into FileMeta
     * 
     * @param {string} [fileName=''] 
     * @returns {FileMeta}
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

    /**
     * Parse file matches `nameRegxp` under `bathPath` to `FileMeta[]`
     * 
     * @returns {Promise<FileMeta[]>}
     */
    async readFiles() {
        return new Promise((resolve, reject) => {
            fs.readdir(this.basePath, (err, fileNames) => {
                if (err) {
                    reject(err);
                } else {
                    /** @type {FileMeta[]} */
                    const files = fileNames
                        .filter(name => name.match(this.nameRegxp))
                        .map(this.resolveFileName.bind(this));
                    resolve(files);
                }
            });
        });
    }

    /**
     * Create a timer to emit file events after given timeout.
     * Default timeout is `500ms`
     * 
     * @param {number} [timeout=500] 
     * @returns {NodeJS.Timer}
     */
    createEmitTimer(timeout = 500) {
        return setTimeout((async () => {
            this.emitTimer = null;
            const newFiles = await this.readFiles();
            const eventsList = {
                create: _.differenceBy(newFiles, this.files, 'base'),
                remove: _.differenceBy(this.files, newFiles, 'base'),
                change: _.intersectionBy(newFiles, this._changedList, 'base')
            };
            Object.entries(eventsList)
                .forEach(([type, array]) => {
                    array.forEach(ev => this.emit(type, ev));
                    eventsList[type] = [];
                });
        }).bind(this), timeout);
    }
}

module.exports = ArticleList;
