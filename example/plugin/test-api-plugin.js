const Router = require('koa-router');

const router = new Router();

router.get('/api/test', (ctx) => {
    ctx.response.set('Content-Type', 'application/json');
    ctx.body = JSON.stringify({
        foo: ['bar', 'baz']
    });
});

module.exports = {
    routes: router.routes()
};
