import config from '../config/index.js';

const authMiddleware = (req, res, next) => {
  const token = req.authToken || req.cookies?.[config.env.authCookieName];
  if (!token) {
    const redirectUrl = encodeURIComponent(req.originalUrl || '/');
    return res.redirect(`/auth/dang-nhap?redirect=${redirectUrl}`);
  }
  req.authToken = token;
  next();
};

export default authMiddleware;