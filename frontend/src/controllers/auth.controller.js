import config from '../config/index.js';
import authService from '../services/auth.service.js';
import { maHoaBanNhap, giaiMaBanNhap } from '../security/registration-draft.js';

const cookieOptions = {
  httpOnly: config.env.sessionCookieHttpOnly,
  secure: config.env.authCookieSecure,
  sameSite: config.env.authCookieSameSite,
  maxAge: config.env.authCookieMaxAge,
  path: '/'
};

function renderAuth(res, page, title, locals = {}, status = 200) {
  return res.status(status).render(`pages/auth/${page}`, { layout: 'auth', authPage: page, title, ...locals });
}
function layTokenTiepTucDangKy(response) {
  const data = response?.data || response || {};
  return data.registrationResumeToken || data.registration_resume_token || '';
}
function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null;
}
function urlDoiEmail(path, email) {
  return `${path}?email=${encodeURIComponent(email || '')}`;
}
function destinationFor(context) {
  const roles = (context?.vai_tro || context?.vaiTro || []).map(role => role.ma_vai_tro || role.maVaiTro);
  if (roles.includes('QUAN_TRI')) return '/admin/tong-quan';
  if (roles.includes('NHAN_VIEN') || roles.includes('THU_THU')) return '/staff/tong-quan';
  return '/customer/tong-quan';
}
function accessibleBranches(context) {
  return context?.chi_nhanh_duoc_truy_cap || context?.chiNhanhDuocTruyCap || context?.data?.chi_nhanh_duoc_truy_cap || context?.data?.chiNhanhDuocTruyCap || [];
}
async function finishLogin(res, token, context, requestedRedirect) {
  res.cookie(config.env.authCookieName, token, cookieOptions);
  const refreshToken = context?.refresh_token || context?.refreshToken;
  if (refreshToken) {
    res.cookie(config.env.authRefreshCookieName, refreshToken, {
      httpOnly: true,
      secure: config.env.authCookieSecure,
      sameSite: config.env.authCookieSameSite,
      maxAge: config.env.authRefreshCookieMaxAge,
      path: '/'
    });
  }
  const organizations = context?.don_vi_tham_gia || context?.donViThamGia || [];
  const selectedOrganizationId = context?.don_vi_dang_chon_id || context?.donViDangChonId;
  if (organizations.length > 1 && !selectedOrganizationId) return res.redirect(`/auth/chon-don-vi?redirect=${encodeURIComponent(safeRedirect(requestedRedirect) || '/')}`);
  if (organizations.length === 1 && !selectedOrganizationId) {
    const selected = await authService.selectOrganization(token, organizations[0].id);
    context = selected.data || selected;
  }
  const branches = accessibleBranches(context);
  const selectedBranchId = context?.chi_nhanh_dang_chon_id || context?.chiNhanhDangChonId;
  if (branches.length > 1 && !selectedBranchId) return res.redirect(`/auth/chon-chi-nhanh?redirect=${encodeURIComponent(safeRedirect(requestedRedirect) || '/')}`);
  if (branches.length === 1 && !selectedBranchId) {
    const selected = await authService.selectBranch(token, branches[0].id);
    context = selected.data || selected;
  }
  const redirect = safeRedirect(requestedRedirect);
  return res.redirect(redirect || '/');
}

