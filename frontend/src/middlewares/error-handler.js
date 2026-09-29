const errorHandler = (error, req, res, next) => {
  const status = error.status || 500;
  const requestId = req.requestId;
  console.error(`[FRONTEND][${requestId}]`, error);
  if (res.headersSent) return next(error);
  if (error.isBackendUnavailable) {
    return res.status(503).render('feedback/trang-loi', {
      title: 'Hệ thống đang tạm thời gián đoạn',
      statusCode: 503,
      message: 'Không thể kết nối tới hệ thống xử lý dữ liệu. Vui lòng thử lại sau.',
      requestId
    });
  }
  if (status === 401) {
    return res.redirect(`/auth/dang-nhap?redirect=${encodeURIComponent(req.originalUrl || '/')}`);
  }
  if (status === 403) {
    return res.status(403).render('feedback/khong-du-quyen', {
      title: 'Không đủ quyền truy cập',
      statusCode: 403,
      message: error.message || 'Bạn không có quyền thực hiện thao tác này.',
      requestId,
      user: req.user
    });
  }
  if (status === 404) {
    return res.status(404).render('feedback/trang-loi', {
      title: 'Không tìm thấy dữ liệu',
      statusCode: 404,
      message: error.message || 'Dữ liệu bạn yêu cầu không tồn tại.',
      requestId
    });
  }
  if (status >= 400 && status < 500) {
    return res.status(status).render('feedback/trang-loi', {
      title: 'Yêu cầu không hợp lệ',
      statusCode: status,
      message: error.message || 'Yêu cầu không thể được xử lý.',
      requestId
    });
  }
  return res.status(500).render('feedback/trang-loi', {
    title: 'Đã xảy ra lỗi',
    statusCode: 500,
    message: 'Hệ thống gặp lỗi ngoài dự kiến. Vui lòng thử lại sau.',
    requestId
  });
};

export default errorHandler;