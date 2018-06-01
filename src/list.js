'use strict';

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const _ = {
    uniqBy: require('lodash.uniqby'),
    differenceBy: require('lodash.differenceby'),
    intersectionBy: require('lodash.intersectionby')
};

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
        /** @type {Model.FileMeta[]} */
        this.files = [];
        /** @type {Model.FileMeta[]} */
        this._changedList = [];
        this._init();
    }

    _init() {
        this.readFiles()
            .then(files => {
                this.files = files.filter(file => this.nameRegxp.test(file.path));
                this.files.forEach(file => this.emit('create', file));
            });
        this.watcher = fs.watch(this.basePath, (type, fileName) => {
            if (!this.nameRegxp.test(fileName)) return;
            const file = this.resolveFileName(fileName);
            this._changedList.push(file);
            this._changedList = _.uniqBy(this._changedList, 'base');
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
     * @returns {Model.FileMeta}
     */
    resolveFileName(fileName = '') {
        const pathObj = path.parse(fileName);
        return {
            path: path.join(this.basePath, fileName),
            base: pathObj.name,
            ext: pathObj.ext.slice(1)
        };
    }

    /**
     * Parse file matches `nameRegxp` under `bathPath` to `FileMeta[]`
     * 
     * @returns {Promise<Model.FileMeta[]>}
     */
    async readFiles() {
        return new Promise((resolve, reject) => {
            fs.readdir(this.basePath, (err, fileNames) => {
                if (err) {
                    reject(err);
                } else {
                    /** @type {Model.FileMeta[]} */
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
                change: _.intersectionBy(newFiles, this.files, this._changedList, 'base')
            };
            this.files = newFiles;
            this._changedList = [];
            Object.entries(eventsList).forEach(([type, array]) => {
                array.forEach(ev => {
                    console.log(`[ArticleList] ${type}: ${ev.base}`);
                    this.emit(type, ev);
                });
                eventsList[type] = [];
            });
        }).bind(this), timeout);
    }

    destroy() {
        this.watcher.close();
        this.removeAllListeners();
        if (this.emitTimer) clearTimeout(this.emitTimer);
    }
}

module.exports = ArticleList;
