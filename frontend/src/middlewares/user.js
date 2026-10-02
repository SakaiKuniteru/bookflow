import config from '../config/index.js';
import authService from '../services/auth.service.js';

const cookieOptions = {
  httpOnly: true,
  secure: config.env.authCookieSecure,
  sameSite: config.env.authCookieSameSite,
  path: '/'
};
const userMiddleware = async (req, res, next) => {
  req.user = null;
  req.authToken = req.cookies?.[config.env.authCookieName] || null;
  const refreshToken = req.cookies?.[config.env.authRefreshCookieName] || null;
  try {
    let result = null;
    if (req.authToken) {
      try {
        result = await authService.meWithToken(req.authToken);
      } catch (error) {
        if (error.status !== 401) throw error;
      }
    }
    if (!result && refreshToken) {
      const refreshed = await authService.refresh(refreshToken);
      const tokens = refreshed.data || refreshed;
      req.authToken = tokens.access_token;
      res.cookie(config.env.authCookieName, tokens.access_token, { ...cookieOptions, maxAge: Number(tokens.expires_in || 600) * 1000 });
      res.cookie(config.env.authRefreshCookieName, tokens.refresh_token, { ...cookieOptions, maxAge: config.env.authRefreshCookieMaxAge });
      result = await authService.meWithToken(req.authToken);
    }
    req.user = result?.data || null;
  } catch (error) {
    if (error.status === 401) {
      res.clearCookie(config.env.authCookieName, { ...cookieOptions });
      res.clearCookie(config.env.authRefreshCookieName, { ...cookieOptions });
      req.authToken = null;
      req.user = null;
    } else {
      req.userLoadError = error;
    }
  }
  next();
};
export default userMiddleware;