import { AppError } from '../../common/errors/AppError.js';
import { trongGiaoDich } from '../../database/transaction.js';
import { kiemTraQuyen } from '../phan-quyen/phan-quyen.service.js';
import { capNhatChiNhanhHopLe, chiNhanhMoiHopLe, phanCongHopLe, trangThaiChiNhanhHopLe, uuidHopLe } from './chi-nhanh.validation.js';
import * as repo from './chi-nhanh.repository.js';

function loi(message, status = 403, code = 'FORBIDDEN') {
    return new AppError({ code, message, status });
}

async function yeuCauQuanLy(auth, chiNhanhId = null, client) {
    if (await kiemTraQuyen(auth, 'branches.manage', {}, client)) return;
    if (chiNhanhId && await kiemTraQuyen(auth, 'branches.manage', { phamVi: 'CHI_NHANH', chiNhanhId }, client)) return;
    throw loi('Không có quyền quản lý chi nhánh');
}

export async function danhSachChiNhanh(auth) {
    const xemTatCa = await kiemTraQuyen(auth, 'branches.manage');
    return { chi_nhanh: await repo.danhSachChiNhanh(auth.donViId, auth.taiKhoanId, xemTatCa) };
}

export async function chiTietChiNhanh(auth, chiNhanhId) {
    uuidHopLe(chiNhanhId, 'Chi nhánh');
    const chiNhanh = await repo.layChiNhanh(auth.donViId, chiNhanhId);
    if (!chiNhanh) throw loi('Không tìm thấy chi nhánh', 404, 'NOT_FOUND');
    const quanLyDonVi = await kiemTraQuyen(auth, 'branches.manage');
    const quanLyChiNhanh = chiNhanh.trang_thai === 'DANG_DUNG'
        && await kiemTraQuyen(auth, 'branches.manage', { phamVi: 'CHI_NHANH', chiNhanhId });
    const coPhanCong = await repo.phanCongHieuLuc(auth.donViId, auth.taiKhoanId, chiNhanhId);
    if (!quanLyDonVi && !quanLyChiNhanh && !coPhanCong) throw loi('Không có quyền xem chi nhánh');
    return chiNhanh;
}

export async function taoChiNhanh(auth, body, requestId) {
    const duLieu = chiNhanhMoiHopLe(body);
    return trongGiaoDich(async client => {
        await yeuCauQuanLy(auth, null, client);
        let chiNhanh;
        try { chiNhanh = await repo.taoChiNhanhDb(auth.donViId, auth.taiKhoanId, duLieu, client); }
        catch (error) {
            if (error.code === '23505') throw loi('Mã chi nhánh đã tồn tại trong đơn vị', 409, 'BRANCH_EXISTS');
            throw error;
        }
        await repo.ghiNhatKyChiNhanh({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongId: chiNhanh.id, hanhDong: 'branch.create', requestId
        }, client);
        return chiNhanh;
    });
}

export async function capNhatChiNhanh(auth, chiNhanhId, body, requestId) {
    uuidHopLe(chiNhanhId, 'Chi nhánh');
    const duLieu = capNhatChiNhanhHopLe(body);
    return trongGiaoDich(async client => {
        const chiNhanh = await repo.layChiNhanh(auth.donViId, chiNhanhId, client, true);
        if (!chiNhanh) throw loi('Không tìm thấy chi nhánh', 404, 'NOT_FOUND');
        if (chiNhanh.trang_thai !== 'DANG_DUNG') throw loi('Chi nhánh đang tạm khóa', 409, 'BRANCH_INACTIVE');
        await yeuCauQuanLy(auth, chiNhanhId, client);
        if (duLieu.quan_ly_thanh_vien_id) {
            const thanhVien = await repo.layThanhVien(auth.donViId, duLieu.quan_ly_thanh_vien_id, client);
            const phanCong = await repo.phanCongTheoThanhVien(auth.donViId, duLieu.quan_ly_thanh_vien_id, chiNhanhId, client);
            if (!thanhVien || thanhVien.trang_thai !== 'DANG_LAM' || !phanCong) throw loi('Người quản lý chưa được phân công vào chi nhánh', 422, 'INVALID_MANAGER');
        }
        const ketQua = await repo.capNhatChiNhanhDb(auth.donViId, chiNhanhId, auth.taiKhoanId, duLieu, client);
        await repo.ghiNhatKyChiNhanh({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongId: chiNhanhId, hanhDong: 'branch.update', requestId
        }, client);
        return ketQua;
    });
}

