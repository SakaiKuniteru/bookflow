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

const authEventOptions = { httpOnly: false, secure: config.env.authCookieSecure, sameSite: config.env.authCookieSameSite, path: '/', maxAge: 315360000000 };
function notifyAuthTabs(res) {
  res.cookie('bookflow_auth_event', String(Date.now()), authEventOptions);
}

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

function layMaVaiTro(context) {
  const vaiTro = context?.vai_tro || context?.vaiTro || [];
  return vaiTro.map(item => typeof item === 'string' ? item : item?.ma_vai_tro || item?.maVaiTro).filter(Boolean);
}
function layMaQuyen(context) {
  const quyen = context?.quyen || context?.permissions || [];
  return quyen.map(item => typeof item === 'string' ? item : item?.ma_quyen || item?.maQuyen).filter(Boolean);
}
function interfaceOptions(context) {
  const vaiTro = layMaVaiTro(context);
  const quyen = layMaQuyen(context);
  const isSuperAdmin = vaiTro.includes('SUPER_ADMIN') || quyen.some(item => item.startsWith('SUPER_ADMIN_'));
  const isAdmin = vaiTro.includes('QUAN_TRI');
  const isStaff = vaiTro.includes('NHAN_VIEN') || vaiTro.includes('THU_THU');
  const options = [];
  if (isSuperAdmin) options.push({ value: 'super-admin', label: 'Super Admin', description: 'Quản trị toàn nền tảng' });
  if (isSuperAdmin || isAdmin) options.push({ value: 'admin', label: 'Admin', description: 'Quản trị đơn vị và hoạt động' });
  if (isSuperAdmin || isAdmin || isStaff) options.push({ value: 'staff', label: 'Nhân viên', description: 'Thực hiện nghiệp vụ tại đơn vị' });
  options.push({ value: 'customer', label: 'Người dùng', description: 'Khám phá, mượn và quản lý sách' });
  return options;
}
function destinationForInterface(value) {
  return { 'super-admin': '/super-admin/tong-quan', admin: '/admin/tong-quan', staff: '/staff/tong-quan', customer: '/customer/tong-quan' }[value] || '/customer/tong-quan';
}
function selectedOrganizationId(context) {
  return context?.don_vi_dang_chon_id || context?.donViDangChonId || null;
}
function selectedBranchId(context) {
  return context?.chi_nhanh_dang_chon_id || context?.chiNhanhDangChonId || null;
}
function accessibleBranches(context) {
  return context?.chi_nhanh_duoc_truy_cap || context?.chiNhanhDuocTruyCap || context?.data?.chi_nhanh_duoc_truy_cap || context?.data?.chiNhanhDuocTruyCap || [];
}
async function finishLogin(req, res, token, context) {
  res.cookie(config.env.authCookieName, token, cookieOptions);
  const refreshToken = context?.refresh_token || context?.refreshToken;
  if (refreshToken) res.cookie(config.env.authRefreshCookieName, refreshToken, { httpOnly: true, secure: config.env.authCookieSecure, sameSite: config.env.authCookieSameSite, maxAge: config.env.authRefreshCookieMaxAge, path: '/' });
  notifyAuthTabs(res);
  const organizations = context?.don_vi_tham_gia || context?.donViThamGia || [];
  if (organizations.length > 1 && !selectedOrganizationId(context)) return res.redirect('/auth/thiet-lap-phien');
  if (organizations.length === 1 && !selectedOrganizationId(context)) {
    const result = await authService.selectOrganization(token, organizations[0].id);
    context = result.data || result;
  }
  const branches = accessibleBranches(context);
  if (branches.length === 1 && !selectedBranchId(context)) {
    const result = await authService.selectBranch(token, branches[0].id);
    context = result.data || result;
  }
  const options = interfaceOptions(context);
  if (options.length === 1) {
    req.session.activeInterface = 'customer';
    delete req.session.pendingLoginIdentifier;
    return res.redirect('/customer/tong-quan');
  }
  return res.redirect('/auth/thiet-lap-phien');
}
const authController = {
  async loginPage(req, res) {
    if (req.user) return await finishLogin(req, res, req.authToken, req.user);
    if (req.session) delete req.session.registrationDraft;
    return renderAuth(res, 'dang-nhap', 'Đăng nhập', {
      redirect: req.query.redirect || '/',
      values: { email: req.session?.pendingLoginIdentifier || '' },
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
      req.session.pendingLoginIdentifier = String(req.body.email || '').trim().slice(0, 254);
      return await finishLogin(req, res, token, data);
    } catch (error) {
    return renderAuth(res, 'dang-nhap', 'Đăng nhập', {
      error: error.message,
      values: { email: req.body.email || req.session?.pendingLoginIdentifier || '' },
      redirect: safeRedirect(req.body.redirect) || '/',
      allowRegistration: true,
      loginFailed: true
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
      return await finishLogin(req, res, token, data);
    } catch (error) {
      return renderAuth(res, 'kich-hoat-nhan-vien', 'Kích hoạt tài khoản nhân viên', { identifier: req.body.identifier || '', error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async workspaceSetupPage(req, res) {
    if (!req.user) return res.redirect('/auth/dang-nhap');
    const organizations = req.user.don_vi_tham_gia || req.user.donViThamGia || [];
    if (organizations.length === 1 && !selectedOrganizationId(req.user)) {
      const result = await authService.selectOrganization(req.authToken, organizations[0].id);
      return res.redirect('/auth/thiet-lap-phien');
    }
    const options = interfaceOptions(req.user);
    if (options.length === 1) return res.redirect('/customer/tong-quan');
    return renderAuth(res, 'thiet-lap-phien', 'Thiết lập phiên làm việc', {
      sessionSetup: true,
      showOrganization: organizations.length > 1 && !selectedOrganizationId(req.user),
      organizationOptions: organizations.map(item => ({ value: item.id, label: item.ten_hien_thi || item.tenHienThi || item.ten_don_vi || item.tenDonVi || item.ma_don_vi || item.maDonVi })),
      showBranch: accessibleBranches(req.user).length > 1 && !selectedBranchId(req.user),
      branchOptions: accessibleBranches(req.user).map(item => ({ value: item.id, label: item.tenChiNhanh || item.ten_chi_nhanh || item.maChiNhanh || item.ma_chi_nhanh })),
      interfaceOptions: options,
      error: req.query.error || ''
    });
  },
  async confirmWorkspaceSetup(req, res) {
    try {
      let context = req.user;
      const organizations = context?.don_vi_tham_gia || context?.donViThamGia || [];
      if (organizations.length > 1 && !selectedOrganizationId(context)) {
        if (!req.body.don_vi_id) return res.redirect('/auth/thiet-lap-phien?error=Vui+l%C3%B2ng+ch%E1%BB%8Dn+%C4%91%C6%A1n+v%E1%BB%8B');
        await authService.selectOrganization(req.authToken, req.body.don_vi_id);
        return res.redirect('/auth/thiet-lap-phien');
      }
      let branches = accessibleBranches(context);
      if (branches.length > 1 && !selectedBranchId(context)) {
        const branch = branches.find(item => String(item.id) === String(req.body.chi_nhanh_id));
        if (!branch) return res.redirect('/auth/thiet-lap-phien?error=Vui+l%C3%B2ng+ch%E1%BB%8Dn+chi+nh%C3%A1nh');
        const result = await authService.selectBranch(req.authToken, branch.id);
        context = result.data || result;
      } else if (branches.length === 1 && !selectedBranchId(context)) {
        const result = await authService.selectBranch(req.authToken, branches[0].id);
        context = result.data || result;
      }
      const option = interfaceOptions(context).find(item => item.value === req.body.interface);
      if (!option) return res.status(403).redirect('/auth/thiet-lap-phien?error=Giao+di%E1%BB%87n+kh%C3%B4ng+h%E1%BB%A3p+l%E1%BB%87+v%E1%BB%9Bi+quy%E1%BB%81n+t%C3%A0i+kho%E1%BA%A3n');
      req.session.activeInterface = option.value;
      delete req.session.pendingLoginIdentifier;
      return res.redirect(destinationForInterface(option.value));
    } catch (error) {
      return res.redirect(`/auth/thiet-lap-phien?error=${encodeURIComponent(error.message || 'Không thể thiết lập phiên làm việc')}`);
    }
  },
  async organizationPage(req, res) {
    if (!req.user) return res.redirect('/auth/dang-nhap');
    const organizations = req.user.don_vi_tham_gia || req.user.donViThamGia || [];
    if (organizations.length === 1) return await finishLogin(req, res, req.authToken, req.user);
    return renderAuth(res, 'chon-don-vi', 'Chọn đơn vị', { redirect: safeRedirect(req.query.redirect) || '/', organizationOptions: organizations.map(item => ({ value: item.id, label: item.ten_hien_thi || item.tenHienThi || item.ten_don_vi || item.tenDonVi || item.ma_don_vi || item.maDonVi })) });
  },
  async selectOrganization(req, res) {
    try {
      const result = await authService.selectOrganization(req.authToken, req.body.don_vi_id);
      return await finishLogin(req, res, req.authToken, result.data || result);
    } catch (error) {
      const organizations = req.user?.don_vi_tham_gia || req.user?.donViThamGia || [];
      return renderAuth(res, 'chon-don-vi', 'Chọn đơn vị', { redirect: safeRedirect(req.body.redirect) || '/', organizationOptions: organizations.map(item => ({ value: item.id, label: item.ten_hien_thi || item.tenHienThi || item.ten_don_vi || item.tenDonVi || item.ma_don_vi || item.maDonVi })), error: error.message }, error.status >= 400 && error.status < 500 ? error.status : 500);
    }
  },
  async branchPage(req, res) {
    const branches = accessibleBranches(req.user);
    if (branches.length < 2 || req.user?.chi_nhanh_dang_chon_id || req.user?.chiNhanhDangChonId) return await finishLogin(req, res, req.authToken, req.user);
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
    const accessToken = req.cookies?.[config.env.authCookieName];
    if (!refreshToken && !accessToken) return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' });
    try {
      const result = await authService.refresh(refreshToken, accessToken);
      const data = result.data || result;
      const accessTokenMoi = data.accessToken || data.access_token;
      const refreshTokenMoi = data.refreshToken || data.refresh_token;
      if (!accessTokenMoi || !refreshTokenMoi) return res.status(502).json({ success: false, message: 'Backend không trả đủ token để gia hạn phiên' });
      res.cookie(config.env.authCookieName, accessTokenMoi, { ...cookieOptions, maxAge: config.env.authCookieMaxAge });
      res.cookie(config.env.authRefreshCookieName, refreshTokenMoi, {
        httpOnly: true,
        secure: config.env.authCookieSecure,
        sameSite: config.env.authCookieSameSite,
        maxAge: config.env.authRefreshCookieMaxAge,
        path: '/'
      });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, accessToken: accessTokenMoi });
    } catch (error) {
      if (error.status === 401) {
        res.clearCookie(config.env.authCookieName, cookieOptions);
        res.clearCookie(config.env.authRefreshCookieName, cookieOptions);
        notifyAuthTabs(res);
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
      res.clearCookie(config.env.authCookieName, cookieOptions);
      res.clearCookie(config.env.authRefreshCookieName, cookieOptions);
      notifyAuthTabs(res);
      const quayVeDangNhap = req.body?.dangNhapLai === '1';
      if (req.session) {
        delete req.session.activeInterface;
        if (!quayVeDangNhap) delete req.session.pendingLoginIdentifier;
      }
      return res.redirect(quayVeDangNhap ? '/auth/dang-nhap?doi-giao-dien=1' : '/');
    } catch (error) {
      return next(error);
    }
  }
};

export default authController;
