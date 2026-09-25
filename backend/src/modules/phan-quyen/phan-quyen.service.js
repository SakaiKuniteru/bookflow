import { AppError } from '../../common/errors/AppError.js';
import { trongGiaoDich } from '../../database/transaction.js';
import { danhSachQuyenHopLe, ganVaiTroHopLe, suaVaiTroHopLe, uuidHopLe, vaiTroMoiHopLe } from './phan-quyen.validation.js';
import * as repo from './phan-quyen.repository.js';

function loi(message, status = 403, code = 'FORBIDDEN') {
    return new AppError({ code, message, status });
}

function gomPhamVi(rows) {
    const chiNhanhIds = new Set();
    const caNhanChiNhanhIds = new Set();
    let donVi = false;
    let caNhan = false;
    for (const row of rows) {
        const chiNhanhHieuLuc = row.chi_nhanh_hieu_luc_id;
        const dungChiNhanh = !row.chi_nhanh_gan_id || row.chi_nhanh_gan_id === chiNhanhHieuLuc;
        if (row.pham_vi === 'DON_VI' && !row.chi_nhanh_gan_id) donVi = true;
        if (row.pham_vi === 'CHI_NHANH' && chiNhanhHieuLuc && dungChiNhanh) chiNhanhIds.add(chiNhanhHieuLuc);
        if (row.pham_vi === 'CA_NHAN' && !row.chi_nhanh_gan_id) caNhan = true;
        if (row.pham_vi === 'CA_NHAN' && row.chi_nhanh_gan_id && chiNhanhHieuLuc && dungChiNhanh) caNhanChiNhanhIds.add(chiNhanhHieuLuc);
    }
    return {
        don_vi: donVi,
        chi_nhanh_ids: [...chiNhanhIds],
        ca_nhan: caNhan,
        ca_nhan_chi_nhanh_ids: [...caNhanChiNhanhIds]
    };
}

export async function layPhamViDuLieu(auth, maQuyen, client) {
    if (!auth?.taiKhoanId || !auth?.donViId) return gomPhamVi([]);
    const rows = await repo.layQuyenHieuLuc(auth.taiKhoanId, auth.donViId, maQuyen, client);
    return gomPhamVi(rows);
}

export async function kiemTraQuyen(auth, maQuyen, { phamVi = 'DON_VI', chiNhanhId = null, chuSoHuuId = null } = {}, client) {
    if (!auth?.taiKhoanId || !auth?.donViId) return false;
    const phamViDuLieu = await layPhamViDuLieu(auth, maQuyen, client);
    if (phamVi === 'DON_VI') return phamViDuLieu.don_vi;
    if (phamVi === 'CHI_NHANH') {
        if (!chiNhanhId || !await repo.chiNhanhHoatDong(auth.donViId, chiNhanhId, client)) return false;
        return phamViDuLieu.don_vi || phamViDuLieu.chi_nhanh_ids.includes(chiNhanhId);
    }
    if (phamVi === 'CA_NHAN') {
        if (!chuSoHuuId || chuSoHuuId !== auth.taiKhoanId) return false;
        if (!chiNhanhId) return phamViDuLieu.don_vi || phamViDuLieu.ca_nhan;
        if (!await repo.chiNhanhHoatDong(auth.donViId, chiNhanhId, client)) return false;
        return phamViDuLieu.don_vi || phamViDuLieu.ca_nhan
            || phamViDuLieu.chi_nhanh_ids.includes(chiNhanhId)
            || phamViDuLieu.ca_nhan_chi_nhanh_ids.includes(chiNhanhId);
    }
    return false;
}

async function yeuCauQuanTri(auth, client) {
    if (!await kiemTraQuyen(auth, 'roles.manage', {}, client)) throw loi('Không có quyền quản lý vai trò');
}

async function vaiTroDuocSua(donViId, vaiTroId, client) {
    const vt = await repo.layVaiTro(donViId, vaiTroId, client, true);
    if (!vt) throw loi('Không tìm thấy vai trò', 404, 'NOT_FOUND');
    if (vt.la_vai_tro_he_thong) throw loi('Không được sửa vai trò hệ thống');
    if (vt.trang_thai !== 'DANG_DUNG') throw loi('Vai trò không còn hoạt động', 409, 'ROLE_INACTIVE');
    return vt;
}

export async function quyenCuaToi(auth) {
    if (!auth?.donViId) return { quyen: [] };
    const rows = await repo.layQuyenHieuLuc(auth.taiKhoanId, auth.donViId);
    const maQuyen = [...new Set(rows.map(row => row.ma_quyen))];
    return {
        quyen: maQuyen.map(ma => ({ ma_quyen: ma, pham_vi: gomPhamVi(rows.filter(row => row.ma_quyen === ma)) }))
            .filter(item => item.pham_vi.don_vi || item.pham_vi.ca_nhan
                || item.pham_vi.chi_nhanh_ids.length || item.pham_vi.ca_nhan_chi_nhanh_ids.length)
    };
}

