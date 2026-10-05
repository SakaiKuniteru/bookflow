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
    if (!result && (refreshToken || req.authToken)) {
      const refreshed = await authService.refresh(refreshToken, req.authToken);
      const tokens = refreshed.data || refreshed;
      const accessToken = tokens.accessToken || tokens.access_token;
      const refreshTokenMoi = tokens.refreshToken || tokens.refresh_token;
      if (!accessToken || !refreshTokenMoi) throw Object.assign(new Error('Backend không trả đủ token để gia hạn phiên'), { status: 502 });
      req.authToken = accessToken;
      res.cookie(config.env.authCookieName, accessToken, { ...cookieOptions, maxAge: config.env.authCookieMaxAge });
      res.cookie(config.env.authRefreshCookieName, refreshTokenMoi, { ...cookieOptions, maxAge: config.env.authRefreshCookieMaxAge });
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
  if (req.user && req.authToken && req.originalUrl.split('?')[0].startsWith('/api/')) res.set('X-BookFlow-Access-Token', req.authToken);
};
export default userMiddleware;