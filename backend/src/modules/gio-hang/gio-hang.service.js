const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./gio-hang.validation.js');
const repo = require('./gio-hang.repository.js');
class GioHangService {
    async quyen(auth,ghi = false,client) {
        if (!auth?.donViId) throw v.loi('Vui lòng chọn đơn vị làm việc',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,ghi ? 'carts.manage' : 'carts.read',{},client)) throw v.loi('Không có quyền truy cập giỏ hàng',403,'FORBIDDEN');
    }
    async lay(auth,id,client,khoa = false) {
        const gio = await repo.lay(auth.donViId,v.idHopLe(id,'Giỏ hàng'),client,khoa);
        if (!gio) throw v.loi('Không tìm thấy giỏ hàng',404,'CART_NOT_FOUND');
        return gio;
    }
    async gioDangHoatDong(auth,id,client) {
        const gio = await this.lay(auth,id,client,true);
        if (gio.trang_thai !== 'HOAT_DONG') throw v.loi('Giỏ hàng không còn hoạt động',409,'CART_INACTIVE');
        if (gio.ngay_het_han && new Date(gio.ngay_het_han) <= new Date()) throw v.loi('Giỏ hàng đã hết hạn',409,'CART_EXPIRED');
        return gio;
    }
    async danhSach(auth,query = {}) {
        await this.quyen(auth);
        const limit = Math.max(1,Math.min(100,Number(query.gioi_han) || 20));
        const trang = Math.max(1,Number(query.trang) || 1);
        return repo.danhSach(auth.donViId,{ khach_hang_id: query.khach_hang_id ? v.idHopLe(query.khach_hang_id,'Khách hàng') : null,chi_nhanh_id: query.chi_nhanh_id ? v.idHopLe(query.chi_nhanh_id,'Chi nhánh') : null,trang_thai: query.trang_thai ?? null,limit,offset: (trang - 1) * limit });
    }
    async chiTiet(auth,id) {
        await this.quyen(auth);
        const gio = await this.lay(auth,id);
        return { ...gio,mat_hang: await repo.matHang(auth.donViId,gio.id) };
    }
    async tao(auth,body) {
        const data = v.gioMoiHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            if (!auth.taiKhoanId) throw v.loi('Không xác định được tài khoản',403,'ACCOUNT_REQUIRED');
            if (data.khach_hang_id) {
                const { rows } = await client.query('SELECT id FROM khach_hang WHERE don_vi_id = $1 AND id = $2',[auth.donViId,data.khach_hang_id]);
                if (!rows.length) throw v.loi('Khách hàng không thuộc đơn vị',404,'CUSTOMER_NOT_FOUND');
            }
            return repo.tao(auth.donViId,auth.taiKhoanId,data,client);
        });
    }
    async themMatHang(auth,id,body) {
        const data = v.matHangHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const gio = await this.gioDangHoatDong(auth,id,client);
            const { rows } = await client.query('SELECT id FROM phien_ban_sach WHERE don_vi_id = $1 AND id = $2',[auth.donViId,data.phien_ban_sach_id]);
            if (!rows.length) throw v.loi('Phiên bản sách không thuộc đơn vị',404,'BOOK_VERSION_NOT_FOUND');
            const ketQua = await repo.themMatHang(auth.donViId,gio.id,data,client);
            await client.query('UPDATE gio_hang SET ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[auth.donViId,gio.id]);
            return ketQua;
        });
    }
    async suaMatHang(auth,id,matHangId,body) {
        const data = v.matHangHopLe(body,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const gio = await this.gioDangHoatDong(auth,id,client);
            const item = await repo.layMatHang(auth.donViId,gio.id,v.idHopLe(matHangId,'Mặt hàng'),client);
            if (!item) throw v.loi('Mặt hàng không thuộc giỏ hàng',404,'CART_ITEM_NOT_FOUND');
            const batDau = data.ngay_bat_dau_du_kien ?? item.ngay_bat_dau_du_kien;
            const ketThuc = data.ngay_ket_thuc_du_kien ?? item.ngay_ket_thuc_du_kien;
            if (batDau && ketThuc && String(ketThuc).slice(0,10) < String(batDau).slice(0,10)) throw v.loi('Ngày kết thúc phải từ ngày bắt đầu');
            return repo.suaMatHang(auth.donViId,gio.id,item.id,data,client);
        });
    }
    async xoaMatHang(auth,id,matHangId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const gio = await this.gioDangHoatDong(auth,id,client);
            const ketQua = await repo.xoaMatHang(auth.donViId,gio.id,v.idHopLe(matHangId,'Mặt hàng'),client);
            if (!ketQua) throw v.loi('Mặt hàng không thuộc giỏ hàng',404,'CART_ITEM_NOT_FOUND');
            return { da_xoa: true,id: ketQua.id };
        });
    }
    async lamRong(auth,id) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const gio = await this.gioDangHoatDong(auth,id,client);
            return { so_mat_hang_da_xoa: await repo.lamRong(auth.donViId,gio.id,client) };
        });
    }
    async huy(auth,id) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const gio = await this.gioDangHoatDong(auth,id,client);
            return repo.huy(auth.donViId,gio.id,client);
        });
    }
}
module.exports = new GioHangService();