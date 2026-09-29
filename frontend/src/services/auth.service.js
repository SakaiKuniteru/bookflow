import { get, post } from './api-client.js';

const login = credentials => post('/xac-thuc/dang-nhap', credentials);

const register = payload => post('/xac-thuc/dang-ky', payload);

const forgotPassword = payload => post('/xac-thuc/quen-mat-khau', payload);

const resetPassword = payload => post('/xac-thuc/dat-lai-mat-khau', payload);

const logout = () => post('/xac-thuc/dang-xuat');

const me = () => get('/tai-khoan/toi');

const meWithToken = token => get('/tai-khoan/toi', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const refresh = () => post('/xac-thuc/lam-moi-phien');

export default {
  login,
  register,
  forgotPassword,
  resetPassword,
  logout,
  me,
  meWithToken,
  refresh
};