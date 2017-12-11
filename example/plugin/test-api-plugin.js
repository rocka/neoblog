const Router = require('koa-router');

const router = new Router();

router.get('/api/test', (ctx) => {
    ctx.response.set('Content-Type', 'application/json');
    ctx.body = JSON.stringify({
        foo: ['bar', 'baz']
    });
});

module.exports = {
    name: 'test-api-plugin',
    version: '0.1.0',
    description: 'neoblog plugin example for adding new routes to koa app.',
    author: 'rocka <i@rocka.me>',
    routes: router.routes()
};
