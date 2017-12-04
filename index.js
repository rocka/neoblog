'use strict';

const path = require('path');

const server = require('./src/server');
const configPath = path.join(process.cwd(), 'config.js');

new server(configPath).start();
