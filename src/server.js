'use strict';

const path = require('path');

const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaStatic = require('koa-static');
const KoaMount = require('koa-mount');

const ArticleList = require('./list');
const ArticleParser = require('./parser');
const PageRenderer = require('./page');

/** 
 * @typedef {{path: string, base: string, ext: string}} FileMeta 
 * @typedef {{title: string; date: Date; tags: string[]}} ArticleMeta
 * @typedef {{src: string; html: string; file: FileMeta; meta: ArticleMeta}} Article
 */

class BlogServer {
    static ParseConfig(input) {
        if (!input) throw new Error('config cannot be null!');
        let config = {
            title: '',
            port: 2233,
            plugins: [],
            articleDir: './article',
            articleExt: /\.md$/,
            templateDir: path.join(__dirname, '../built-in/template'),
            templateArgs: {}
        };
        if (!input.title) throw new Error('Please provide `title` in config.');
        else config.title = input.title;
        if (!input.port) console.log('`config.port` not specificed. using default port `2233`.');
        else config.port = input.port;
        if (!input.articleDir) console.log('`config.articleDir` not specificed. using default `./article`.');
        else config.articleDir = input.articleDir;
        if (!input.articleExt) console.log('`config.articleExt` not specificed. using default `/\\.md$/`.');
        else config.articleExt = input.articleExt;
        if (!input.templateDir) console.log('`config.templateDir` not specificed. using defalut template.');
        else config.templateDir = input.templateDir;
        if (!input.plugins || input.plugins.length === 0) {
            console.log('No plugins found.');
        } else {
            config.plugins = input.plugins;
            console.log(`${config.plugins.length} plugin(s) found.`);
        }
        if (!input.templateArgs || Reflect.ownKeys(input.templateArgs).length === 0) {
            console.log('No arguments applied to template.');
        } else {
            config.templateArgs = input.templateArgs;
        }
        return config;
    }

    constructor(configPath) {
        this.configPath = configPath;
        this.builtInPluginPath = path.resolve(__dirname, '../built-in/plugin');        
        this.__init();
    }

    __init() {
        let rawConf;
        try {
            rawConf = require(this.configPath);
        } catch (err) {
            throw new Error(`Error when reading config:\n${err.message}`);
        }
        this.config = BlogServer.ParseConfig(rawConf);
        this.state = {
            /** @type {Article[]} */
            articles: []
        };
        this.list = new ArticleList({
            basePath: this.config.articleDir,
            nameRegxp: this.config.articleExt
        });
        this.parser = new ArticleParser();
        this.page = new PageRenderer({
            basePath: this.config.templateDir,
            baseLocals: { config: { title: this.config.title } }
        });
        this.app = new Koa();

        // parse and watch articles
        this.list.on('create', async meta => {
            const current = await this.parser.parse(meta);
            this.state.articles.push(current);
            this.state.articles.sort((a, b) => b.meta.date - a.meta.date);
        });
        this.list.on('remove', meta => {
            const index = this.state.articles.findIndex(a => meta.base.indexOf(a.file.base) === 0);
            this.state.articles.splice(index, 1);
        });
        this.list.on('change', async meta => {
            const old = this.state.articles.find(a => meta.base.indexOf(a.file.base) === 0);
            if (old) {
                const current = await this.parser.parse(meta);
                Object.assign(old, current);
                this.state.articles.sort((a, b) => b.meta.date - a.meta.date);
            }
        });

        // bind core routes
        const coreRouter = new KoaRouter();
        coreRouter.get('/', (ctx) => {
            ctx.body = this.page.render('index', {
                ...this.config.templateArgs,
                ...this.state
            });
        });
        coreRouter.get('/page/:page', (ctx) => {
            const offset = (ctx.params.page - 1) * 10;
            ctx.body = this.page.render('index', {
                ...this.config.templateArgs,
                ...this.state,
                articles: this.state.articles.slice(offset)
            });
        });
        coreRouter.get('/article/:name', (ctx) => {
            const a = this.state.articles.find(a => a.file.base === ctx.params.name);
            if (a) {
                ctx.body = this.page.render('article', {
                    ...this.config.templateArgs,
                    ...this.state,
                    article: a,
                    head: { title: a.meta.title }
                });
            } else {
                ctx.response.status = 404;
            }
        });
        this.app.use(coreRouter.routes());
        this.app.use(KoaMount('/assets', KoaStatic(path.join(this.config.templateDir, 'assets'))));
        const builtInPlugins = require(this.builtInPluginPath);
        builtInPlugins.forEach(this.installPlugin.bind(this));
        this.config.plugins.forEach(this.installPlugin.bind(this));
    }

    installPlugin(plugin) {
        try {
            if (plugin.routes) this.app.use(plugin.routes);
            if (typeof plugin.install === 'function') plugin.install(this);
            return true;
        } catch (err) {
            console.error(`[BlogServer] Error installing plugin ${plugin.name}:\n${err.name}\n${err.message}\n${err.stack}`);
            return false;
        }
    }

    start() {
        return new Promise((resolve) => {
            this._server = this.app.listen(this.config.port, () => {
                console.log(`Listening on port ${this.config.port}`);
                resolve();
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            this.list.removeAllListeners();
            this._server.close(() => {
                console.log('Server closed');
                resolve();
            });
        });
    }

    reload() {
        return new Promise((resolve) => {
            // clear config cache
            require.cache[this.configPath] = null;
            // clear built-in plugin cache
            require.cache[this.builtInPluginPath] = null;
            this.stop().then(() => {
                this.__init();
                this.start().then(() => resolve());
            });
        });
    }
}

module.exports = BlogServer;
