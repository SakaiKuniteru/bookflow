const { AppError } = require('../../common/errors/AppError.js');
const { query } = require('../../database/query.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const xacThucService = require('../xac-thuc/xac-thuc.service.js');
const v = require('./nhan-vien.validation.js');
const repo = require('./nhan-vien.repository.js');

function loi(message, status = 403, code = 'FORBIDDEN') {
    return new AppError({ code, message, status });
}
async function yeuCauQuanLy(auth, client) {
    if (!await phanQuyenService.kiemTraQuyen(auth, 'members.manage', {}, client)) throw loi('Không có quyền quản lý nhân viên');
}
async function yeuCauThanhVien(donViId, thanhVienId, client) {
    const tv = await repo.layDeSua(donViId, thanhVienId, client);
    if (!tv) throw loi('Không tìm thấy nhân viên trong đơn vị', 404, 'NOT_FOUND');
    return tv;
}
class NhanVienService {
    async danhSach(auth, queryString) {
        await yeuCauQuanLy(auth);
        return repo.danhSach(auth.donViId, v.phanTrangHopLe(queryString));
    }
    async chiTiet(auth, thanhVienId, client, laChinhMinh = false) {
        const id = v.idHopLe(thanhVienId, 'Nhân viên');
        const coBan = await repo.layCoBan(auth.donViId, id, client);
        if (!coBan) throw loi('Không tìm thấy nhân viên', 404, 'NOT_FOUND');
        if (!laChinhMinh) await yeuCauQuanLy(auth, client);
        else if (coBan.tai_khoan.id !== auth.taiKhoanId) throw loi('Không có quyền xem hồ sơ này');
        const [chiNhanh, vaiTro, phanCongViTri, loiMoi, lichSu, quyen] = await Promise.all([
            repo.layChiNhanh(auth.donViId, id, client),
            repo.layVaiTro(auth.donViId, id, client),
            repo.layPhanCongViTri(auth.donViId, id, client),
            repo.layLoiMoi(auth.donViId, id, client),
            repo.layLichSu(auth.donViId, id, 50, 0, client),
            phanQuyenService.quyenCuaToi({ taiKhoanId: coBan.tai_khoan.id, donViId: auth.donViId }, client)
        ]);
        return { ...coBan, chi_nhanh: chiNhanh, vai_tro: vaiTro, phan_cong_vi_tri: phanCongViTri, quyen: quyen.quyen, loi_moi: loiMoi, lich_su: lichSu };
    }
    async cuaToi(auth) {
        const tv = await repo.layThanhVienCuaToi(auth.donViId, auth.taiKhoanId);
        if (!tv) throw loi('Không tìm thấy hồ sơ nhân viên', 404, 'NOT_FOUND');
        return this.chiTiet(auth, tv.id, undefined, true);
    }
    async moiNhanVien(auth, body, requestId) {
        await yeuCauQuanLy(auth);
        const ketQua = await xacThucService.taoNhanVienBoiAdmin(auth, body, requestId);
        return this.chiTiet(auth, ketQua.thanh_vien_id);
    }
    async capNhat(auth, thanhVienId, body, requestId) {
        const id = v.idHopLe(thanhVienId, 'Nhân viên');
        const duLieu = v.capNhatHopLe(body);
        await trongGiaoDich(async client => {
            await yeuCauQuanLy(auth, client);
            const tv = await yeuCauThanhVien(auth.donViId, id, client);
            if (tv.trang_thai === 'DA_ROI') throw loi('Nhân viên đã nghỉ việc', 409, 'MEMBER_INACTIVE');
            if (duLieu.vi_tri_chinh_id != null) {
                const { rowCount } = await query(`SELECT id FROM vi_tri_cong_viec WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_DUNG'`, [auth.donViId, duLieu.vi_tri_chinh_id], client);
                if (!rowCount) throw loi('Vị trí công việc không hợp lệ', 422, 'INVALID_POSITION');
            }
            if (duLieu.nguoi_quan_ly_id != null) {
                if (duLieu.nguoi_quan_ly_id === id) throw loi('Nhân viên không thể tự quản lý chính mình', 422, 'INVALID_MANAGER');
                const { rowCount } = await query(`SELECT id FROM thanh_vien_don_vi WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_LAM'`, [auth.donViId, duLieu.nguoi_quan_ly_id], client);
                if (!rowCount) throw loi('Người quản lý không hợp lệ', 422, 'INVALID_MANAGER');
            }
            try { await repo.capNhatHoSo(auth.donViId, id, auth.taiKhoanId, duLieu, client); }
            catch (error) {
                if (error.code === '23505') throw loi('Mã chấm công hoặc dữ liệu nhân viên đã tồn tại', 409, 'EMPLOYEE_EXISTS');
                throw error;
            }
            await repo.ghiLichSu({ donViId: auth.donViId, thanhVienId: id, actorId: auth.taiKhoanId, loai: 'CAP_NHAT_HO_SO' }, client);
            await repo.ghiAudit(auth.donViId, auth.taiKhoanId, id, 'employee.profile.update', requestId, client);
        });
        return this.chiTiet(auth, id);
    }
    async doiTrangThai(auth, thanhVienId, body, requestId) {
        const id = v.idHopLe(thanhVienId, 'Nhân viên');
        const { trangThai, lyDo } = v.trangThaiHopLe(body);
        await trongGiaoDich(async client => {
            await yeuCauQuanLy(auth, client);
            const tv = await yeuCauThanhVien(auth.donViId, id, client);
            if (tv.tai_khoan_id === auth.taiKhoanId) throw loi('Không thể tự thay đổi trạng thái công tác của mình');
            if (await repo.coVaiTroQuanTri(auth.donViId, id, client)) throw loi('Phải xử lý vai trò quản trị trước khi thay đổi trạng thái nhân viên', 409, 'ADMIN_ROLE_ACTIVE');
            if (tv.trang_thai === 'DA_ROI') throw loi('Nhân viên đã nghỉ việc; cần quy trình mời lại', 409, 'MEMBER_LEFT');
            if (tv.trang_thai === trangThai) return;
            if (trangThai === 'DANG_LAM' && tv.trang_thai !== 'TAM_KHOA') throw loi('Chỉ được mở khóa nhân viên đang tạm khóa', 409, 'INVALID_STATE');
            await query(`UPDATE thanh_vien_don_vi SET trang_thai = $3, ngay_nghi_viec = CASE WHEN $3 = 'DA_ROI' THEN now() ELSE ngay_nghi_viec END, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND id = $2`, [auth.donViId, id, trangThai, auth.taiKhoanId], client);
            if (trangThai !== 'DANG_LAM') {
                await query('UPDATE phien_dang_nhap SET don_vi_dang_chon_id = NULL, chi_nhanh_dang_chon_id = NULL WHERE tai_khoan_id = $1 AND don_vi_dang_chon_id = $2', [tv.tai_khoan_id, auth.donViId], client);
            }
            if (trangThai === 'DA_ROI') {
                await query(`UPDATE thanh_vien_chi_nhanh SET trang_thai = 'KET_THUC', ngay_ket_thuc = GREATEST(ngay_bat_dau, CURRENT_DATE), la_chi_nhanh_chinh = FALSE, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND trang_thai <> 'KET_THUC'`, [auth.donViId, id, auth.taiKhoanId], client);
                await query('UPDATE thanh_vien_vai_tro SET ngay_ket_thuc = now(), nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND (ngay_ket_thuc IS NULL OR ngay_ket_thuc > now())', [auth.donViId, id, auth.taiKhoanId], client);
                await query(`UPDATE phan_cong_vi_tri SET trang_thai = 'KET_THUC', ngay_ket_thuc = GREATEST(ngay_bat_dau, CURRENT_DATE), la_vi_tri_chinh = FALSE, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND trang_thai <> 'KET_THUC'`, [auth.donViId, id, auth.taiKhoanId], client);
            }
            await repo.ghiLichSu({ donViId: auth.donViId, thanhVienId: id, actorId: auth.taiKhoanId, loai: 'DOI_TRANG_THAI', trangThaiCu: tv.trang_thai, trangThaiMoi: trangThai, lyDo }, client);
            await repo.ghiAudit(auth.donViId, auth.taiKhoanId, id, 'employee.status.update', requestId, client);
        });
        return this.chiTiet(auth, id);
    }
    async chuyenChiNhanh(auth, thanhVienId, body, requestId) {
        const id = v.idHopLe(thanhVienId, 'Nhân viên');
        const { chiNhanhCuId, chiNhanhMoiId, lyDo } = v.chuyenChiNhanhHopLe(body);
        await trongGiaoDich(async client => {
            await yeuCauQuanLy(auth, client);
            const tv = await yeuCauThanhVien(auth.donViId, id, client);
            if (tv.trang_thai !== 'DANG_LAM') throw loi('Nhân viên không trong trạng thái làm việc', 409, 'MEMBER_INACTIVE');
            const { rows: [chiNhanhMoi] } = await query(`SELECT id FROM chi_nhanh WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_DUNG'`, [auth.donViId, chiNhanhMoiId], client);
            if (!chiNhanhMoi) throw loi('Chi nhánh mới không tồn tại hoặc không hoạt động', 404, 'BRANCH_NOT_FOUND');
            const { rows: [cu] } = await query(`SELECT id, la_chi_nhanh_chinh FROM thanh_vien_chi_nhanh WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND chi_nhanh_id = $3 AND trang_thai = 'HIEU_LUC' AND ngay_bat_dau <= CURRENT_DATE AND (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= CURRENT_DATE) FOR UPDATE`, [auth.donViId, id, chiNhanhCuId], client);
            if (!cu) throw loi('Nhân viên không có phân công hiệu lực ở chi nhánh cũ', 409, 'OLD_ASSIGNMENT_NOT_FOUND');
            const { rowCount: daCo } = await query(`SELECT id FROM thanh_vien_chi_nhanh WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND chi_nhanh_id = $3 AND trang_thai = 'HIEU_LUC' AND (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= CURRENT_DATE)`, [auth.donViId, id, chiNhanhMoiId], client);
            if (daCo) throw loi('Nhân viên đã được phân công tại chi nhánh mới', 409, 'ASSIGNMENT_EXISTS');
            await query(`UPDATE thanh_vien_chi_nhanh SET trang_thai = 'KET_THUC', ngay_ket_thuc = GREATEST(ngay_bat_dau, CURRENT_DATE), la_chi_nhanh_chinh = FALSE, nguoi_cap_nhat_id = $2 WHERE id = $1`, [cu.id, auth.taiKhoanId], client);
            if (cu.la_chi_nhanh_chinh) await query('UPDATE thanh_vien_chi_nhanh SET la_chi_nhanh_chinh = FALSE, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2', [auth.donViId, id, auth.taiKhoanId], client);
            await query(`INSERT INTO thanh_vien_chi_nhanh (don_vi_id, thanh_vien_don_vi_id, chi_nhanh_id, la_chi_nhanh_chinh, ngay_bat_dau, trang_thai, nguoi_tao_id) VALUES ($1,$2,$3,$4,CURRENT_DATE,'HIEU_LUC',$5)`, [auth.donViId, id, chiNhanhMoiId, cu.la_chi_nhanh_chinh, auth.taiKhoanId], client);
            await query('UPDATE thanh_vien_vai_tro SET ngay_ket_thuc = now(), nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND chi_nhanh_id = $3 AND (ngay_ket_thuc IS NULL OR ngay_ket_thuc > now())', [auth.donViId, id, chiNhanhCuId, auth.taiKhoanId], client);
            await query(`UPDATE phan_cong_vi_tri SET trang_thai = 'KET_THUC', ngay_ket_thuc = GREATEST(ngay_bat_dau, CURRENT_DATE), la_vi_tri_chinh = FALSE, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND chi_nhanh_id = $3 AND trang_thai = 'HIEU_LUC'`, [auth.donViId, id, chiNhanhCuId, auth.taiKhoanId], client);
            await query('UPDATE phien_dang_nhap SET chi_nhanh_dang_chon_id = NULL WHERE tai_khoan_id = $1 AND don_vi_dang_chon_id = $2 AND chi_nhanh_dang_chon_id = $3', [tv.tai_khoan_id, auth.donViId, chiNhanhCuId], client);
            await repo.ghiLichSu({ donViId: auth.donViId, thanhVienId: id, actorId: auth.taiKhoanId, loai: 'CHUYEN_CHI_NHANH', chiNhanhCuId, chiNhanhMoiId, lyDo }, client);
            await repo.ghiAudit(auth.donViId, auth.taiKhoanId, id, 'employee.branch.transfer', requestId, client);
        });
        return this.chiTiet(auth, id);
    }
    async danhSachViTri(auth) {
        await yeuCauQuanLy(auth);
        const { rows } = await query('SELECT * FROM vi_tri_cong_viec WHERE don_vi_id = $1 ORDER BY ten_vi_tri, id', [auth.donViId]);
        return { vi_tri: rows };
    }
    async taoViTri(auth, body) {
        const duLieu = v.viTriMoiHopLe(body);
        return trongGiaoDich(async client => {
            await yeuCauQuanLy(auth, client);
            try {
                const { rows } = await query('INSERT INTO vi_tri_cong_viec (don_vi_id, ma_vi_tri, ten_vi_tri, mo_ta, nhom_vi_tri, cap_bac, yeu_cau_nghiep_vu, nguoi_tao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [auth.donViId, duLieu.ma, duLieu.ten, duLieu.moTa, duLieu.nhom, duLieu.capBac, duLieu.yeuCau, auth.taiKhoanId], client);
                return rows[0];
            } catch (error) {
                if (error.code === '23505') throw loi('Mã vị trí đã tồn tại', 409, 'POSITION_EXISTS');
                throw error;
            }
        });
    }
    async phanCongViTri(auth, thanhVienId, body, requestId) {
        const id = v.idHopLe(thanhVienId, 'Nhân viên');
        const duLieu = v.phanCongViTriHopLe(body);
        await trongGiaoDich(async client => {
            await yeuCauQuanLy(auth, client);
            const tv = await yeuCauThanhVien(auth.donViId, id, client);
            if (tv.trang_thai !== 'DANG_LAM') throw loi('Nhân viên không trong trạng thái làm việc', 409, 'MEMBER_INACTIVE');
            const { rowCount: coViTri } = await query(`SELECT id FROM vi_tri_cong_viec WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_DUNG'`, [auth.donViId, duLieu.viTriId], client);
            if (!coViTri) throw loi('Vị trí không tồn tại hoặc đã ngừng dùng', 404, 'POSITION_NOT_FOUND');
            if (duLieu.chiNhanhId) {
                const { rowCount: coChiNhanh } = await query(`SELECT pc.id FROM thanh_vien_chi_nhanh pc JOIN chi_nhanh cn ON cn.id = pc.chi_nhanh_id AND cn.don_vi_id = pc.don_vi_id WHERE pc.don_vi_id = $1 AND pc.thanh_vien_don_vi_id = $2 AND pc.chi_nhanh_id = $3 AND pc.trang_thai = 'HIEU_LUC' AND cn.trang_thai = 'DANG_DUNG' AND pc.ngay_bat_dau <= CURRENT_DATE AND (pc.ngay_ket_thuc IS NULL OR pc.ngay_ket_thuc >= CURRENT_DATE)`, [auth.donViId, id, duLieu.chiNhanhId], client);
                if (!coChiNhanh) throw loi('Nhân viên chưa được phân công tại chi nhánh này', 422, 'BRANCH_FORBIDDEN');
            }
            if (duLieu.laChinh) await query(`UPDATE phan_cong_vi_tri SET trang_thai = 'KET_THUC', ngay_ket_thuc = GREATEST(ngay_bat_dau, CURRENT_DATE), la_vi_tri_chinh = FALSE, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND la_vi_tri_chinh = TRUE AND trang_thai = 'HIEU_LUC'`, [auth.donViId, id, auth.taiKhoanId], client);
            await query(`INSERT INTO phan_cong_vi_tri (don_vi_id, thanh_vien_don_vi_id, vi_tri_cong_viec_id, chi_nhanh_id, ngay_bat_dau, la_vi_tri_chinh, ly_do_phan_cong, nguoi_phan_cong_id, nguoi_tao_id) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8)`, [auth.donViId, id, duLieu.viTriId, duLieu.chiNhanhId, duLieu.laChinh, duLieu.lyDo, (await repo.layThanhVienCuaToi(auth.donViId, auth.taiKhoanId, client))?.id ?? null, auth.taiKhoanId], client);
            if (duLieu.laChinh) await query(`INSERT INTO ho_so_nhan_vien (don_vi_id, thanh_vien_don_vi_id, vi_tri_chinh_id, nguoi_tao_id) VALUES ($1,$2,$3,$4) ON CONFLICT (don_vi_id, thanh_vien_don_vi_id) DO UPDATE SET vi_tri_chinh_id = EXCLUDED.vi_tri_chinh_id, nguoi_cap_nhat_id = EXCLUDED.nguoi_tao_id`, [auth.donViId, id, duLieu.viTriId, auth.taiKhoanId], client);
            await repo.ghiLichSu({ donViId: auth.donViId, thanhVienId: id, actorId: auth.taiKhoanId, loai: 'PHAN_CONG_VI_TRI', viTriMoiId: duLieu.viTriId, chiNhanhMoiId: duLieu.chiNhanhId, lyDo: duLieu.lyDo }, client);
            await repo.ghiAudit(auth.donViId, auth.taiKhoanId, id, 'employee.position.assign', requestId, client);
        });
        return this.chiTiet(auth, id);
    }
    async lichSu(auth, thanhVienId, queryString) {
        const id = v.idHopLe(thanhVienId, 'Nhân viên');
        await yeuCauQuanLy(auth);
        if (!await repo.layCoBan(auth.donViId, id)) throw loi('Không tìm thấy nhân viên', 404, 'NOT_FOUND');
        const trang = queryString.trang === undefined ? 1 : v.idHopLe(queryString.trang, 'Trang');
        const kichThuoc = queryString.kich_thuoc === undefined ? 50 : v.idHopLe(queryString.kich_thuoc, 'Kích thước trang');
        if (kichThuoc > 100) throw loi('Mỗi trang tối đa 100 bản ghi', 422, 'INVALID_INPUT');
        return repo.layLichSu(auth.donViId, id, kichThuoc, (trang - 1) * kichThuoc);
    }
}
module.exports = new NhanVienService();