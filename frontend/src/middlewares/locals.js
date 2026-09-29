import config from '../config/index.js';

const localsMiddleware = (req, res, next) => {
  res.locals.app = {
    name: config.app.name,
    url: config.app.url
  };
  res.locals.request = {
    id: req.requestId
  };
  res.locals.user = req.user;
  res.locals.authenticated = Boolean(req.user);
  res.locals.permissions = req.user?.permissions || [];
  res.locals.roles = req.user?.roles || [];
  res.locals.currentPath = req.path;
  res.locals.flash = req.flash || null;
  next();
};

export default localsMiddleware;