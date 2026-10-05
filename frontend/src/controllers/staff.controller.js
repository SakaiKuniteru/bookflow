import bookService from '../services/book.service.js';
import inventoryService from '../services/inventory.service.js';
import orderService from '../services/order.service.js';
import borrowService from '../services/borrow.service.js';
import customerService from '../services/customer.service.js';
import profileController from './profile.controller.js';

const staffController = {
  async dashboard(req, res) {
    return res.render('staff/tong-quan', { title: 'Tổng quan', layout: 'staff' });
  },
  profile(req, res, next) { return profileController.render(req, res, next, 'staff'); },
  async books(req, res, next) {
    try {
      const result = await bookService.list(req.query);
      return res.render('staff/sach/danh-sach-sach', {
        title: 'Quản lý sách',
        books: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async createBook(req, res) {
    return res.render('staff/sach/them-sach', {
      title: 'Thêm sách'
    });
  },
  async bookDetail(req, res, next) {
    try {
      const result = await bookService.detail(req.params.id);
      return res.render('staff/sach/chi-tiet-sach', {
        title: 'Chi tiết sách',
        book: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async editBook(req, res, next) {
    try {
      const result = await bookService.detail(req.params.id);
      return res.render('staff/sach/sua-sach', {
        title: 'Sửa sách',
        book: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async inventory(req, res, next) {
    try {
      const result = await inventoryService.stock(req.query);
      return res.render('staff/kho/ton-kho', {
        title: 'Tồn kho',
        stock: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async bookCopies(req, res, next) {
    try {
      const result = await inventoryService.copies(req.query);
      return res.render('staff/kho/ban-sao-sach', {
        title: 'Bản sao sách',
        copies: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async stockImport(req, res, next) {
    try {
      const result = await inventoryService.imports(req.query);
      return res.render('staff/kho/nhap-kho', {
        title: 'Nhập kho',
        imports: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async stockTransfer(req, res, next) {
    try {
      const result = await inventoryService.transfers(req.query);
      return res.render('staff/kho/chuyen-kho', {
        title: 'Chuyển kho',
        transfers: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async sale(req, res) {
    return res.render('staff/ban-hang/ban-hang-tai-quay', {
      title: 'Bán hàng tại quầy'
    });
  },
  async orders(req, res, next) {
    try {
      const result = await orderService.list(req.query);
      return res.render('staff/ban-hang/danh-sach-don', {
        title: 'Danh sách đơn hàng',
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
      return res.render('staff/ban-hang/chi-tiet-don', {
        title: 'Chi tiết đơn hàng',
        order: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async returns(req, res) {
    return res.render('staff/ban-hang/tra-hang', {
      title: 'Trả hàng'
    });
  },
  async borrowList(req, res, next) {
    try {
      const result = await borrowService.list(req.query);
      return res.render('staff/muon-tra/danh-sach-phieu-muon', {
        title: 'Phiếu mượn',
        records: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async createBorrow(req, res) {
    return res.render('staff/muon-tra/tao-phieu-muon', {
      title: 'Tạo phiếu mượn'
    });
  },
  async borrowDetail(req, res, next) {
    try {
      const result = await borrowService.detail(req.params.id);
      return res.render('staff/muon-tra/chi-tiet-phieu-muon', {
        title: 'Chi tiết phiếu mượn',
        borrow: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async receiveReturn(req, res, next) {
    try {
      const result = await borrowService.detail(req.params.id);
      return res.render('staff/muon-tra/nhan-tra-sach', {
        title: 'Nhận trả sách',
        borrow: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async reservations(req, res, next) {
    try {
      const result = await borrowService.reservations(req.query);
      return res.render('staff/muon-tra/danh-sach-dat-truoc', {
        title: 'Danh sách đặt trước',
        reservations: result.data || [],
        meta: result.meta || null
      });
    } catch (error) {
      return next(error);
    }
  },
  async overdue(req, res, next) {
    try {
      const result = await borrowService.list({ status: 'OVERDUE', ...req.query });
      return res.render('staff/muon-tra/sach-qua-han', {
        title: 'Sách quá hạn',
        records: result.data || [],
        meta: result.meta || null
      });
    } catch (error) {
      return next(error);
    }
  },
  async customers(req, res, next) {
    try {
      const result = await customerService.list?.(req.query);
      return res.render('staff/khach-hang/danh-sach-khach-hang', {
        title: 'Khách hàng',
        customers: result?.data || [],
        meta: result?.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async customerDetail(req, res, next) {
    try {
      const result = await customerService.detail?.(req.params.id);
      return res.render('staff/khach-hang/chi-tiet-khach-hang', {
        title: 'Chi tiết khách hàng',
        customer: result?.data || null
      });
    } catch (error) {
      return next(error);
    }
  }
};

export default staffController;
