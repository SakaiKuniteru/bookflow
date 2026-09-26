const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./khach-hang.validation.js');
const repo = require('./khach-hang.repository.js');
class KhachHangService {
    async quyen(auth, ghi = false, client) {
        if (!auth?.donViId) throw v.loi('Vui lòng chọn đơn vị làm việc',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,ghi ? 'customers.manage' : 'customers.read',{},client)) throw v.loi('Không có quyền truy cập khách hàng',403,'FORBIDDEN');
    }
    async lay(auth, id, client, khoa = false) {
        const khachHang = await repo.lay(auth.donViId,v.idHopLe(id,'Khách hàng'),client,khoa);
        if (!khachHang) throw v.loi('Không tìm thấy khách hàng',404,'NOT_FOUND');
        return khachHang;
    }
    xuLyLoiDb(error) {
        if (error.code === '23505') throw v.loi('Mã khách hàng, tài khoản liên kết hoặc dữ liệu duy nhất đã tồn tại',409,'CUSTOMER_EXISTS');
        if (error.code === '23503') throw v.loi('Dữ liệu tham chiếu không tồn tại hoặc đang được sử dụng',409,'REFERENCE_CONFLICT');
        if (['23514','22P02','22003'].includes(error.code)) throw v.loi('Dữ liệu vi phạm ràng buộc');
        throw error;
    }
    async danhSach(auth, query) {
        await this.quyen(auth);
        return repo.danhSach(auth.donViId,v.boLocHopLe(query));
    }
    async chiTiet(auth, id) {
        await this.quyen(auth);
        const khachHang = await this.lay(auth,id);
        const [diaChi,lienHe,tuongTac] = await Promise.all([repo.diaChi(auth.donViId,khachHang.id),repo.lienHe(auth.donViId,khachHang.id),repo.tuongTac(auth.donViId,khachHang.id)]);
        return { ...khachHang, dia_chi: diaChi, lien_he: lienHe, tuong_tac_gan_day: tuongTac };
    }
    async tao(auth, body, requestId) {
        const data = v.khachHangMoiHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                if (data.nguoi_gioi_thieu_id) await this.lay(auth,data.nguoi_gioi_thieu_id,client);
                const khachHang = await repo.tao(auth.donViId,auth.taiKhoanId,data,client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.create',requestId,client);
                return { ...khachHang, dia_chi: [], lien_he: [], tuong_tac_gan_day: [] };
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async sua(auth, id, body, requestId) {
        const data = v.suaKhachHangHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                const khachHang = await this.lay(auth,id,client,true);
                if (data.nguoi_gioi_thieu_id) {
                    if (data.nguoi_gioi_thieu_id === khachHang.id) throw v.loi('Khách hàng không thể tự giới thiệu chính mình');
                    await this.lay(auth,data.nguoi_gioi_thieu_id,client);
                }
                if ((data.loai_khach_hang ?? khachHang.loai_khach_hang) === 'TO_CHUC' && !(data.ten_to_chuc ?? khachHang.ten_to_chuc)) throw v.loi('Tên tổ chức là bắt buộc');
                const ketQua = await repo.sua(auth.donViId,khachHang.id,data,client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.update',requestId,client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async doiTrangThai(auth, id, body, requestId) {
        v.truongHopLe(body,['trang_thai'],['trang_thai']);
        if (!['HOAT_DONG','TAM_KHOA','NGUNG_HOAT_DONG'].includes(body.trang_thai)) throw v.loi('Trạng thái không hợp lệ');
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.trangThai(auth.donViId,khachHang.id,body.trang_thai,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.status',requestId,client);
            return ketQua;
        });
    }
    async taoDiaChi(auth, id, body, requestId) {
        const data = v.diaChiHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            if (data.mac_dinh) await repo.boMacDinhDiaChi(auth.donViId,khachHang.id,data.loai_dia_chi ?? 'GIAO_HANG',client);
            const ketQua = await repo.taoDiaChi(auth.donViId,khachHang.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.address.create',requestId,client);
            return ketQua;
        });
    }
    async suaDiaChi(auth, id, diaChiId, body, requestId) {
        const data = v.diaChiHopLe(body,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const diaChi = await repo.layDiaChi(auth.donViId,khachHang.id,v.idHopLe(diaChiId,'Địa chỉ'),client);
            if (!diaChi) throw v.loi('Không tìm thấy địa chỉ',404,'NOT_FOUND');
            if (data.mac_dinh) await repo.boMacDinhDiaChi(auth.donViId,khachHang.id,data.loai_dia_chi ?? diaChi.loai_dia_chi,client);
            const ketQua = await repo.suaDiaChi(auth.donViId,khachHang.id,diaChi.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.address.update',requestId,client);
            return ketQua;
        });
    }
    async xoaDiaChi(auth, id, diaChiId, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.xoaDiaChi(auth.donViId,khachHang.id,v.idHopLe(diaChiId,'Địa chỉ'),client);
            if (!ketQua) throw v.loi('Không tìm thấy địa chỉ',404,'NOT_FOUND');
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.address.delete',requestId,client);
            return { id: ketQua.id, da_xoa: true };
        });
    }
    async taoLienHe(auth, id, body, requestId) {
        const data = v.lienHeHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            if (data.la_lien_he_chinh) await repo.boLienHeChinh(auth.donViId,khachHang.id,client);
            const ketQua = await repo.taoLienHe(auth.donViId,khachHang.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.contact.create',requestId,client);
            return ketQua;
        });
    }
    async suaLienHe(auth, id, lienHeId, body, requestId) {
        const data = v.lienHeHopLe(body,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const lienHe = await repo.layLienHe(auth.donViId,khachHang.id,v.idHopLe(lienHeId,'Người liên hệ'),client);
            if (!lienHe) throw v.loi('Không tìm thấy người liên hệ',404,'NOT_FOUND');
            if (data.la_lien_he_chinh) await repo.boLienHeChinh(auth.donViId,khachHang.id,client);
            const ketQua = await repo.suaLienHe(auth.donViId,khachHang.id,lienHe.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.contact.update',requestId,client);
            return ketQua;
        });
    }
    async xoaLienHe(auth, id, lienHeId, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.xoaLienHe(auth.donViId,khachHang.id,v.idHopLe(lienHeId,'Người liên hệ'),client);
            if (!ketQua) throw v.loi('Không tìm thấy người liên hệ',404,'NOT_FOUND');
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.contact.delete',requestId,client);
            return { id: ketQua.id, da_xoa: true };
        });
    }
    async taoTuongTac(auth, id, body, requestId) {
        const data = v.tuongTacHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.taoTuongTac(auth.donViId,khachHang.id,auth.taiKhoanId,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.interaction.create',requestId,client);
            return ketQua;
        });
    }
    async lichSuGiaoDich(auth, id) {
        await this.quyen(auth);
        const khachHang = await this.lay(auth,id);
        return { khach_hang_id: khachHang.id, ...(await repo.giaoDich(auth.donViId,khachHang.id)) };
    }
}
module.exports = new KhachHangService();