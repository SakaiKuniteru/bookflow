import { existsSync } from 'node:fs';
import path from 'node:path';
import profileController from './profile.controller.js';
const render = (view, title) => async (req, res) => {
  const viewPath = path.join(req.app.get('views'), `${view}.hbs`);
  const viewDaCo = existsSync(viewPath);
  return res.render(viewDaCo ? view : 'admin/chua-trien-khai', {
    title,
    layout: 'admin'
  });
};

const adminController = {
  async dashboard(req, res) {
    return res.render('admin/tong-quan', { title: 'Tổng quan quản trị', layout: 'admin' });
  },
  profile(req, res, next) { return profileController.render(req, res, next, 'admin'); },
  branches: render('admin/chi-nhanh', 'Chi nhánh'),
  employees: render('admin/nhan-vien', 'Nhân viên'),
  permissions: render('admin/phan-quyen', 'Phân quyền'),
  books: render('admin/sach', 'Quản lý sách'),
  suppliers: render('admin/nha-cung-cap', 'Nhà cung cấp'),
  warehouses: render('admin/kho', 'Kho'),
  customers: render('admin/khach-hang', 'Khách hàng'),
  memberships: render('admin/hoi-vien', 'Hội viên'),
  borrowPolicies: render('admin/chinh-sach-muon', 'Chính sách mượn'),
  payments: render('admin/thanh-toan', 'Thanh toán'),
  reports: render('admin/bao-cao', 'Báo cáo'),
  settings: render('admin/cai-dat', 'Cài đặt')
};

export default adminController;
