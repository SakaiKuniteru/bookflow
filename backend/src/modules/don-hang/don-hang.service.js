const { trongGiaoDich } = require('../../database/transaction.js');
const { query } = require('../../database/query.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { lamTronTien,congTien,truTien,nhanTien,phanTramTien,soSanhTien } = require('../../common/utils/tien.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./don-hang.validation.js');
const repo = require('./don-hang.repository.js');
const kho = require('./don-hang.kho.js');
const CHUYEN = Object.freeze({ MOI: ['CHO_XAC_NHAN','DA_XAC_NHAN','DA_HUY'],CHO_XAC_NHAN: ['DA_XAC_NHAN','DA_HUY'],DA_XAC_NHAN: ['DANG_CHUAN_BI','DA_HUY'],DANG_CHUAN_BI: ['DA_HUY'],DANG_GIAO: [],GIAO_MOT_PHAN: [],HOAN_TAT: [],DA_HUY: [],HOAN_MOT_PHAN: [],DA_HOAN: [] });
class DonHangService {
    async quyen(auth,ghi = false,client) {
        if (!auth?.donViId) throw v.loi('Vui lòng chọn đơn vị làm việc',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,ghi ? 'orders.manage' : 'orders.read',{},client)) throw v.loi('Không có quyền truy cập đơn hàng',403,'FORBIDDEN');
    }
    async lay(auth,id,client,khoa = false) {
        const don = await repo.lay(auth.donViId,v.idHopLe(id,'Đơn hàng'),client,khoa);
        if (!don) throw v.loi('Không tìm thấy đơn hàng',404,'ORDER_NOT_FOUND');
        return don;
    }
    async danhSach(auth,filters = {}) {
        await this.quyen(auth);
        const limit = Math.max(1,Math.min(100,Number(filters.gioi_han) || 20));
        const trang = Math.max(1,Number(filters.trang) || 1);
        return repo.danhSach(auth.donViId,{ chi_nhanh_id: filters.chi_nhanh_id ? v.idHopLe(filters.chi_nhanh_id,'Chi nhánh') : null,khach_hang_id: filters.khach_hang_id ? v.idHopLe(filters.khach_hang_id,'Khách hàng') : null,trang_thai: filters.trang_thai ?? null,limit,offset: (trang - 1) * limit });
    }
    async chiTiet(auth,id) {
        await this.quyen(auth);
        const don = await this.lay(auth,id);
        const [matHang,lichSu,vanDon] = await Promise.all([repo.chiTiet(auth.donViId,don.id),repo.lichSu(auth.donViId,don.id),repo.vanDon(auth.donViId,don.id)]);
        return { ...don,mat_hang: matHang,lich_su_trang_thai: lichSu,van_don: vanDon };
    }
    async taoTrongGiaoDich(auth,body,client,{ xacNhanNgay = false } = {}) {
        const data = v.taoHopLe(body);
        await this.quyen(auth,true,client);
        const { rows: chiNhanh } = await query('SELECT id FROM chi_nhanh WHERE don_vi_id = $1 AND id = $2',[auth.donViId,data.chi_nhanh_id],client);
        if (!chiNhanh.length) throw v.loi('Chi nhánh không thuộc đơn vị',404,'BRANCH_NOT_FOUND');
        if (data.khach_hang_id) {
            const { rows } = await query('SELECT id FROM khach_hang WHERE don_vi_id = $1 AND id = $2',[auth.donViId,data.khach_hang_id],client);
            if (!rows.length) throw v.loi('Khách hàng không thuộc đơn vị',404,'CUSTOMER_NOT_FOUND');
        }
        let gio = null;
        let matHang = data.mat_hang;
        if (data.gio_hang_id) {
            const { rows } = await query('SELECT * FROM gio_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.gio_hang_id],client);
            gio = rows[0];
            if (!gio || gio.trang_thai !== 'HOAT_DONG' || gio.ngay_het_han && new Date(gio.ngay_het_han) <= new Date()) throw v.loi('Giỏ hàng không còn hoạt động',409,'CART_INACTIVE');
            if (gio.chi_nhanh_id && gio.chi_nhanh_id !== data.chi_nhanh_id) throw v.loi('Chi nhánh không khớp giỏ hàng',409,'BRANCH_MISMATCH');
            if (gio.khach_hang_id && gio.khach_hang_id !== data.khach_hang_id) throw v.loi('Khách hàng không khớp giỏ hàng',409,'CUSTOMER_MISMATCH');
            const { rows: items } = await query('SELECT * FROM chi_tiet_gio_hang WHERE don_vi_id = $1 AND gio_hang_id = $2 ORDER BY id',[auth.donViId,gio.id],client);
            matHang = items;
        }
        if (!matHang?.length) throw v.loi('Đơn hàng không có mặt hàng');
        if (matHang.some(item => item.hinh_thuc === 'DAT_TRUOC')) throw v.loi('Đặt trước phải xử lý qua phân hệ đặt trước',409,'PREORDER_REQUIRED');
        const forms = [...new Set(matHang.map(item => item.hinh_thuc))];
        const loaiDon = forms.length > 1 ? 'HON_HOP' : { MUA: 'BAN',THUE: 'THUE',MUON: 'MUON' }[forms[0]];
        let tienHang = '0';
        const chiTiet = [];
        for (const item of matHang) {
            const hinhThuc = { MUA: 'BAN',THUE: 'THUE_CO_PHI',MUON: 'MUON_MIEN_PHI' }[item.hinh_thuc];
            const kenhGia = data.kenh_ban === 'POS' || data.kenh_ban === 'NOI_BO' ? 'TAI_QUAY' : 'TRUC_TUYEN';
            const { rows } = await query(`SELECT ds.ten_sach,pbs.ma_isbn AS isbn,bg.gia_ban FROM phien_ban_sach pbs JOIN dau_sach ds ON ds.don_vi_id = pbs.don_vi_id AND ds.id = pbs.dau_sach_id JOIN hinh_thuc_kinh_doanh_sach ht ON ht.don_vi_id = pbs.don_vi_id AND ht.phien_ban_sach_id = pbs.id JOIN bang_gia_sach bg ON bg.don_vi_id = ht.don_vi_id AND bg.hinh_thuc_kinh_doanh_sach_id = ht.id WHERE pbs.don_vi_id = $1 AND pbs.id = $2 AND ht.chi_nhanh_id = $3 AND ht.hinh_thuc = $4 AND ht.trang_thai = 'DANG_DUNG' AND (ht.ngay_bat_dau IS NULL OR ht.ngay_bat_dau <= now()) AND (ht.ngay_ket_thuc IS NULL OR ht.ngay_ket_thuc > now()) AND bg.trang_thai = 'HIEU_LUC' AND bg.kenh_ban IN ('TAT_CA',$5) AND bg.ngay_bat_dau <= now() AND (bg.ngay_ket_thuc IS NULL OR bg.ngay_ket_thuc > now()) ORDER BY CASE WHEN bg.kenh_ban = $5 THEN 0 ELSE 1 END,bg.ngay_bat_dau DESC,bg.id DESC LIMIT 1`,[auth.donViId,item.phien_ban_sach_id,data.chi_nhanh_id,hinhThuc,kenhGia],client);
            if (!rows.length) throw v.loi(`Không có giá hiệu lực cho phiên bản ${item.phien_ban_sach_id}`,409,'PRICE_NOT_FOUND');
            const donGia = lamTronTien(rows[0].gia_ban);
            const thanhTien = nhanTien(donGia,item.so_luong);
            tienHang = congTien(tienHang,thanhTien);
            chiTiet.push({ ...item,ten_sach: rows[0].ten_sach,isbn: rows[0].isbn,don_gia: donGia,thanh_tien: thanhTien });
        }
        let voucher = null;
        let tienGiam = '0';
        if (data.ma_giam_gia) {
            const { rows } = await query(`SELECT * FROM ma_giam_gia WHERE don_vi_id = $1 AND ma = $2 AND trang_thai = 'HOAT_DONG' AND hieu_luc_tu <= now() AND hieu_luc_den > now() FOR UPDATE`,[auth.donViId,data.ma_giam_gia],client);
            voucher = rows[0];
            if (!voucher) throw v.loi('Mã giảm giá không hợp lệ',409,'VOUCHER_INVALID');
            if (voucher.loai === 'MIEN_PHI_VAN_CHUYEN') throw v.loi('Mã miễn phí vận chuyển phải dùng tại bước tính phí giao hàng',409,'SHIPPING_VOUCHER_REQUIRED');
            if (soSanhTien(tienHang,voucher.don_toi_thieu) < 0) throw v.loi('Đơn hàng chưa đạt giá trị tối thiểu của mã giảm giá',409,'VOUCHER_MINIMUM');
            const { rows: luot } = await query(`SELECT COUNT(*)::integer AS tong,COUNT(*) FILTER (WHERE khach_hang_id = $3)::integer AS cua_khach FROM su_dung_ma_giam_gia WHERE don_vi_id = $1 AND ma_giam_gia_id = $2 AND trang_thai = 'DA_AP_DUNG'`,[auth.donViId,voucher.id,data.khach_hang_id],client);
            if (voucher.tong_luot != null && luot[0].tong >= voucher.tong_luot) throw v.loi('Mã giảm giá hết lượt',409,'VOUCHER_EXHAUSTED');
            if (voucher.luot_moi_khach != null && (!data.khach_hang_id || luot[0].cua_khach >= voucher.luot_moi_khach)) throw v.loi('Khách hàng đã hết lượt dùng mã',409,'VOUCHER_CUSTOMER_LIMIT');
            tienGiam = voucher.loai === 'PHAN_TRAM' ? phanTramTien(tienHang,voucher.gia_tri) : lamTronTien(voucher.gia_tri);
            if (voucher.giam_toi_da != null && soSanhTien(tienGiam,voucher.giam_toi_da) > 0) tienGiam = lamTronTien(voucher.giam_toi_da);
            if (soSanhTien(tienGiam,tienHang) > 0) tienGiam = tienHang;
        }
        const maDon = await taoMaChung(client,auth.donViId,TIEN_TO.DON_HANG);
        const don = await repo.tao(auth.donViId,{ ...data,ma_don_hang: maDon,loai_don: loaiDon,trang_thai: xacNhanNgay ? 'DA_XAC_NHAN' : 'MOI',tien_hang: tienHang,tien_giam_gia: tienGiam,tien_thue: '0',phi_van_chuyen: '0',tien_coc_yeu_cau: '0',tong_thanh_toan: truTien(tienHang,tienGiam),ma_giam_gia_id: voucher?.id ?? null,ma_giam_gia_ap_dung: voucher?.ma ?? null,nguoi_tao_id: auth.taiKhoanId ?? null },client);
        const chiTietDaTao = [];
        for (const item of chiTiet) chiTietDaTao.push(await repo.taoChiTiet(auth.donViId,don.id,item,client));
        await kho.giuHang(auth.donViId,data.chi_nhanh_id,don.id,chiTietDaTao,auth.taiKhoanId ?? null,client);
        if (voucher) await query('INSERT INTO su_dung_ma_giam_gia(don_vi_id,ma_giam_gia_id,don_hang_id,khach_hang_id,so_tien_giam) VALUES($1,$2,$3,$4,$5)',[auth.donViId,voucher.id,don.id,data.khach_hang_id,tienGiam],client);
        if (gio) await query(`UPDATE gio_hang SET trang_thai = 'DA_CHOT',ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,gio.id],client);
        await repo.ghiLichSu(auth.donViId,don.id,null,don.trang_thai,'Tạo đơn hàng',auth.taiKhoanId ?? null,client);
        return { ...don,mat_hang: chiTietDaTao };
    }
    async tao(auth,body) {
        return trongGiaoDich(client => this.taoTrongGiaoDich(auth,body,client));
    }
    async doiTrangThai(auth,id,body) {
        const data = v.trangThaiHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const don = await this.lay(auth,id,client,true);
            if (!CHUYEN[don.trang_thai]?.includes(data.trang_thai)) throw v.loi('Chuyển trạng thái đơn không hợp lệ',409,'INVALID_TRANSITION');
            if (data.trang_thai === 'DA_HUY') {
                if (!data.ly_do) throw v.loi('Phải nhập lý do hủy đơn');
                if (soSanhTien(don.tien_da_thanh_toan,don.tien_da_hoan) > 0) throw v.loi('Phải xử lý hoàn tiền trước khi hủy đơn',409,'REFUND_REQUIRED');
                await kho.giaiPhong(auth.donViId,don.id,auth.taiKhoanId ?? null,client);
                await query(`UPDATE su_dung_ma_giam_gia SET trang_thai = 'DA_HUY' WHERE don_vi_id = $1 AND don_hang_id = $2 AND trang_thai = 'DA_AP_DUNG'`,[auth.donViId,don.id],client);
            }
            const ketQua = await repo.doiTrangThai(auth.donViId,don.id,data.trang_thai,auth.taiKhoanId ?? null,data.ly_do,client);
            await repo.ghiLichSu(auth.donViId,don.id,don.trang_thai,data.trang_thai,data.ly_do,auth.taiKhoanId ?? null,client);
            return ketQua;
        });
    }
}
module.exports = new DonHangService();