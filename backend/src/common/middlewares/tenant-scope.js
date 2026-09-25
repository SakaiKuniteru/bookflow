const { AppError } = require('../errors/AppError.js');
const donViRepository = require('../../modules/don-vi/don-vi.repository.js');

async function tenantScope(req, _res, next) {
    try {
        if (!req.auth?.taiKhoanId) {
            throw new AppError({ code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập', status: 401 });
        }
        if (!req.auth.donViId) {
            throw new AppError({ code: 'TENANT_REQUIRED', message: 'Vui lòng chọn đơn vị làm việc', status: 403 });
        }
        const hopLe = await donViRepository.thanhVienDangLam(req.auth.taiKhoanId, req.auth.donViId);
        if (!hopLe) {
            throw new AppError({ code: 'TENANT_FORBIDDEN', message: 'Không có quyền truy cập đơn vị này', status: 403 });
        }
        req.tenant = { id: req.auth.donViId };
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { tenantScope };