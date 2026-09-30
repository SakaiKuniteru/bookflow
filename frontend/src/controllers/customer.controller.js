import customerService from '../services/customer.service.js';
import orderService from '../services/order.service.js';
import borrowService from '../services/borrow.service.js';
import notificationService from '../services/notification.service.js';

const customerController = {
  async dashboard(req, res, next) {
    return res.render('customer/tong-quan', { title: 'Tổng quan', layout: 'customer' });
  },
  async cart(req, res, next) {
    try {
      const result = await orderService.cart();
      return res.render('customer/gio-hang', {
        title: 'Giỏ hàng',
        cart: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async checkout(req, res, next) {
    try {
      const result = await orderService.cart();
      return res.render('customer/thanh-toan', {
        title: 'Thanh toán',
        cart: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async orders(req, res, next) {
    try {
      const result = await orderService.list(req.query);
      return res.render('customer/don-hang', {
        title: 'Đơn hàng',
        orders: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async orderDetail(req, res, next) {
    try {
      const result = await orderService.detail(req.params.id);
      return res.render('customer/chi-tiet-don-hang', {
        title: 'Chi tiết đơn hàng',
        order: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async borrowRequests(req, res, next) {
    try {
      const result = await borrowService.list({ status: 'REQUESTED', ...req.query });
      return res.render('customer/yeu-cau-muon', {
        title: 'Yêu cầu mượn',
        requests: result.data || [],
        meta: result.meta || null
      });
    } catch (error) {
      return next(error);
    }
  },
  async borrowingBooks(req, res, next) {
    try {
      const result = await borrowService.list({ status: 'BORROWING', ...req.query });
      return res.render('customer/sach-dang-muon', {
        title: 'Sách đang mượn',
        records: result.data || [],
        meta: result.meta || null
      });
    } catch (error) {
      return next(error);
    }
  },
  async borrowDetail(req, res, next) {
    try {
      const result = await borrowService.detail(req.params.id);
      return res.render('customer/chi-tiet-phieu-muon', {
        title: 'Chi tiết phiếu mượn',
        borrow: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async reservations(req, res, next) {
    try {
      const result = await borrowService.reservations(req.query);
      return res.render('customer/dat-truoc-sach', {
        title: 'Đặt trước sách',
        reservations: result.data || [],
        meta: result.meta || null
      });
    } catch (error) {
      return next(error);
    }
  },
  async membership(req, res, next) {
    try {
      const result = await customerService.membership();
      return res.render('customer/hoi-vien', {
        title: 'Hội viên',
        membership: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async notifications(req, res, next) {
    try {
      const result = await notificationService.list(req.query);
      return res.render('customer/thong-bao', {
        title: 'Thông báo',
        notifications: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async profile(req, res, next) {
    try {
      const result = await customerService.profile();
      return res.render('customer/ho-so', {
        title: 'Hồ sơ',
        profile: result.data
      });
    } catch (error) {
      return next(error);
    }
  }
};

export default customerController;