export async function doiTrangThaiChiNhanh(auth, chiNhanhId, body, requestId) {
    uuidHopLe(chiNhanhId, 'Chi nhánh');
    const trangThai = trangThaiChiNhanhHopLe(body);
    return trongGiaoDich(async client => {
        const chiNhanh = await repo.layChiNhanh(auth.donViId, chiNhanhId, client, true);
        if (!chiNhanh) throw loi('Không tìm thấy chi nhánh', 404, 'NOT_FOUND');
        await yeuCauQuanLy(auth, null, client);
        if (!['DANG_DUNG', 'TAM_KHOA'].includes(chiNhanh.trang_thai)) throw loi('Không thể thay đổi trạng thái chi nhánh này', 409, 'INVALID_BRANCH_STATE');
        if (chiNhanh.trang_thai === trangThai) {
            return {
                id: chiNhanh.id, ma_chi_nhanh: chiNhanh.ma_chi_nhanh,
                ten_chi_nhanh: chiNhanh.ten_chi_nhanh, trang_thai: chiNhanh.trang_thai
            };
        }
        const ketQua = await repo.doiTrangThaiChiNhanh(auth.donViId, chiNhanhId, auth.taiKhoanId, trangThai, client);
        if (trangThai === 'TAM_KHOA') await repo.boChiNhanhKhoiPhien(auth.donViId, chiNhanhId, null, client);
        await repo.ghiNhatKyChiNhanh({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongId: chiNhanhId, hanhDong: `branch.${trangThai === 'TAM_KHOA' ? 'suspend' : 'resume'}`, requestId
        }, client);
        return ketQua;
    });
}

export async function chonChiNhanh(auth, body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1) throw loi('Dữ liệu chọn chi nhánh không hợp lệ', 422, 'INVALID_INPUT');
    const chiNhanhId = uuidHopLe(body.chi_nhanh_id, 'Chi nhánh');
    return trongGiaoDich(async client => {
        const chiNhanh = await repo.layChiNhanh(auth.donViId, chiNhanhId, client, true);
        if (!chiNhanh || chiNhanh.trang_thai !== 'DANG_DUNG') throw loi('Chi nhánh không hoạt động', 404, 'NOT_FOUND');
        const quanLyDonVi = await kiemTraQuyen(auth, 'branches.manage', {}, client);
        const phanCong = await repo.phanCongHieuLuc(auth.donViId, auth.taiKhoanId, chiNhanhId, client);
        if (!quanLyDonVi && !phanCong) throw loi('Bạn chưa được phân công vào chi nhánh');
        const phien = await repo.chonChiNhanhPhien(auth.phienId, auth.taiKhoanId, auth.donViId, chiNhanhId, client);
        if (!phien) throw loi('Phiên đăng nhập không còn hợp lệ', 401, 'SESSION_EXPIRED');
        return { chi_nhanh_dang_chon_id: phien.chi_nhanh_dang_chon_id };
    });
}

export async function chiNhanhDangChon(auth) {
    const chiNhanh = await repo.layChiNhanh(auth.donViId, auth.chiNhanhId);
    if (!chiNhanh) throw loi('Không tìm thấy chi nhánh đang chọn', 404, 'NOT_FOUND');
    return chiNhanh;
}

