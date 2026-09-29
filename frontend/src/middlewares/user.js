import config from '../config/index.js';
import authService from '../services/auth.service.js';

const userMiddleware = async (req, res, next) => {
  req.user = null;
  req.authToken = req.cookies?.[config.env.authCookieName] || null;
  if (!req.authToken) return next();
  try {
    const result = await authService.meWithToken?.(req.authToken);
    req.user = result?.data || null;
  } catch (error) {
    if (error.status === 401) {
      res.clearCookie(config.env.authCookieName);
      req.authToken = null;
      req.user = null;
      return next();
    }
    req.userLoadError = error;
  }
  next();
};

export default userMiddleware;