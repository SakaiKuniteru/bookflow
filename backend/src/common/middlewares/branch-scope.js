import { AppError } from '../errors/AppError.js';
import { kiemTraQuyen } from '../../modules/phan-quyen/phan-quyen.service.js';
import {
    layChiNhanh,
    phanCongHieuLuc
} from '../../modules/chi-nhanh/chi-nhanh.repository.js';

export async function branchScope(req, _res, next) {
    try {
        if (!req.auth?.taiKhoanId) {
            throw new AppError({
                code: 'UNAUTHORIZED',
                message: 'Vui lòng đăng nhập',
                status: 401
            });
        }

        if (!req.auth.donViId || req.tenant?.id !== req.auth.donViId) {
            throw new AppError({
                code: 'TENANT_REQUIRED',
                message: 'Vui lòng chọn đơn vị làm việc hợp lệ',
                status: 403
            });
        }

        if (!req.auth.chiNhanhId) {
            throw new AppError({
                code: 'BRANCH_REQUIRED',
                message: 'Vui lòng chọn chi nhánh làm việc',
                status: 403
            });
        }

        const chiNhanh = await layChiNhanh(
            req.auth.donViId,
            req.auth.chiNhanhId
        );

        if (!chiNhanh || chiNhanh.trang_thai !== 'DANG_DUNG') {
            throw new AppError({
                code: 'BRANCH_INACTIVE',
                message: 'Chi nhánh không còn hoạt động',
                status: 403
            });
        }

        const quanLyDonVi = await kiemTraQuyen(
            req.auth,
            'branches.manage'
        );

        if (!quanLyDonVi) {
            const phanCong = await phanCongHieuLuc(
                req.auth.donViId,
                req.auth.taiKhoanId,
                chiNhanh.id
            );

            if (!phanCong) {
                throw new AppError({
                    code: 'BRANCH_FORBIDDEN',
                    message: 'Không có quyền truy cập chi nhánh',
                    status: 403
                });
            }
        }

        req.branch = {
            id: chiNhanh.id,
            donViId: chiNhanh.don_vi_id
        };

        next();
    } catch (error) {
        next(error);
    }
}