'use strict';

const path = require('path');

const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaStatic = require('koa-static-cache');
const KoaMount = require('koa-mount');

const ArticleList = require('./list');
const ArticleParser = require('./parser');
const PageRenderer = require('./page');

/** 
 * @typedef {{path: string, base: string, ext: string}} FileMeta 
 * @typedef {{title: string; date: Date; tags: string[]}} ArticleMeta
 * @typedef {{src: string; html: string; file: FileMeta; meta: ArticleMeta, more: boolean}} Article
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
            articlesPerPage: 10,
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
        if (!input.articlesPerPage) console.log('`config.articlesPerPage` not specificed. using default `10`.');
        else config.articlesPerPage = input.articlesPerPage;
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
            articles: [],
            /** @type {Object.<string, Article[]>} */
            tags: new Proxy({}, {
                get(target, name) {
                    if (!(name in target)) {
                        target[name] = [];
                    }
                    return target[name];
                }
            })
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
        // reference `ctx.app.server` to `BlogServer` instance
        this.app.server = this;

        // add article to article list / tag list
        const handleArticleChange = article => {
            this.state.articles.push(article);
            this.state.articles.sort((a, b) => b.meta.date - a.meta.date);
            article.meta.tags.forEach(tag => {
                this.state.tags[tag].length;
                this.state.tags[tag].push(article);
                this.state.tags[tag].sort((a, b) => b.meta.date - a.meta.date);
            });
        };

        // delete article matches given meta from Article[]
        const findAndDel = (meta, array) => {
            const index = array.findIndex(a => meta.base.indexOf(a.file.base) === 0);
            array.splice(index, 1);
        };

        // parse and watch articles
        this.list.on('create', async meta => {
            const current = await this.parser.parse(meta);
            handleArticleChange(current);
        });
        this.list.on('remove', meta => {
            findAndDel(meta, this.state.articles);
            Object.keys(this.state.tags).forEach(k => findAndDel(meta, this.state.tags[k]));
        });
        this.list.on('change', async meta => {
            const old = this.state.articles.find(a => meta.base.indexOf(a.file.base) === 0);
            if (old) {
                const current = await this.parser.parse(meta);
                Object.assign(old, current);
                handleArticleChange(current);
            }
        });

        /**
         * generate pug locals for `/page/:page`
         * 
         * @param {number} page page number
         * @param {string} tag article tag
         */
        const getPageLocals = (page, tag) => {
            const offset = (page - 1) * this.config.articlesPerPage;
            const total = Math.round(this.state.articles.length / this.config.articlesPerPage + 0.5);
            const articles = tag ? this.state.tags[tag] : this.state.articles;
            return {
                ...this.config.templateArgs,
                articles: articles.slice(offset, offset + this.config.articlesPerPage),
                pagination: {
                    current: page,
                    prev: page > 1 ? page - 1 : false,
                    next: page === total ? false : page + 1,
                    total: total,
                    size: this.config.articlesPerPage
                }
            };
        };

        // bind core routes
        const coreRouter = new KoaRouter();
        coreRouter.get('/', (ctx) => {
            ctx.body = this.page.render('index.pug', getPageLocals(1));
        });
        coreRouter.get('/page/:page', (ctx) => {
            const page = Number(ctx.params.page);
            if (page <= 0) {
                ctx.response.status = 404;
            } else if (page === 1) {
                ctx.response.status = 301;
                ctx.response.set('Location', '/');
            } else {
                const offset = (page - 1) * this.config.articlesPerPage;
                if (offset >= this.state.articles.length) {
                    ctx.response.status = 404;
                } else {
                    ctx.body = this.page.render('index.pug', getPageLocals(page));
                }
            }
        });
        coreRouter.get('/tag/:tag', ctx => {
            ctx.body = this.page.render('index.pug', getPageLocals(1, ctx.params.tag));
        });
        coreRouter.get('/article/:name', (ctx) => {
            const a = this.state.articles.find(a => a.file.base === ctx.params.name);
            if (a) {
                ctx.body = this.page.render('article.pug', {
                    ...this.config.templateArgs,
                    article: a,
                });
            } else {
                ctx.response.status = 404;
            }
        });
        this.app.use(coreRouter.routes());
        this.app.use(KoaMount(
            '/assets',
            KoaStatic(path.join(this.config.templateDir, 'assets'), {
                maxAge: 365 * 24 * 60 * 60,
                gzip: true,
                usePrecompiledGzip: true
            })
        ));
        const builtInPlugins = require(this.builtInPluginPath);
        builtInPlugins.forEach(this.installPlugin.bind(this));
        this.config.plugins.forEach(this.installPlugin.bind(this));
    }

    installPlugin(plugin) {
        try {
            if (Array.isArray(plugin.routes)) {
                plugin.routes.forEach(r => this.app.use(r));
            } else if (plugin.routes) {
                this.app.use(plugin.routes);
            }
            if (typeof plugin.install === 'function') plugin.install(this);
            return true;
        } catch (err) {
            console.error(`[BlogServer] Error installing plugin ${plugin.name}:\n${err.stack}`);
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
            for (let key in require.cache) {
                /** @type {NodeJS.Module} */
                const cached = require.cache[key];
                if (key.indexOf(this.builtInPluginPath) === 0 || // is a built-in plugin
                    // I really need optional-chaining ...
                    (cached && cached.parent && cached.parent.filename === this.configPath) // required by `config.js`
                ) {
                    require.cache[key] = null;
                    console.log('Clear require cache', path.relative('.', key));
                }
            }
            this.stop().then(() => {
                this.__init();
                this.start().then(() => resolve());
            });
        });
    }
}

module.exports = BlogServer;
