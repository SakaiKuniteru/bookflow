const normalizePermissions = user => {
  if (!user) return [];
  const values = Array.isArray(user.permissions) ? user.permissions : Array.isArray(user.quyen) ? user.quyen : Array.isArray(user.permissionCodes) ? user.permissionCodes : [];
  return values.map(item => typeof item === 'string' ? item : item?.ma_quyen).filter(Boolean);
};

const permissionMiddleware = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect(`/auth/dang-nhap?redirect=${encodeURIComponent(req.originalUrl || '/')}`);
    }
    const permissions = normalizePermissions(req.user);
    const hasPermission = requiredPermissions.length === 0 || requiredPermissions.some(permission => permissions.includes(permission));
    if (hasPermission) return next();
    return res.status(403).render('feedback/khong-du-quyen', {
      title: 'Không đủ quyền truy cập',
      requiredPermissions,
      user: req.user
    });
  };
};

export default permissionMiddleware;
