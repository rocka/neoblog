'use strict';

const path = require('path');

const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaStatic = require('koa-static');
const KoaMount = require('koa-mount');

const ArticleList = require('./list');
const ArticleParser = require('./parser');
const PageRenderer = require('./page');

class BlogServer {
    static ParseConfig(input) {
        if (!input) throw new Error('config cannot be null!');
        let config = {
            title: '',
            port: 2233,
            plugins: [],
            articleDir: './article',
            templateDir: path.join(__dirname, '../built-in/template'),
            templateArgs: {}
        };
        if (!input.title) throw new Error('Please provide `title` in config.');
        else config.title = input.title;
        if (!input.port) console.log('`config.port` not specificed. using default port `2233`.');
        else config.port = input.port;
        if (!input.articleDir) console.log('`config.articleDir` not specificed. using default `./article`.');
        else config.articleDir = input.articleDir;
        if (!input.templateDir) console.log('`config.templateDir` not specificed. using defalut template.');
        else config.templateDir = input.templateDir;
        if (!input.plugins || input.plugins.length === 0) {
            console.log('No plugins loaded.');
        } else {
            config.plugins = input.plugins;
            console.log(`${config.plugins.length} plugin(s) loaded.`);
        }
        if (!input.templateArgs || Reflect.ownKeys(input.templateArgs).length === 0) {
            console.log('No arguments applied to template.');
        } else {
            config.templateArgs = input.templateArgs;
        }
        return config;
    }

    constructor(configPath) {
        let rawConf;
        this.configPath = configPath;
        try {
            rawConf = require(configPath);
        } catch (err) {
            throw new Error(`Error when reading config:\n${err.message}`);
        }
        this.config = BlogServer.ParseConfig(rawConf);
        this.__init();
    }

    __init() {
        this.state = {
            /** @typedef {{baseName: string; title: string; date: string; tags: string[]}} ArticleMeta */
            /** @type {Array.<{src: string; html: string; meta: ArticleMeta}>} */
            articles: []
        };
        this.list = new ArticleList({
            basePath: this.config.articleDir,
            nameRegxp: /\.md$/
        });
        this.parser = new ArticleParser();
        this.page = new PageRenderer({
            basePath: this.config.templateDir,
            baseLocals: { config: { title: this.config.title } }
        });
        this.app = new Koa();

        // parse and watch articles
        this.list.on('change', files => {
            files.forEach(async name => {
                const old = this.state.articles.find(a => name.indexOf(a.meta.baseName) === 0);
                const current = await this.parser.parse(name);
                if (old) {
                    Object.assign(old, current);
                } else {
                    this.state.articles.push(current);
                }
                this.state.articles.sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime());
            });
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
            const a = this.state.articles.find(a => a.meta.baseName === ctx.params.name);
            if (a) {
                ctx.body = this.page.render('article', {
                    ...this.config.templateArgs,
                    ...this.state,
                    content: a.html,
                    head: { title: a.meta.title }
                });
            } else {
                ctx.response.status = 404;
            }
        });
        this.app.use(coreRouter.routes());
        this.app.use(KoaMount('/assets', KoaStatic(path.join(this.config.templateDir, 'assets'))));
        this.config.plugins.forEach(plugin => this.app.use(plugin.routes));
    }

    start() {
        return new Promise((resolve) => {
            this._server = this.app.listen(this.config.port, () => {
                console.log(`Listening on port ${this.config.port}`);
                resolve();
            });
        });
    }

    reload() {
        this.list.removeAllListeners();
        return new Promise((resolve) => {
            this._server.close(() => {
                console.log('Server closed');
                this.__init();
                this.start().then(() => resolve());
            });
        });
    }
}

module.exports = BlogServer;
