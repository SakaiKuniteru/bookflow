const destinations = { 'super-admin': '/super-admin/tong-quan', admin: '/admin/tong-quan', staff: '/staff/tong-quan', customer: '/customer/tong-quan' };
const requireActiveInterface = requiredInterface => (req, res, next) => {
  const activeInterface = req.session?.activeInterface;
  if (!activeInterface) return res.redirect('/auth/thiet-lap-phien');
  if (activeInterface !== requiredInterface) return res.redirect(destinations[activeInterface] || '/auth/thiet-lap-phien');
  next();
};
export default requireActiveInterface;