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
 * @typedef {{meta: ArticleMeta; file: FileMeta; src: string; html: string; excerpt: string; excerptText: string; excerptImg: string; more: boolean}} Article
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

        // path should not end with '/' except index
        this.app.use(async (ctx, next) => {
            if (ctx.path.endsWith('/') && ctx.path !== '/') {
                ctx.status = 301;
                return ctx.redirect(ctx.path.substr(0, ctx.path.length - 1));
            }
            await next();
        });

        /**
         * push (article) element into array and sort by date
         * @param {Article} article 
         * @param {Article[]} array 
         */
        const pushAndSort = (article, array) => {
            array.push(article);
            array.sort((a, b) => b.meta.date - a.meta.date);
        };

        /**
         * add article to article list / tag list
         * @param {FileMeta} meta 
         */
        const handleArticleCreate = async meta => {
            const article = await this.parser.parse(meta);
            pushAndSort(article, this.state.articles);
            article.meta.tags.forEach(tag => pushAndSort(article, this.state.tags[tag]));
        };

        /**
         * delete article matches given meta from Article[]
         * @param {FileMeta} meta 
         * @param {Article[]} array 
         */
        const findAndDel = (meta, array) => {
            const index = array.findIndex(a => meta.base === a.file.base);
            array.splice(index, 1);
        };

        /**
         * remove aritlce matches given meta from `this.articles` and `this.tags`
         * @param {FileMeta} meta 
         */
        const handleArticleRemove = meta => {
            findAndDel(meta, this.state.articles);
            Object.keys(this.state.tags).forEach(k => findAndDel(meta, this.state.tags[k]));
        };

        // parse and watch articles
        this.list.on('create', handleArticleCreate);
        this.list.on('remove', handleArticleRemove);
        this.list.on('change', async meta => {
            const old = this.state.articles.find(a => meta.base === a.file.base);
            if (old) {
                handleArticleRemove(old.file);
            }
            const current = await this.parser.parse(meta);
            handleArticleCreate(current.file);
        });

        // middleware for parsing pagination like `/page/:page`
        const PaginationMiddleWare = async (ctx, next) => {
            const page = Number(ctx.params.page);
            if (page <= 0) {
                ctx.response.status = 404;
            } else if (page === 1) {
                // redirect `/page/1` to `/`
                ctx.status = 301;
                ctx.redirect(path.join(ctx.path, '../..'));
            } else {
                ctx.state.page = page;
                await next();
            }
        };

        /**
         * generate pug locals for `/page/:page`
         * 
         * @param {number} page page number
         * @param {string} tag article tag
         * @param {Router.IRouterContext} ctx request context
         */
        const getPageLocals = (page, tag, ctx) => {
            const offset = (page - 1) * this.config.articlesPerPage;
            const articles = tag ? this.state.tags[tag] : this.state.articles;
            const total = Math.ceil(articles.length / this.config.articlesPerPage);
            const host = ctx.get('host') || '';
            return {
                ...this.config.templateArgs,
                articles: articles.slice(offset, offset + this.config.articlesPerPage),
                host,
                pagination: {
                    current: page,
                    prefix: tag ? `/tag/${tag}` : '',
                    prev: page > 1 ? page - 1 : false,
                    next: page === total ? false : page + 1,
                    total: total,
                    size: this.config.articlesPerPage
                }
            };
        };

        // bind core routes, including 
        // `/` `/page/:page`
        // `/tag/:tag` `/tag/:tag/page/:page`
        // `/article/:name`
        const coreRouter = new KoaRouter();
        coreRouter.get('/', (ctx) => {
            ctx.body = this.page.render('index.pug', getPageLocals(1, null, ctx));
        });
        coreRouter.get('/page/:page', PaginationMiddleWare, (ctx) => {
            const { page } = ctx.state;
            const locals = getPageLocals(page, null, ctx);
            if (locals.articles.length > 0) {
                ctx.body = this.page.render('index.pug', locals);
            }
        });
        coreRouter.get('/tag/:tag', ctx => {
            const locals = getPageLocals(1, ctx.params.tag, ctx);
            if (locals.articles.length > 0) {
                ctx.body = this.page.render('index.pug', locals);
            }
        });
        coreRouter.get('/tag/:tag/page/:page', PaginationMiddleWare, (ctx) => {
            const { tag } = ctx.params;
            const { page } = ctx.state;
            const locals = getPageLocals(page, tag, ctx);
            if (locals.articles.length > 0) {
                ctx.body = this.page.render('index.pug', locals);
            }
        });
        coreRouter.get('/article/:name', (ctx) => {
            const a = this.state.articles.find(a => a.file.base === ctx.params.name);
            if (a) {
                ctx.body = this.page.render('article.pug', {
                    ...this.config.templateArgs,
                    article: a,
                });
            }
        });
        this.app.use(coreRouter.routes());
        this.app.use(KoaMount('/assets', KoaStatic({
            dir: path.join(this.config.templateDir, 'assets'),
            preload: false,
            dynamic: true
        })));
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
