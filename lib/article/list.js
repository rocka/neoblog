'use strict';

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class ArticleList extends EventEmitter {
    constructor(
        basePath = './userdata/article',
        { nameRegxp } = {
            nameRegxp: /\.md$/
        }
    ) {
        super();
        this.basePath = path.resolve(basePath);
        /** @type {string[]} */
        this.files = [];
        fs.readdir(this.basePath, (err, files) => {
            this.files = files.filter(n => n.match(nameRegxp));
            this.emit('change', this.files);
        });
        fs.watch(this.basePath, (type, fileName) => {
            if (fileName.match(nameRegxp)) {
                this.emit('change', [fileName]);
            }
        });
    }
}

module.exports = ArticleList;
