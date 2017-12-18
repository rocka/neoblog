'use strict';

const Body = require('koa-body');
const Router = require('koa-router');

const router = new Router();

router.post('/api/preview/:type',
    async (ctx, next) => {
        if (ctx.header['content-type'].indexOf('text/plain') == -1) {
            ctx.status = 400;
            ctx.body = 'Please use MIME type `text/plain` for preview';
        }
        await next();
    },
    Body(),
    async ctx => {
        try {
            ctx.body = await ctx.app.server.parser.parseContent({
                ext: ctx.params.type
            }, ctx.request.body);
        } catch (error) {
            ctx.status = 400;
            ctx.body = error.message;
        }
    }
);

module.exports = {
    name: 'preview',
    version: '0.1.0',
    description: 'API POST /api/preview for preview article src parse result.',
    author: 'rocka <i@rocka.me>',
    routes: router.routes()
};
