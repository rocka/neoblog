'use strict';

const Path = require('path');
const ReadLine = require('readline');

ReadLine.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const Server = require('./src/server');
const configPath = Path.join(process.cwd(), 'config.js');

const neoblog = new Server(configPath);

neoblog.start();

process.stdin.on('keypress', (ch, key) => {
    if (key && key.ctrl) {
        switch (key.name) {
            case 'r':
                console.log('\nCtrl-R pressed, reloading config...');
                neoblog.reload();
                break;
            case 'c':
                console.log('\nCtrl-C pressed, exiting...');
                neoblog.stop().then(() => {
                    process.exit(0);
                });
                break;
            default:
                break;
        }
    }
});