export async function danhMucQuyen(auth) {
    await yeuCauQuanTri(auth);
    return { quyen: await repo.danhMucQuyen() };
}

export async function danhSachVaiTro(auth) {
    await yeuCauQuanTri(auth);
    return { vai_tro: await repo.danhSachVaiTro(auth.donViId) };
}

export async function quyenCuaVaiTro(auth, vaiTroId) {
    uuidHopLe(vaiTroId, 'Vai trò');
    await yeuCauQuanTri(auth);
    if (!await repo.layVaiTro(auth.donViId, vaiTroId)) throw loi('Không tìm thấy vai trò', 404, 'NOT_FOUND');
    return { quyen: await repo.quyenCuaVaiTro(auth.donViId, vaiTroId) };
}

export async function taoVaiTro(auth, body, requestId) {
    const duLieu = vaiTroMoiHopLe(body);
    return trongGiaoDich(async client => {
        await yeuCauQuanTri(auth, client);
        let vt;
        try { vt = await repo.taoVaiTro(auth.donViId, auth.taiKhoanId, duLieu, client); }
        catch (error) {
            if (error.code === '23505') throw loi('Mã vai trò đã tồn tại trong đơn vị', 409, 'ROLE_EXISTS');
            throw error;
        }
        await repo.ghiNhatKy({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongLoai: 'vai_tro', doiTuongId: vt.id,
            hanhDong: 'rbac.role.create', requestId
        }, client);
        return vt;
    });
}

export async function suaVaiTro(auth, vaiTroId, body, requestId) {
    uuidHopLe(vaiTroId, 'Vai trò');
    const duLieu = suaVaiTroHopLe(body);
    return trongGiaoDich(async client => {
        await yeuCauQuanTri(auth, client);
        await vaiTroDuocSua(auth.donViId, vaiTroId, client);
        const vt = await repo.suaVaiTro(auth.donViId, vaiTroId, auth.taiKhoanId, duLieu, client);
        await repo.ghiNhatKy({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongLoai: 'vai_tro', doiTuongId: vaiTroId,
            hanhDong: 'rbac.role.update', requestId
        }, client);
        return vt;
    });
}

export async function voHieuVaiTro(auth, vaiTroId, requestId) {
    uuidHopLe(vaiTroId, 'Vai trò');
    return trongGiaoDich(async client => {
        await yeuCauQuanTri(auth, client);
        await vaiTroDuocSua(auth.donViId, vaiTroId, client);
        const vt = await repo.voHieuVaiTro(auth.donViId, vaiTroId, auth.taiKhoanId, client);
        await repo.ghiNhatKy({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongLoai: 'vai_tro', doiTuongId: vaiTroId,
            hanhDong: 'rbac.role.disable', requestId
        }, client);
        return vt;
    });
}

export async function thayQuyenVaiTro(auth, vaiTroId, body, requestId) {
    uuidHopLe(vaiTroId, 'Vai trò');
    const danhSach = danhSachQuyenHopLe(body);
    return trongGiaoDich(async client => {
        await yeuCauQuanTri(auth, client);
        await vaiTroDuocSua(auth.donViId, vaiTroId, client);
        const cacMaQuyen = [...new Set(danhSach.map(item => item.ma_quyen))];
        const quyenDb = await repo.quyenTheoMa(cacMaQuyen, client);
        if (quyenDb.length !== cacMaQuyen.length) throw loi('Danh sách có quyền không tồn tại hoặc đã ngừng dùng', 422, 'INVALID_PERMISSION');
        const quyenTheoMa = new Map(quyenDb.map(item => [item.ma_quyen, item.id]));
        const quyenActor = await repo.layQuyenHieuLuc(auth.taiKhoanId, auth.donViId, null, client);
        for (const item of danhSach) {
            const duocCap = quyenActor.some(row => row.ma_quyen === item.ma_quyen
                && row.pham_vi === 'DON_VI' && !row.chi_nhanh_gan_id);
            if (!duocCap) throw loi(`Không được cấp quyền ${item.ma_quyen} ngoài quyền đang có ở cấp đơn vị`);
        }
        await repo.xoaQuyenVaiTro(auth.donViId, vaiTroId, client);
        for (const item of danhSach) {
            await repo.ganQuyenVaiTro(auth.donViId, vaiTroId, quyenTheoMa.get(item.ma_quyen), item.pham_vi, auth.taiKhoanId, client);
        }
        await repo.ghiNhatKy({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongLoai: 'vai_tro', doiTuongId: vaiTroId,
            hanhDong: 'rbac.role.permissions.replace', requestId
        }, client);
        return { vai_tro_id: vaiTroId, quyen: danhSach };
    });
}

