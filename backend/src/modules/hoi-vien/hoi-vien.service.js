const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./hoi-vien.validation.js');
const repo = require('./hoi-vien.repository.js');
class HoiVienService {
    async quyen(auth, ghi = false, client) {
        if (!auth?.donViId) throw v.loi('Vui lòng chọn đơn vị làm việc',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,ghi ? 'members.manage' : 'members.read',{},client)) throw v.loi('Không có quyền truy cập hội viên',403,'FORBIDDEN');
    }
    async hang(auth, id, client, khoa = false) {
        const row = await repo.hang(auth.donViId,v.idHopLe(id,'Hạng hội viên'),client,khoa);
        if (!row) throw v.loi('Không tìm thấy hạng hội viên',404,'NOT_FOUND');
        return row;
    }
    async hoiVien(auth, id, client, khoa = false) {
        const row = await repo.hoiVien(auth.donViId,v.idHopLe(id,'Hội viên'),client,khoa);
        if (!row) throw v.loi('Không tìm thấy hội viên',404,'NOT_FOUND');
        return row;
    }
    xuLyLoiDb(error) {
        if (error.code === '23505') throw v.loi('Mã hạng, mã hội viên hoặc khóa chống trùng đã tồn tại',409,'DUPLICATE');
        if (error.code === '23503') throw v.loi('Dữ liệu tham chiếu không hợp lệ',409,'REFERENCE_CONFLICT');
        if (['23514','22P02','22003'].includes(error.code)) throw v.loi('Dữ liệu vi phạm ràng buộc');
        throw error;
    }
    async danhSachHang(auth) {
        await this.quyen(auth);
        return repo.danhSachHang(auth.donViId);
    }
    async chiTietHang(auth, id) {
        await this.quyen(auth);
        const hang = await this.hang(auth,id);
        return { ...hang, chinh_sach_hien_hanh: await repo.chinhSachHienHanh(auth.donViId,hang.id), lich_su_chinh_sach: await repo.danhSachChinhSach(auth.donViId,hang.id) };
    }
    async taoHang(auth, body, requestId) {
        const data = v.hangMoiHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                const hang = await repo.taoHang(auth.donViId,data,client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,'hang_hoi_vien',hang.id,'members.tier.create',requestId,client);
                return hang;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async suaHang(auth, id, body, requestId) {
        const data = v.suaHangHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                const hang = await this.hang(auth,id,client,true);
                const ketQua = await repo.suaHang(auth.donViId,hang.id,data,client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,'hang_hoi_vien',hang.id,'members.tier.update',requestId,client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async taoChinhSach(auth, id, body, requestId) {
        const data = v.chinhSachHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                const hang = await this.hang(auth,id,client,true);
                if (hang.trang_thai !== 'HOAT_DONG') throw v.loi('Không thể tạo chính sách cho hạng ngừng hoạt động',409,'INVALID_STATUS');
                const { rows: trungLich } = await client.query('SELECT id FROM chinh_sach_hoi_vien WHERE don_vi_id = $1 AND hang_hoi_vien_id = $2 AND hieu_luc_tu < COALESCE($4::timestamptz,\'infinity\'::timestamptz) AND COALESCE(hieu_luc_den,\'infinity\'::timestamptz) > $3::timestamptz LIMIT 1',[auth.donViId,hang.id,data.hieu_luc_tu,data.hieu_luc_den]);
                if (trungLich.length) throw v.loi('Khoảng hiệu lực chính sách bị trùng với phiên bản đã có',409,'POLICY_OVERLAP');
                const chinhSach = await repo.taoChinhSach(auth.donViId,hang.id,auth.taiKhoanId,data,client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,'hang_hoi_vien',hang.id,'members.policy.create',requestId,client);
                return chinhSach;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async danhSach(auth, query) {
        await this.quyen(auth);
        return repo.danhSach(auth.donViId,v.boLocHopLe(query));
    }
    async chiTiet(auth, id) {
        await this.quyen(auth);
        const hoiVien = await this.hoiVien(auth,id);
        const [hang,khachHang,lichSuHang,giaoDichDiem] = await Promise.all([repo.hang(auth.donViId,hoiVien.hang_hoi_vien_id),repo.khachHang(auth.donViId,hoiVien.khach_hang_id),repo.lichSuHang(auth.donViId,hoiVien.id),repo.giaoDichDiem(auth.donViId,hoiVien.id)]);
        return { ...hoiVien, khach_hang: khachHang, hang_hoi_vien: hang, chinh_sach_hien_hanh: await repo.chinhSachHienHanh(auth.donViId,hoiVien.hang_hoi_vien_id), lich_su_hang: lichSuHang, giao_dich_diem_gan_day: giaoDichDiem };
    }
    async dangKy(auth, body, requestId) {
        const data = v.dangKyHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                const khachHang = await repo.khachHang(auth.donViId,data.khach_hang_id,client);
                if (!khachHang || khachHang.trang_thai !== 'HOAT_DONG') throw v.loi('Khách hàng không tồn tại hoặc không hoạt động',409,'CUSTOMER_INVALID');
                const hang = await this.hang(auth,data.hang_hoi_vien_id,client);
                if (hang.trang_thai !== 'HOAT_DONG') throw v.loi('Hạng hội viên không hoạt động',409,'TIER_INACTIVE');
                const hoiVien = await repo.taoHoiVien(auth.donViId,data,client);
                await repo.ghiLichSuHang(auth.donViId,hoiVien.id,null,hang.id,auth.taiKhoanId,'Đăng ký hội viên',client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,'hoi_vien',hoiVien.id,'members.enroll',requestId,client);
                return { ...hoiVien, khach_hang: khachHang, hang_hoi_vien: hang };
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async chuyenHang(auth, id, body, requestId) {
        const data = v.chuyenHangHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const hoiVien = await this.hoiVien(auth,id,client,true);
            const hangMoi = await this.hang(auth,data.hang_hoi_vien_id,client);
            if (hangMoi.trang_thai !== 'HOAT_DONG') throw v.loi('Hạng hội viên không hoạt động',409,'TIER_INACTIVE');
            if (hoiVien.hang_hoi_vien_id === hangMoi.id) throw v.loi('Hội viên đã thuộc hạng này');
            const ketQua = await repo.chuyenHang(auth.donViId,hoiVien.id,hangMoi.id,client);
            const lichSu = await repo.ghiLichSuHang(auth.donViId,hoiVien.id,hoiVien.hang_hoi_vien_id,hangMoi.id,auth.taiKhoanId,data.ly_do,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'hoi_vien',hoiVien.id,'members.tier.change',requestId,client);
            return { ...ketQua, hang_hoi_vien: hangMoi, lich_su_moi: lichSu };
        });
    }
    async giaoDichDiem(auth, id, body, requestId) {
        const data = v.giaoDichDiemHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                const hoiVien = await this.hoiVien(auth,id,client,true);
                const daCo = await repo.giaoDichTheoKhoa(auth.donViId,data.khoa_chong_trung,client);
                if (daCo) {
                    if (Number(daCo.hoi_vien_id) !== hoiVien.id || daCo.loai_giao_dich !== data.loai_giao_dich || Math.abs(Number(daCo.so_diem_thay_doi)) !== data.so_diem) throw v.loi('Khóa chống trùng đã được dùng cho giao dịch khác',409,'IDEMPOTENCY_CONFLICT');
                    return { hoi_vien: hoiVien, giao_dich: daCo, da_xu_ly_truoc: true };
                }
                if (hoiVien.trang_thai !== 'HOAT_DONG') throw v.loi('Hội viên không hoạt động',409,'MEMBER_INACTIVE');
                if (hoiVien.ngay_het_han && new Date(hoiVien.ngay_het_han) <= new Date()) throw v.loi('Hội viên đã hết hạn',409,'MEMBER_EXPIRED');
                const tang = ['TICH_DIEM','HOAN_DIEM','DIEU_CHINH_TANG'].includes(data.loai_giao_dich);
                const delta = tang ? data.so_diem : -data.so_diem;
                const truoc = Number(hoiVien.diem_kha_dung);
                const sau = truoc + delta;
                if (!Number.isSafeInteger(sau) || sau < 0) throw v.loi('Số điểm không đủ hoặc vượt giới hạn',409,'INSUFFICIENT_POINTS');
                const tongDiemMoi = Number(hoiVien.tong_diem_tich_luy) + (data.loai_giao_dich === 'TICH_DIEM' ? data.so_diem : 0);
                if (!Number.isSafeInteger(tongDiemMoi)) throw v.loi('Tổng điểm vượt giới hạn');
                const capNhat = await repo.capNhatDiem(auth.donViId,hoiVien.id,sau,tongDiemMoi,client);
                const giaoDich = await repo.ghiGiaoDichDiem(auth.donViId,hoiVien.id,auth.taiKhoanId,data,delta,truoc,sau,client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,'hoi_vien',hoiVien.id,'members.points.post',requestId,client);
                return { hoi_vien: capNhat, giao_dich: giaoDich, da_xu_ly_truoc: false };
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
}
module.exports = new HoiVienService();