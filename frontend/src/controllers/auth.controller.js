import config from '../config/index.js';
import authService from '../services/auth.service.js';

const cookieOptions = {
  httpOnly: config.env.sessionCookieHttpOnly,
  secure: config.env.authCookieSecure,
  sameSite: config.env.authCookieSameSite,
  maxAge: config.env.authCookieMaxAge,
  path: '/'
};

const authController = {
  loginPage(req, res) {
    if (req.user) return res.redirect('/');
    return res.render('auth/dang-nhap', {
      title: 'Đăng nhập',
      redirect: req.query.redirect || '/'
    });
  },
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      const token = result.data?.accessToken || result.data?.access_token || result.accessToken;
      if (!token) {
        const error = new Error('Backend không trả access token.');
        error.status = 502;
        return next(error);
      }
      res.cookie(config.env.authCookieName, token, cookieOptions);
      const redirect = typeof req.body.redirect === 'string' && req.body.redirect.startsWith('/') ? req.body.redirect : '/';
      return res.redirect(redirect);
    } catch (error) {
      return res.status(error.status >= 400 && error.status < 500 ? error.status : 500).render('auth/dang-nhap', {
        title: 'Đăng nhập',
        error: error.message,
        values: {
          email: req.body.email || ''
        },
        redirect: req.body.redirect || '/'
      });
    }
  },
  registerPage(req, res) {
    if (req.user) return res.redirect('/');
    return res.render('auth/dang-ky', {
      title: 'Đăng ký'
    });
  },
  async register(req, res, next) {
    try {
      await authService.register(req.body);
      return res.redirect('/auth/dang-nhap?registered=1');
    } catch (error) {
      return res.status(error.status >= 400 && error.status < 500 ? error.status : 500).render('auth/dang-ky', {
        title: 'Đăng ký',
        error: error.message,
        values: req.body
      });
    }
  },
  forgotPasswordPage(req, res) {
    return res.render('auth/quen-mat-khau', {
      title: 'Quên mật khẩu'
    });
  },
  async forgotPassword(req, res, next) {
    try {
      await authService.forgotPassword(req.body);
      return res.render('auth/quen-mat-khau', {
        title: 'Quên mật khẩu',
        success: 'Nếu thông tin hợp lệ, hướng dẫn đặt lại mật khẩu đã được gửi.'
      });
    } catch (error) {
      return next(error);
    }
  },
  resetPasswordPage(req, res) {
    return res.render('auth/dat-lai-mat-khau', {
      title: 'Đặt lại mật khẩu',
      token: req.query.token || ''
    });
  },
  async resetPassword(req, res, next) {
    try {
      await authService.resetPassword(req.body);
      return res.redirect('/auth/dang-nhap?reset=1');
    } catch (error) {
      return next(error);
    }
  },
  async logout(req, res, next) {
    try {
      try {
        await authService.logout();
      } catch (error) {
        if (error.status !== 401) throw error;
      }
      res.clearCookie(config.env.authCookieName, {
        httpOnly: config.env.sessionCookieHttpOnly,
        secure: config.env.authCookieSecure,
        sameSite: config.env.authCookieSameSite,
        path: '/'
      });
      return res.redirect('/');
    } catch (error) {
      return next(error);
    }
  }
};

export default authController;