const authController = {
  async loginPage(req, res) {
    if (req.user) return await finishLogin(res, req.authToken, req.user, req.query.redirect);
    if (req.session) delete req.session.registrationDraft;
    return renderAuth(res, 'dang-nhap', 'Đăng nhập', {
      redirect: req.query.redirect || '/',
      allowRegistration: true,
      registered: req.query.registered === '1',
      reset: req.query.reset === '1'
    });
  },
  async login(req, res) {
    try {
      const result = await authService.login({
        dinh_danh: req.body.email,
        mat_khau: req.body.password
      });
      const data = result.data || result;
      if (data.yeu_cau_kich_hoat || data.yeuCauKichHoat) return res.redirect(`/auth/kich-hoat-nhan-vien?dinh_danh=${encodeURIComponent(req.body.email || '')}`);
      const token = data.accessToken || data.access_token;
      if (!token) {
        const error = new Error('Backend không trả access token.');
        error.status = 502;
        throw error;
      }
      return await finishLogin(res, token, data, req.body.redirect);
    } catch (error) {
      return renderAuth(res, 'dang-nhap', 'Đăng nhập', {
        error: error.message,
        values: { email: req.body.email || '' },
        redirect: safeRedirect(req.body.redirect) || '/',
        allowRegistration: true
      }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  registerPage(req, res) {
    if (req.user) return res.redirect('/');
    const resume = req.query.resume === '1';
    if (req.session) {
      if (resume) req.session.registrationResumeMode = true;
      else delete req.session.registrationResumeMode;
    }
    let draft = {};
    if (resume && req.session?.registrationDraft) {
      try {
        draft = giaiMaBanNhap(req.session.registrationDraft);
        req.session.registrationResumeEmail = draft.email;
      } catch {}
    }
    if (req.session) delete req.session.registrationDraft;
    return renderAuth(res, 'dang-ky', 'Đăng ký', { values: resume ? draft : {}, resumeRegistration: resume });
  },
  async register(req, res) {
    try {
      if (!req.body.acceptTerms) throw Object.assign(new Error('Bạn cần đồng ý với điều khoản sử dụng.'), { status: 400, field: 'acceptTerms' });
      if (req.body.password !== req.body.passwordConfirm) throw Object.assign(new Error('Mật khẩu xác nhận chưa khớp.'), { status: 400, field: 'passwordConfirm' });
      const draft = {
        fullName: req.body.fullName || '',
        username: req.body.username || '',
        email: req.body.email || '',
        phone: req.body.phone || '',
        password: req.body.password || '',
        passwordConfirm: req.body.passwordConfirm || '',
        acceptTerms: Boolean(req.body.acceptTerms)
      };
      req.session.registrationDraft = maHoaBanNhap(draft);
            const dangSuaDangKy = req.body.resumeRegistration === '1' || req.session?.registrationResumeMode === true;
      if (dangSuaDangKy) {
        if (!req.session.registrationResumeToken) {
          throw Object.assign(new Error('Phiên đăng ký đã hết hạn. Vui lòng bắt đầu đăng ký lại.'), { status: 410 });
        }
        const ketQuaDoiEmail = await authService.changeRegistrationEmail({
          token: req.session.registrationResumeToken,
          ho_ten: req.body.fullName,
          ten_dang_nhap: req.body.username,
          email: req.body.email,
          so_dien_thoai: req.body.phone,
          mat_khau: req.body.password
        });
        req.session.registrationResumeToken = layTokenTiepTucDangKy(ketQuaDoiEmail);
        if (!req.session.registrationResumeToken) throw Object.assign(new Error('Backend không trả token tiếp tục đăng ký.'), { status: 502 });
        delete req.session.registrationResumeEmail;
        return res.redirect(`/auth/xac-minh-dang-ky?email=${encodeURIComponent(req.body.email)}&sent=1`);
      }
      delete req.session.registrationResumeEmail;
      const ketQuaDangKy = await authService.register({
        ho_ten: req.body.fullName,
        email: req.body.email,
        ten_dang_nhap: req.body.username,
        so_dien_thoai: req.body.phone,
        mat_khau: req.body.password
      });
      req.session.registrationResumeToken = layTokenTiepTucDangKy(ketQuaDangKy);
      if (!req.session.registrationResumeToken) throw Object.assign(new Error('Backend không trả token tiếp tục đăng ký.'), { status: 502 });
      return res.redirect(`/auth/xac-minh-dang-ky?email=${encodeURIComponent(req.body.email)}&sent=1`);
    } catch (error) {
      const backendError = error.data?.error;
      const tenTruongFrontend = { ho_ten: 'fullName', email: 'email', ten_dang_nhap: 'username', so_dien_thoai: 'phone', mat_khau: 'password' };
      const fieldErrors = Object.fromEntries((backendError?.details || []).filter(item => item.field).map(item => [tenTruongFrontend[item.field] || item.field, item.message]));
      if (error.field) fieldErrors[error.field] = error.message;
      if (!fieldErrors.email && backendError?.code === 'EMAIL_EXISTS') fieldErrors.email = 'Email này đã được đăng ký';
      if (!fieldErrors.username && backendError?.code === 'USERNAME_EXISTS') fieldErrors.username = 'Tên đăng nhập này đã được sử dụng';
      if (!fieldErrors.phone && backendError?.code === 'PHONE_EXISTS') fieldErrors.phone = 'Số điện thoại này đã được đăng ký';
      return renderAuth(res, 'dang-ky', 'Đăng ký', {
        fieldErrors,
        formError: Object.keys(fieldErrors).length ? '' : (backendError?.message || error.message),
        resumeRegistration: req.body.resumeRegistration === '1' || req.session?.registrationResumeMode === true,
        values: {
          fullName: req.body.fullName || '',
          username: req.body.username || '',
          email: req.body.email || '',
          phone: req.body.phone || '',
          password: req.body.password || '',
          passwordConfirm: req.body.passwordConfirm || ''
        }
      }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  verifyRegistrationPage(req, res) {
    return renderAuth(res, 'xac-minh-dang-ky', 'Xác minh email', { email: req.query.email || '', codeSent: req.query.sent === '1', changeEmailUrl: '/auth/dang-ky?resume=1' });
  },
  async verifyRegistration(req, res) {
    try {
      await authService.verifyRegistration({ email: req.body.email, otp: req.body.otp });
      delete req.session.registrationDraft;
      delete req.session.registrationResumeToken;
      delete req.session.registrationResumeEmail;
      return res.redirect('/auth/dang-nhap?registered=1'); 
    } catch (error) {
            return renderAuth(res, 'xac-minh-dang-ky', 'Xác minh email', { email: req.body.email || '', otpError: error.message, changeEmailUrl: '/auth/dang-ky?resume=1' }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async resendRegistrationOtp(req, res) {
    try {
      await authService.resendRegistrationOtp({ email: req.body.email });
      return res.redirect(`/auth/xac-minh-dang-ky?email=${encodeURIComponent(req.body.email)}&sent=1`);
    } catch (error) {
      return renderAuth(res, 'xac-minh-dang-ky', 'Xác minh email', { email: req.body.email || '', resendError: error.message, changeEmailUrl: '/auth/dang-ky?resume=1' }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  employeeActivationPage(req, res) {
    return renderAuth(res, 'kich-hoat-nhan-vien', 'Kích hoạt tài khoản nhân viên', { identifier: req.query.dinh_danh || '' });
  },
  async completeEmployeeActivation(req, res) {
    try {
      if (req.body.newPassword !== req.body.confirmNewPassword) throw Object.assign(new Error('Mật khẩu xác nhận chưa khớp.'), { status: 400 });
      const result = await authService.completeEmployeeActivation({ dinh_danh: req.body.identifier, mat_khau_tam: req.body.temporaryPassword, otp: req.body.otp, mat_khau_moi: req.body.newPassword });
      const data = result.data || result;
      const token = data.access_token || data.accessToken;
      if (!token) throw new Error('Backend không trả access token sau khi kích hoạt.');
      return await finishLogin(res, token, data, null);
    } catch (error) {
      return renderAuth(res, 'kich-hoat-nhan-vien', 'Kích hoạt tài khoản nhân viên', { identifier: req.body.identifier || '', error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async organizationPage(req, res) {
    if (!req.user) return res.redirect('/auth/dang-nhap');
    const organizations = req.user.don_vi_tham_gia || req.user.donViThamGia || [];
    if (organizations.length === 1) return await finishLogin(res, req.authToken, req.user, req.query.redirect);
    return renderAuth(res, 'chon-don-vi', 'Chọn đơn vị', { redirect: safeRedirect(req.query.redirect) || '/', organizationOptions: organizations.map(item => ({ value: item.id, label: item.ten_hien_thi || item.tenHienThi || item.ten_don_vi || item.tenDonVi || item.ma_don_vi || item.maDonVi })) });
  },
  async selectOrganization(req, res) {
    try {
      const result = await authService.selectOrganization(req.authToken, req.body.don_vi_id);
      return await finishLogin(res, req.authToken, result.data || result, req.body.redirect);
    } catch (error) {
      const organizations = req.user?.don_vi_tham_gia || req.user?.donViThamGia || [];
      return renderAuth(res, 'chon-don-vi', 'Chọn đơn vị', { redirect: safeRedirect(req.body.redirect) || '/', organizationOptions: organizations.map(item => ({ value: item.id, label: item.ten_hien_thi || item.tenHienThi || item.ten_don_vi || item.tenDonVi || item.ma_don_vi || item.maDonVi })), error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async branchPage(req, res) {
    const branches = accessibleBranches(req.user);
    if (branches.length < 2 || req.user?.chi_nhanh_dang_chon_id || req.user?.chiNhanhDangChonId) return await finishLogin(res, req.authToken, req.user, req.query.redirect);
    return renderAuth(res, 'chon-chi-nhanh', 'Chọn chi nhánh', { branches, redirect: safeRedirect(req.query.redirect) || '/' });
  },
  async selectBranch(req, res) {
    try {
      const result = await authService.selectBranch(req.authToken, req.body.chi_nhanh_id);
      return res.redirect(safeRedirect(req.body.redirect) && safeRedirect(req.body.redirect) !== '/' ? safeRedirect(req.body.redirect) : destinationFor(result.data || result));
    } catch (error) {
      return renderAuth(res, 'chon-chi-nhanh', 'Chọn chi nhánh', { branches: accessibleBranches(req.user), redirect: safeRedirect(req.body.redirect) || '/', error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  forgotPasswordPage(req, res) {
    return renderAuth(res, 'quen-mat-khau', 'Quên mật khẩu', { values: { email: req.query.email || '' } });
  },
  async forgotPassword(req, res) {
    try {
      await authService.forgotPassword({ email: req.body.email });
      return res.redirect(`/auth/dat-lai-mat-khau?email=${encodeURIComponent(req.body.email)}&sent=1`);
    } catch (error) {
      return renderAuth(res, 'quen-mat-khau', 'Quên mật khẩu', { emailError: error.message, values: { email: req.body.email || '' } }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  resetPasswordPage(req, res) {
    return renderAuth(res, 'dat-lai-mat-khau', 'Đặt lại mật khẩu', { email: req.query.email || '', requiresOtp: true, codeSent: req.query.sent === '1', values: {}, changeEmailUrl: urlDoiEmail('/auth/quen-mat-khau', req.query.email) });
  },
  async resetPassword(req, res) {
    try {
      if (req.body.newPassword !== req.body.confirmNewPassword) {
        return renderAuth(res, 'dat-lai-mat-khau', 'Đặt lại mật khẩu', { email: req.body.email || '', requiresOtp: true, values: { otp: req.body.otp || '' }, showPasswordStep: true, passwordError: 'Mật khẩu xác nhận chưa khớp.', changeEmailUrl: urlDoiEmail('/auth/quen-mat-khau', req.body.email) }, 400);
      }
      await authService.resetPassword({ email: req.body.email, otp: req.body.otp, mat_khau_moi: req.body.newPassword });
      return res.redirect('/auth/dang-nhap?reset=1');
    } catch (error) {
      return renderAuth(res, 'dat-lai-mat-khau', 'Đặt lại mật khẩu', { email: req.body.email || '', requiresOtp: true, values: { otp: req.body.otp || '' }, otpError: error.message, changeEmailUrl: urlDoiEmail('/auth/quen-mat-khau', req.body.email) }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async refreshSession(req, res) {
    const refreshToken = req.cookies?.[config.env.authRefreshCookieName];
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' });
    try {
      const result = await authService.refresh(refreshToken);
      const data = result.data || result;
      res.cookie(config.env.authCookieName, data.access_token, {
        ...cookieOptions,
        maxAge: Number(data.expires_in || 600) * 1000
      });
      res.cookie(config.env.authRefreshCookieName, data.refresh_token, {
        httpOnly: true,
        secure: config.env.authCookieSecure,
        sameSite: config.env.authCookieSameSite,
        maxAge: config.env.authRefreshCookieMaxAge,
        path: '/'
      });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true });
    } catch (error) {
      if (error.status === 401) {
        res.clearCookie(config.env.authCookieName, { path: '/' });
        res.clearCookie(config.env.authRefreshCookieName, { path: '/' });
      }
      return res.status(error.status || 500).json({ success: false, message: error.message || 'Không làm mới được phiên đăng nhập' });
    }
  },
  async logout(req, res, next) {
    try {
      try {
        await authService.logout(req.authToken);
      } catch (error) {
        if (error.status !== 401) throw error;
      }
      res.clearCookie(config.env.authRefreshCookieName, {
        httpOnly: true,
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
