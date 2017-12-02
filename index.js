'use strict';

const Koa = require('koa');
const KoaRouter = require('koa-router');
const KoaStatic = require('koa-static');

const app = new Koa();

app.use(KoaStatic('./webroot'));

const lib = require('./lib');

const list = new lib.Article.List();
const parser = new lib.Article.Parser();
const page = new lib.PageRenderer();

const state = {
    /** @typedef {{baseName: string; title: string; date: string; tags: string[]}} ArticleMeta */
    /** @type {Array.<{src: string; html: string; meta: ArticleMeta}>} */
    articles: []
};

app.use((ctx, next) => {
    ctx.state = state;
    next();
});

// parse and watch articles
list.on('change', files => {
    files.forEach(async name => {
        const old = state.articles.find(a => name.indexOf(a.meta.baseName) === 0);
        const current = await parser.parse(name);
        if (old) {
            Object.assign(old, current);
        } else {
            state.articles.push(current);
        }
        state.articles.sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime());
    });
});

// bind core routes
const coreRouter = new KoaRouter();
coreRouter.get('/', (ctx) => {
    ctx.body = page.index({
        articles: state.articles,
        head: { title: 'Index' }
    });
});
coreRouter.get('/page/:page', (ctx) => {
    const offset = (ctx.params.page - 1) * 10;
    ctx.body = page.index({
        articles: state.articles.slice(offset),
        pageOffset: offset,
        head: { title: 'Index' }
    });
});
coreRouter.get('/article/:name', (ctx) => {
    const a = state.articles.find(a => a.meta.baseName === ctx.params.name);
    if (a) {
        ctx.body = page.article({
            content: a.html,
            head: { title: a.meta.title }
        });
    } else {
        ctx.response.status = 404;
        ctx.body = page.error({
            content: '',
            head: { title: 404 }
        });
    }
});

app.use(coreRouter.routes());

const plugins = require('./plugins');

plugins.forEach(plugin => app.use(plugin.routes));

app.listen(2233);
