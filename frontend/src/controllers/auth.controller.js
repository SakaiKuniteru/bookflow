import config from '../config/index.js';
import authService from '../services/auth.service.js';

const cookieOptions = {
  httpOnly: config.env.sessionCookieHttpOnly,
  secure: config.env.authCookieSecure,
  sameSite: config.env.authCookieSameSite,
  maxAge: config.env.authCookieMaxAge,
  path: '/'
};

function renderAuth(res, page, title, locals = {}, status = 200) {
  return res.status(status).render(`pages/auth/${page}`, { layout: 'auth', title, ...locals });
}
function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null;
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
  return res.redirect(redirect && redirect !== '/' ? redirect : destinationFor(context));
}

const authController = {
  async loginPage(req, res) {
    if (req.user) return await finishLogin(res, req.authToken, req.user, req.query.redirect);
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
    return renderAuth(res, 'dang-ky', 'Đăng ký', { values: {} });
  },
  async register(req, res) {
    try {
      if (!req.body.acceptTerms) throw Object.assign(new Error('Bạn cần đồng ý với điều khoản sử dụng.'), { status: 400 });
      if (req.body.password !== req.body.passwordConfirm) throw Object.assign(new Error('Mật khẩu xác nhận chưa khớp.'), { status: 400 });
      await authService.register({ ho_ten: req.body.fullName, email: req.body.email, mat_khau: req.body.password });
      return res.redirect(`/auth/xac-minh-dang-ky?email=${encodeURIComponent(req.body.email)}`);
    } catch (error) {
      return renderAuth(res, 'dang-ky', 'Đăng ký', {
        error: error.message,
        values: { fullName: req.body.fullName || '', email: req.body.email || '' }
      }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  verifyRegistrationPage(req, res) {
    return renderAuth(res, 'xac-minh-dang-ky', 'Xác minh email', { email: req.query.email || '', success: req.query.sent === '1' ? 'Mã xác minh đã được gửi lại.' : '' });
  },
  async verifyRegistration(req, res) {
    try {
      await authService.verifyRegistration({ email: req.body.email, otp: req.body.otp });
      return res.redirect('/auth/dang-nhap?registered=1');
    } catch (error) {
      return renderAuth(res, 'xac-minh-dang-ky', 'Xác minh email', { email: req.body.email || '', otp: req.body.otp || '', error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async resendRegistrationOtp(req, res) {
    try {
      await authService.resendRegistrationOtp({ email: req.body.email });
      return res.redirect(`/auth/xac-minh-dang-ky?email=${encodeURIComponent(req.body.email)}&sent=1`);
    } catch (error) {
      return renderAuth(res, 'xac-minh-dang-ky', 'Xác minh email', { email: req.body.email || '', error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
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
    return renderAuth(res, 'quen-mat-khau', 'Quên mật khẩu', { values: {} });
  },
  async forgotPassword(req, res) {
    try {
      await authService.forgotPassword({ email: req.body.email });
      return res.redirect(`/auth/dat-lai-mat-khau?email=${encodeURIComponent(req.body.email)}`);
    } catch (error) {
      return renderAuth(res, 'quen-mat-khau', 'Quên mật khẩu', { error: error.message, values: { email: req.body.email || '' } }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  resetPasswordPage(req, res) {
    return renderAuth(res, 'dat-lai-mat-khau', 'Đặt lại mật khẩu', { email: req.query.email || '', requiresOtp: true, values: {} });
  },
  async resetPassword(req, res) {
    try {
      if (req.body.newPassword !== req.body.confirmNewPassword) throw Object.assign(new Error('Mật khẩu xác nhận chưa khớp.'), { status: 400 });
      await authService.resetPassword({ email: req.body.email, otp: req.body.otp, mat_khau_moi: req.body.newPassword });
      return res.redirect('/auth/dang-nhap?reset=1');
    } catch (error) {
      return renderAuth(res, 'dat-lai-mat-khau', 'Đặt lại mật khẩu', { email: req.body.email || '', requiresOtp: true, values: { otp: req.body.otp || '' }, error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async logout(req, res, next) {
    try {
      try {
        await authService.logout(req.authToken);
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