export async function danhSachNhanVien(auth, chiNhanhId) {
    uuidHopLe(chiNhanhId, 'Chi nhánh');
    if (!await repo.layChiNhanh(auth.donViId, chiNhanhId)) throw loi('Không tìm thấy chi nhánh', 404, 'NOT_FOUND');
    await yeuCauQuanLy(auth, chiNhanhId);
    return { nhan_vien: await repo.danhSachNhanVienChiNhanh(auth.donViId, chiNhanhId) };
}

export async function phanCongNhanVien(auth, chiNhanhId, thanhVienId, body, requestId) {
    uuidHopLe(chiNhanhId, 'Chi nhánh');
    uuidHopLe(thanhVienId, 'Thành viên');
    const { la_chi_nhanh_chinh: laChinh } = phanCongHopLe(body);
    return trongGiaoDich(async client => {
        const chiNhanh = await repo.layChiNhanh(auth.donViId, chiNhanhId, client, true);
        if (!chiNhanh || chiNhanh.trang_thai !== 'DANG_DUNG') throw loi('Chi nhánh không hoạt động', 404, 'NOT_FOUND');
        await yeuCauQuanLy(auth, chiNhanhId, client);
        const thanhVien = await repo.layThanhVien(auth.donViId, thanhVienId, client, true);
        if (!thanhVien || thanhVien.trang_thai !== 'DANG_LAM') throw loi('Nhân viên không trong trạng thái làm việc', 409, 'MEMBER_INACTIVE');
        const phanCongCu = await repo.phanCongTheoThanhVien(auth.donViId, thanhVienId, chiNhanhId, client, true);
        if (laChinh) await repo.boChiNhanhChinhCu(auth.donViId, thanhVienId, client);
        let phanCong;
        if (phanCongCu) {
            phanCong = await repo.suaPhanCong(phanCongCu.id, laChinh, auth.taiKhoanId, client);
        } else {
            try { phanCong = await repo.taoPhanCong(auth.donViId, thanhVienId, chiNhanhId, laChinh, auth.taiKhoanId, client); }
            catch (error) {
                if (error.code === '23505') throw loi('Phân công đã tồn tại', 409, 'ASSIGNMENT_EXISTS');
                throw error;
            }
        }
        await repo.ghiNhatKyChiNhanh({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongId: chiNhanhId, hanhDong: 'branch.member.assign', requestId
        }, client);
        return phanCong;
    });
}

export async function boPhanCongNhanVien(auth, chiNhanhId, thanhVienId, requestId) {
    uuidHopLe(chiNhanhId, 'Chi nhánh');
    uuidHopLe(thanhVienId, 'Thành viên');
    return trongGiaoDich(async client => {
        const chiNhanh = await repo.layChiNhanh(auth.donViId, chiNhanhId, client, true);
        if (!chiNhanh) throw loi('Không tìm thấy chi nhánh', 404, 'NOT_FOUND');
        await yeuCauQuanLy(auth, chiNhanhId, client);
        const thanhVien = await repo.layThanhVien(auth.donViId, thanhVienId, client, true);
        if (!thanhVien) throw loi('Không tìm thấy nhân viên', 404, 'NOT_FOUND');
        const phanCong = await repo.phanCongTheoThanhVien(auth.donViId, thanhVienId, chiNhanhId, client, true);
        if (!phanCong) throw loi('Nhân viên chưa được phân công vào chi nhánh', 404, 'NOT_FOUND');
        const ketQua = await repo.ketThucPhanCong(phanCong.id, auth.taiKhoanId, client);
        await repo.ketThucVaiTroChiNhanh(auth.donViId, thanhVienId, chiNhanhId, auth.taiKhoanId, client);
        await repo.boQuanLyChiNhanh(auth.donViId, chiNhanhId, thanhVienId, auth.taiKhoanId, client);
        await repo.boChiNhanhKhoiPhien(auth.donViId, chiNhanhId, thanhVien.tai_khoan_id, client);
        await repo.ghiNhatKyChiNhanh({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongId: chiNhanhId, hanhDong: 'branch.member.remove', requestId
        }, client);
        return ketQua;
    });
}