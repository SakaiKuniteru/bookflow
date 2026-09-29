const notFoundMiddleware = (req, res) => {
  res.status(404).render('feedback/trang-loi', {
    title: 'Không tìm thấy trang',
    statusCode: 404,
    message: 'Trang bạn yêu cầu không tồn tại hoặc đã được thay đổi.'
  });
};

export default notFoundMiddleware;