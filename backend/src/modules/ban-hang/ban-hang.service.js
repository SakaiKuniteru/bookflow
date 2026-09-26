const { trongGiaoDich } = require('../../database/transaction.js');
const { query } = require('../../database/query.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { congTien,truTien,soSanhTien } = require('../../common/utils/tien.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const donHangService = require('../don-hang/don-hang.service.js');
const v = require('./ban-hang.validation.js');
const repo = require('./ban-hang.repository.js');
class BanHangService {
    async quyen(auth,ghi = false,client) {
        if (!auth?.donViId) throw v.loi('Vui lòng chọn đơn vị làm việc',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,ghi ? 'sales.manage' : 'sales.read',{},client)) throw v.loi('Không có quyền bán hàng',403,'FORBIDDEN');
    }
    async danhSachCa(auth,filters = {}) {
        await this.quyen(auth);
        return repo.danhSachCa(auth.donViId,filters.chi_nhanh_id ? v.idHopLe(filters.chi_nhanh_id,'Chi nhánh') : null);
    }
    async chiTietCa(auth,id) {
        await this.quyen(auth);
        const ca = await repo.layCa(auth.donViId,v.idHopLe(id,'Ca bán hàng'));
        if (!ca) throw v.loi('Không tìm thấy ca bán hàng',404,'SHIFT_NOT_FOUND');
        return ca;
    }
    async moCa(auth,body) {
        const data = v.moCaHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            if (!auth.taiKhoanId) throw v.loi('Không xác định được thu ngân',403,'CASHIER_REQUIRED');
            const { rows } = await query('SELECT id FROM chi_nhanh WHERE don_vi_id = $1 AND id = $2',[auth.donViId,data.chi_nhanh_id],client);
            if (!rows.length) throw v.loi('Chi nhánh không thuộc đơn vị',404,'BRANCH_NOT_FOUND');
            const { rows: caCu } = await query(`SELECT id FROM ca_ban_hang WHERE don_vi_id = $1 AND chi_nhanh_id = $2 AND thu_ngan_id = $3 AND trang_thai = 'DANG_MO'`,[auth.donViId,data.chi_nhanh_id,auth.taiKhoanId],client);
            if (caCu.length) throw v.loi('Thu ngân đã có ca đang mở',409,'SHIFT_ALREADY_OPEN');
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.CA_BAN_HANG);
            return repo.taoCa(auth.donViId,data,ma,auth.taiKhoanId,client);
        });
    }
    async dongCa(auth,id,body) {
        const data = v.dongCaHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const ca = await repo.layCa(auth.donViId,v.idHopLe(id,'Ca bán hàng'),client,true);
            if (!ca) throw v.loi('Không tìm thấy ca bán hàng',404,'SHIFT_NOT_FOUND');
            if (ca.trang_thai !== 'DANG_MO') throw v.loi('Ca không còn mở',409,'SHIFT_NOT_OPEN');
            if (ca.thu_ngan_id !== auth.taiKhoanId) throw v.loi('Chỉ thu ngân mở ca được kiểm đếm',403,'NOT_CASHIER');
            const { rows } = await query(`SELECT COUNT(*)::integer AS tong FROM phien_ban_hang WHERE don_vi_id = $1 AND ca_ban_hang_id = $2 AND trang_thai = 'DANG_BAN'`,[auth.donViId,ca.id],client);
            if (rows[0].tong) throw v.loi('Phải chốt hoặc hủy các phiên bán đang mở',409,'OPEN_SESSIONS');
            const duKien = truTien(congTien(ca.tien_dau_ca,ca.tien_mat_thu),ca.tien_mat_chi);
            const chenhLech = truTien(data.tien_mat_kiem_dem,duKien);
            const { rows: ketQua } = await query(`UPDATE ca_ban_hang SET tien_mat_kiem_dem = $3,chenh_lech = $4,ghi_chu = COALESCE($5,ghi_chu),trang_thai = 'CHO_DUYET',ngay_dong = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,ca.id,data.tien_mat_kiem_dem,chenhLech,data.ghi_chu],client);
            return ketQua[0];
        });
    }
    async duyetCa(auth,id) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const ca = await repo.layCa(auth.donViId,v.idHopLe(id,'Ca bán hàng'),client,true);
            if (!ca) throw v.loi('Không tìm thấy ca bán hàng',404,'SHIFT_NOT_FOUND');
            if (ca.trang_thai !== 'CHO_DUYET') throw v.loi('Ca chưa gửi duyệt',409,'SHIFT_NOT_PENDING');
            if (ca.thu_ngan_id === auth.taiKhoanId) throw v.loi('Không được tự duyệt ca của mình',403,'SELF_APPROVAL');
            const { rows } = await query(`UPDATE ca_ban_hang SET trang_thai = 'DA_DONG',nguoi_duyet_id = $3 WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,ca.id,auth.taiKhoanId],client);
            return rows[0];
        });
    }
    async danhSachPhien(auth,filters = {}) {
        await this.quyen(auth);
        return repo.danhSachPhien(auth.donViId,filters.ca_ban_hang_id ? v.idHopLe(filters.ca_ban_hang_id,'Ca bán hàng') : null);
    }
    async chiTietPhien(auth,id) {
        await this.quyen(auth);
        const phien = await repo.layPhien(auth.donViId,v.idHopLe(id,'Phiên bán hàng'));
        if (!phien) throw v.loi('Không tìm thấy phiên bán hàng',404,'SESSION_NOT_FOUND');
        return phien;
    }
    async taoPhien(auth,body) {
        const data = v.taoPhienHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            if (data.kenh_ban === 'POS' && !data.ca_ban_hang_id) throw v.loi('Phiên POS phải có ca bán hàng');
            if (data.ca_ban_hang_id) {
                const ca = await repo.layCa(auth.donViId,data.ca_ban_hang_id,client,true);
                if (!ca || ca.trang_thai !== 'DANG_MO') throw v.loi('Ca bán hàng không còn mở',409,'SHIFT_NOT_OPEN');
                if (ca.thu_ngan_id !== auth.taiKhoanId) throw v.loi('Ca bán hàng không thuộc thu ngân',403,'NOT_CASHIER');
            }
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.PHIEN_BAN_HANG);
            return repo.taoPhien(auth.donViId,data,ma,auth.taiKhoanId ?? null,client);
        });
    }
    async huyPhien(auth,id) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const phien = await repo.layPhien(auth.donViId,v.idHopLe(id,'Phiên bán hàng'),client,true);
            if (!phien) throw v.loi('Không tìm thấy phiên bán hàng',404,'SESSION_NOT_FOUND');
            if (phien.trang_thai !== 'DANG_BAN') throw v.loi('Phiên đã kết thúc',409,'SESSION_CLOSED');
            if (phien.nguoi_ban_id !== auth.taiKhoanId) throw v.loi('Không được hủy phiên của người khác',403,'FORBIDDEN');
            const { rows } = await query(`UPDATE phien_ban_hang SET trang_thai = 'DA_HUY',ngay_ket_thuc = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,phien.id],client);
            return rows[0];
        });
    }
    async chotPhien(auth,id,body) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const phien = await repo.layPhien(auth.donViId,v.idHopLe(id,'Phiên bán hàng'),client,true);
            if (!phien) throw v.loi('Không tìm thấy phiên bán hàng',404,'SESSION_NOT_FOUND');
            if (phien.trang_thai !== 'DANG_BAN') throw v.loi('Phiên đã kết thúc',409,'SESSION_CLOSED');
            if (phien.nguoi_ban_id !== auth.taiKhoanId) throw v.loi('Không được chốt phiên của người khác',403,'FORBIDDEN');
            if (phien.kenh_ban !== body.kenh_ban) throw v.loi('Kênh bán không khớp phiên',409,'CHANNEL_MISMATCH');
            if (phien.ca_ban_hang_id) {
                const ca = await repo.layCa(auth.donViId,phien.ca_ban_hang_id,client,true);
                if (!ca || ca.trang_thai !== 'DANG_MO') throw v.loi('Ca bán hàng đã đóng',409,'SHIFT_CLOSED');
                if (ca.chi_nhanh_id !== Number(body.chi_nhanh_id)) throw v.loi('Chi nhánh đơn hàng không khớp ca',409,'BRANCH_MISMATCH');
            }
            const don = await donHangService.taoTrongGiaoDich(auth,body,client,{ xacNhanNgay: phien.kenh_ban === 'POS' });
            const ketQua = await repo.chotPhien(auth.donViId,phien.id,don.id,client);
            if (!ketQua) throw v.loi('Không thể chốt phiên',409,'SESSION_CLOSED');
            return { phien: ketQua,don_hang: don };
        });
    }
    async thuTienMat(auth,body) {
        const data = v.thuTienHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const don = await donHangService.lay(auth,data.don_hang_id,client,true);
            const { rows: daCo } = await query('SELECT * FROM giao_dich_thanh_toan WHERE don_vi_id = $1 AND khoa_chong_trung = $2',[auth.donViId,data.khoa_chong_trung],client);
            if (daCo.length) {
                const { rows: phanBo } = await query(`SELECT id FROM phan_bo_thanh_toan WHERE don_vi_id = $1 AND giao_dich_id = $2 AND loai_doi_tuong = 'DON_HANG' AND doi_tuong_id = $3`,[auth.donViId,daCo[0].id,don.id],client);
                if (!phanBo.length || soSanhTien(daCo[0].so_tien,data.so_tien) !== 0) throw v.loi('Khóa chống trùng đã được sử dụng cho giao dịch khác',409,'IDEMPOTENCY_CONFLICT');
                return daCo[0];
            }
            if (['DA_HUY','DA_HOAN'].includes(don.trang_thai)) throw v.loi('Không thể thu tiền đơn đã hủy hoặc đã hoàn',409,'ORDER_CLOSED');
            const { rows: phuongThuc } = await query(`SELECT * FROM phuong_thuc_thanh_toan WHERE don_vi_id = $1 AND id = $2 AND hoat_dong = TRUE AND loai = 'TIEN_MAT'`,[auth.donViId,data.phuong_thuc_id],client);
            if (!phuongThuc.length) throw v.loi('Phương thức thanh toán tiền mặt không hợp lệ',409,'PAYMENT_METHOD_INVALID');
            const conLai = truTien(don.tong_thanh_toan,truTien(don.tien_da_thanh_toan,don.tien_da_hoan));
            if (soSanhTien(data.so_tien,conLai) > 0) throw v.loi('Số tiền thu vượt số tiền còn lại',409,'PAYMENT_AMOUNT_EXCEEDED');
            const { rows: phien } = await query(`SELECT pb.ca_ban_hang_id,cb.thu_ngan_id,cb.trang_thai FROM phien_ban_hang pb LEFT JOIN ca_ban_hang cb ON cb.don_vi_id = pb.don_vi_id AND cb.id = pb.ca_ban_hang_id WHERE pb.don_vi_id = $1 AND pb.don_hang_id = $2 FOR UPDATE OF pb`,[auth.donViId,don.id],client);
            if (don.kenh_ban === 'POS' && (!phien.length || phien[0].thu_ngan_id !== auth.taiKhoanId || phien[0].trang_thai !== 'DANG_MO')) throw v.loi('POS chỉ được thu tiền trong ca đang mở của thu ngân',403,'CASHIER_SHIFT_REQUIRED');
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.GIAO_DICH);
            const { rows } = await query(`INSERT INTO giao_dich_thanh_toan(don_vi_id,chi_nhanh_id,khach_hang_id,phuong_thuc_id,ma_giao_dich,loai_giao_dich,so_tien,trang_thai,khoa_chong_trung,noi_dung,thoi_gian_thanh_cong,nguoi_thuc_hien_id) VALUES($1,$2,$3,$4,$5,'THU',$6,'THANH_CONG',$7,$8,now(),$9) RETURNING *`,[auth.donViId,don.chi_nhanh_id,don.khach_hang_id,data.phuong_thuc_id,ma,data.so_tien,data.khoa_chong_trung,data.noi_dung,auth.taiKhoanId ?? null],client);
            await query(`INSERT INTO phan_bo_thanh_toan(don_vi_id,giao_dich_id,loai_doi_tuong,doi_tuong_id,so_tien) VALUES($1,$2,'DON_HANG',$3,$4)`,[auth.donViId,rows[0].id,don.id,data.so_tien],client);
            const daThanhToan = congTien(don.tien_da_thanh_toan,data.so_tien);
            const trangThai = soSanhTien(daThanhToan,don.tong_thanh_toan) >= 0 ? 'DA_THANH_TOAN' : 'THANH_TOAN_MOT_PHAN';
            await query('UPDATE don_hang SET tien_da_thanh_toan = $3,trang_thai_thanh_toan = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[auth.donViId,don.id,daThanhToan,trangThai],client);
            if (phien[0]?.ca_ban_hang_id) await query('UPDATE ca_ban_hang SET tien_mat_thu = tien_mat_thu + $3 WHERE don_vi_id = $1 AND id = $2',[auth.donViId,phien[0].ca_ban_hang_id,data.so_tien],client);
            return rows[0];
        });
    }
}
module.exports = new BanHangService();