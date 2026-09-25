const { AppError } = require('../errors/AppError.js');
const phanQuyenService = require('../../modules/phan-quyen/phan-quyen.service.js');

function authorize(maQuyen, { phamVi = 'DON_VI' } = {}) {
    if (typeof maQuyen !== 'string' || !maQuyen.trim()) throw new TypeError('Mã quyền không hợp lệ');
    if (!['DON_VI', 'CHI_NHANH'].includes(phamVi)) throw new TypeError('Phạm vi phân quyền không hợp lệ');
    return async (req, _res, next) => {
        try {
            if (!req.auth?.taiKhoanId) {
                throw new AppError({ code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập', status: 401 });
            }
            if (!req.auth.donViId) {
                throw new AppError({ code: 'TENANT_REQUIRED', message: 'Vui lòng chọn đơn vị làm việc', status: 403 });
            }
            let chiNhanhId = null;
            if (phamVi === 'CHI_NHANH') {
                if (!req.branch?.id || req.branch.donViId !== req.auth.donViId) {
                    throw new AppError({ code: 'BRANCH_REQUIRED', message: 'Vui lòng chọn chi nhánh làm việc hợp lệ', status: 403 });
                }
                chiNhanhId = req.branch.id;
            }
            const duocPhep = await phanQuyenService.kiemTraQuyen(req.auth, maQuyen, { phamVi, chiNhanhId });
            if (!duocPhep) {
                throw new AppError({ code: 'FORBIDDEN', message: 'Không có quyền thực hiện thao tác', status: 403 });
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { authorize };