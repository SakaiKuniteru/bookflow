const normalizePermissions = user => {
  if (!user) return [];
  if (Array.isArray(user.permissions)) return user.permissions;
  if (Array.isArray(user.quyen)) return user.quyen;
  if (Array.isArray(user.permissionCodes)) return user.permissionCodes;
  return [];
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