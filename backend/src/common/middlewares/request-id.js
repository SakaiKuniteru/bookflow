const { randomUUID } = require('node:crypto');

function ganRequestId(req, res, next) {
    const requestIdGuiLen = req.get('X-Request-Id');
    const requestId = typeof requestIdGuiLen === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(requestIdGuiLen) ? requestIdGuiLen : randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
}

module.exports = { ganRequestId };