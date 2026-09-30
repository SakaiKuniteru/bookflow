import { get, post } from './api-client.js';
const login = credentials => post('/xac-thuc/dang-nhap', credentials);
const register = payload => post('/xac-thuc/dang-ky', payload);
const verifyRegistration = payload => post('/xac-thuc/xac-nhan-dang-ky', payload);
const resendRegistrationOtp = payload => post('/xac-thuc/gui-lai-otp-dang-ky', payload);
const completeEmployeeActivation = payload => post('/xac-thuc/hoan-tat-nhan-vien', payload);
const forgotPassword = payload => post('/xac-thuc/quen-mat-khau', payload);
const resetPassword = payload => post('/xac-thuc/dat-lai-mat-khau', payload);
const logout = token => post('/xac-thuc/dang-xuat', {}, { headers: { Authorization: `Bearer ${token}` } });
const me = token => get('/xac-thuc/me', { headers: { Authorization: `Bearer ${token}` } });
const meWithToken = token => get('/xac-thuc/me', {
  headers: { Authorization: `Bearer ${token}` }
});
const selectOrganization = (token, organizationId) => post('/xac-thuc/chon-don-vi', { don_vi_id: organizationId }, { headers: { Authorization: `Bearer ${token}` } });
const selectBranch = (token, branchId) => post('/chi-nhanh/chon', { chi_nhanh_id: branchId }, { headers: { Authorization: `Bearer ${token}` } });
const refresh = () => post('/xac-thuc/lam-moi-phien');
export default {
  login,
  register,
  verifyRegistration,
  resendRegistrationOtp,
  completeEmployeeActivation,
  forgotPassword,
  resetPassword,
  logout,
  me,
  meWithToken,
  selectOrganization,
  selectBranch,
  refresh
};
