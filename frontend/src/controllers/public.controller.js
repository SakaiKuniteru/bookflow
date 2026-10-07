import bookService from '../services/book.service.js';

function presentBook(item = {}, authenticated = false) {
  const title = item.tenHienThi || item.tenSach || 'Sách chưa có tên';
  const buyRedirect = encodeURIComponent(`/sach/${item.id}?intent=buy`);
  const borrowRedirect = encodeURIComponent(`/sach/${item.id}?intent=borrow`);
  return { ...item, title, subtitle: item.tenPhu || '', authorsDisplay: item.tacGia || '', categoryName: item.theLoai || '', isbn: item.isbn || '', description: item.moTaDayDu || item.moTaNgan || '', href: `/sach/${item.id}`, statusLabel: 'Đang phát hành', statusCode: 'DANG_HIEN_THI', statusVariant: 'success', actions: [{ label: 'Mua sách', variant: 'primary', href: authenticated ? '/customer/gio-hang' : `/auth/dang-nhap?redirect=${buyRedirect}` }, { label: 'Mượn sách', variant: 'secondary', href: authenticated ? '/customer/yeu-cau-muon' : `/auth/dang-nhap?redirect=${borrowRedirect}` }] };
}
function pageData(result, authenticated = false) {
  const data = result.data || {};
  return { books: (data.sach || []).map(item => presentBook(item, authenticated)), meta: data.phanTrang || null };
}

const publicController = {
  async home(req, res, next) {
    try {
      const result = await bookService.publicList({ page: 1, pageSize: 8 });
      const books = pageData(result, Boolean(req.user)).books;
      return res.render('pages/public/trang-chu', {
        title: 'BookFlow',
        featuredBooks: books.slice(0, 4),
        newBooks: books.slice(4, 8),
        hero: { eyebrow: 'Không gian dành cho người yêu sách', title: 'Mỗi cuốn sách mở ra một hành trình mới', description: 'Khám phá sách, tìm chi nhánh phù hợp và lựa chọn cách đọc theo nhịp sống của bạn.' },
        introduction: { eyebrow: 'Đọc theo cách của bạn', title: 'Một thư viện, nhiều cách khám phá', description: 'Duyệt danh mục công khai trước khi đăng nhập. Khi bạn muốn mua, mượn hoặc đặt trước, BookFlow sẽ hướng dẫn đăng nhập để tiếp tục.', href: '/sach', linkLabel: 'Khám phá danh mục' }
      });
    } catch (error) {
      return res.render('pages/public/trang-chu', {
        title: 'BookFlow',
        featuredBooks: [],
        newBooks: [],
        catalogUnavailable: true
      });
    }
  },
  async books(req, res, next) {
    try {
      const result = await bookService.publicList({ page: req.query.page, pageSize: req.query.pageSize || req.query.limit, q: req.query.q });
      const { books, meta } = pageData(result, Boolean(req.user));
      return res.render('pages/public/danh-sach-sach', {
        title: 'Danh sách sách',
        books,
        meta,
        filters: req.query,
        pagination: (() => { const page = meta?.trang || meta?.page || 1; const pageSize = meta?.kichThuoc || meta?.pageSize || 20; const total = meta?.tongSo || meta?.total || 0; return { enabled: true, page, pageSize, total, totalPages: meta?.tongTrang || meta?.totalPages || 0, pages: meta?.tongTrang || meta?.totalPages || 0, from: total ? (page - 1) * pageSize + 1 : 0, to: Math.min(page * pageSize, total) }; })()
      });
    } catch (error) {
      return next(error);
    }
  },
  async bookDetail(req, res, next) {
    try {
      const result = await bookService.publicDetail(req.params.id);
      const book = presentBook(result.data || {}, Boolean(req.user));
      return res.render('pages/public/chi-tiet-sach', {
        title: book.title || 'Chi tiết sách',
        book,
        intentMessage: req.query.intent === 'buy' ? 'Đăng nhập xong bạn có thể tiếp tục mua sách này.' : req.query.intent === 'borrow' ? 'Đăng nhập xong bạn có thể tiếp tục gửi yêu cầu mượn sách này.' : ''
      });
    } catch (error) {
      return next(error);
    }
  },
  async search(req, res, next) {
    try {
      const result = await bookService.publicSearch({ page: req.query.page, pageSize: req.query.pageSize, q: req.query.q });
      const { books, meta } = pageData(result, Boolean(req.user));
      return res.render('pages/public/tim-kiem', {
        title: 'Tìm kiếm sách',
        results: books,
        meta,
        query: req.query
      });
    } catch (error) {
      return next(error);
    }
  },
  async membership(req, res) {
    return res.render('pages/public/goi-hoi-vien', {
      title: 'Gói hội viên'
    });
  },
  async about(req, res) {
    return res.render('pages/public/gioi-thieu', {
      title: 'Giới thiệu BookFlow'
    });
  }
};

export default publicController;
