const session = require('../_session');

async function use(req, res, next) {
    if(req.signedCookies && req.signedCookies['__session']) {
        const __session = await session.getSessionByHash(req.signedCookies['__session']);
        if(__session && __session.user) {
            req.user_id = Number.parseInt(__session.user.id);
        }
    }
    next();
}

module.exports = use;