export async function vaiTroCuaThanhVien(auth, thanhVienId) {
    uuidHopLe(thanhVienId, 'Thành viên');
    await yeuCauQuanTri(auth);
    if (!await repo.layThanhVien(auth.donViId, thanhVienId)) throw loi('Không tìm thấy thành viên', 404, 'NOT_FOUND');
    return { vai_tro: await repo.vaiTroCuaThanhVien(auth.donViId, thanhVienId) };
}

export async function ganVaiTro(auth, thanhVienId, body, requestId) {
    uuidHopLe(thanhVienId, 'Thành viên');
    const duLieu = ganVaiTroHopLe(body);
    return trongGiaoDich(async client => {
        await yeuCauQuanTri(auth, client);
        const thanhVien = await repo.layThanhVien(auth.donViId, thanhVienId, client, true);
        if (!thanhVien || thanhVien.trang_thai !== 'DANG_LAM') throw loi('Thành viên không trong trạng thái làm việc', 409, 'MEMBER_INACTIVE');
        const vt = await repo.layVaiTro(auth.donViId, duLieu.vai_tro_id, client);
        if (!vt || vt.trang_thai !== 'DANG_DUNG') throw loi('Vai trò không hoạt động', 404, 'NOT_FOUND');
        if (vt.la_vai_tro_he_thong && vt.ma_vai_tro === 'QUAN_TRI') throw loi('Không cấp vai trò quản trị hệ thống qua API này');
        if (duLieu.chi_nhanh_id) {
            if (!await repo.thanhVienCoChiNhanh(auth.donViId, thanhVienId, duLieu.chi_nhanh_id, client)) {
                throw loi('Thành viên chưa được phân công vào chi nhánh này');
            }
            if (await repo.vaiTroCoQuyenDonVi(auth.donViId, vt.id, client)) {
                throw loi('Vai trò có quyền cấp đơn vị không được gán theo chi nhánh', 422, 'INVALID_ROLE_SCOPE');
            }
        }
        const cacQuyen = await repo.quyenCuaVaiTro(auth.donViId, vt.id, client);
        const quyenActor = await repo.layQuyenHieuLuc(auth.taiKhoanId, auth.donViId, null, client);
        for (const item of cacQuyen) {
            const duocCap = quyenActor.some(row => row.ma_quyen === item.ma_quyen
                && row.pham_vi === 'DON_VI' && !row.chi_nhanh_gan_id);
            if (!duocCap) throw loi(`Không được gán vai trò chứa quyền ${item.ma_quyen} vượt quá quyền đang có`);
        }
        if (await repo.vaiTroDaGan(auth.donViId, thanhVienId, vt.id, duLieu.chi_nhanh_id, client)) {
            throw loi('Thành viên đã có vai trò này trong phạm vi đã chọn', 409, 'ROLE_ALREADY_ASSIGNED');
        }
        const actor = await repo.thanhVienTheoTaiKhoan(auth.donViId, auth.taiKhoanId, client);
        const gan = await repo.ganVaiTro(auth.donViId, thanhVienId, vt.id, duLieu.chi_nhanh_id, auth.taiKhoanId, actor.id, client);
        await repo.ghiNhatKy({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongLoai: 'thanh_vien_vai_tro', doiTuongId: gan.id,
            hanhDong: 'rbac.member.role.assign', requestId
        }, client);
        return gan;
    });
}

export async function thuHoiVaiTro(auth, thanhVienId, ganVaiTroId, requestId) {
    uuidHopLe(thanhVienId, 'Thành viên');
    uuidHopLe(ganVaiTroId, 'Lần gán vai trò');
    return trongGiaoDich(async client => {
        await yeuCauQuanTri(auth, client);
        const thanhVien = await repo.layThanhVien(auth.donViId, thanhVienId, client, true);
        if (!thanhVien) throw loi('Không tìm thấy thành viên', 404, 'NOT_FOUND');
        const cacVaiTro = await repo.vaiTroCuaThanhVien(auth.donViId, thanhVienId, client);
        const ganHienTai = cacVaiTro.find(item => item.id === ganVaiTroId && !item.ngay_ket_thuc);
        if (!ganHienTai) throw loi('Không tìm thấy lần gán vai trò đang hiệu lực', 404, 'NOT_FOUND');
        if (ganHienTai.ma_vai_tro === 'QUAN_TRI') throw loi('Không thu hồi vai trò quản trị hệ thống qua API này');
        const ketQua = await repo.thuHoiVaiTro(auth.donViId, thanhVienId, ganVaiTroId, auth.taiKhoanId, client);
        if (!ketQua) throw loi('Không thể thu hồi vai trò', 409, 'ROLE_REVOKE_FAILED');
        await repo.ghiNhatKy({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            doiTuongLoai: 'thanh_vien_vai_tro', doiTuongId: ganVaiTroId,
            hanhDong: 'rbac.member.role.revoke', requestId
        }, client);
        return ketQua;
    });
}