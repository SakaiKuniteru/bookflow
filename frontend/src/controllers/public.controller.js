import bookService from '../services/book.service.js';

const publicController = {
  async home(req, res, next) {
    try {
      const result = await bookService.list({ limit: 12 });
      return res.render('public/trang-chu', {
        title: 'BookFlow',
        books: result.data || []
      });
    } catch (error) {
      return next(error);
    }
  },
  async books(req, res, next) {
    try {
      const result = await bookService.list(req.query);
      return res.render('public/danh-sach-sach', {
        title: 'Danh sách sách',
        books: result.data || [],
        meta: result.meta || null,
        filters: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async bookDetail(req, res, next) {
    try {
      const result = await bookService.detail(req.params.id);
      return res.render('public/chi-tiet-sach', {
        title: result.data?.title || result.data?.ten || 'Chi tiết sách',
        book: result.data
      });
    } catch (error) {
      return next(error);
    }
  },
  async search(req, res, next) {
    try {
      const result = await bookService.search(req.query);
      return res.render('public/tim-kiem', {
        title: 'Tìm kiếm sách',
        results: result.data || [],
        meta: result.meta || null,
        query: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async membership(req, res) {
    return res.render('public/goi-hoi-vien', {
      title: 'Gói hội viên'
    });
  },
  async about(req, res) {
    return res.render('public/gioi-thieu', {
      title: 'Giới thiệu BookFlow'
    });
  }
};

export default publicController;