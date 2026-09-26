const { trongGiaoDich } = require('../../database/transaction.js');
const { query } = require('../../database/query.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { congTien } = require('../../common/utils/tien.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const giuKho = require('../../common/utils/giu-cho-ton-kho.js');
const v = require('./dat-truoc.validation.js');
const repo = require('./dat-truoc.repository.js');
class DatTruocService {
    async quyen(auth,maQuyen) {
        if (!auth?.taiKhoanId) throw v.loi('Vui lòng đăng nhập',401,'UNAUTHORIZED');
        if (!auth.donViId) throw v.loi('Vui lòng chọn đơn vị',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,maQuyen,{})) throw v.loi('Không có quyền thực hiện thao tác',403,'FORBIDDEN');
    }
    async kiemTraChiNhanh(auth,chiNhanhId) {
        if (chiNhanhId == null) return;
        if (auth.chiNhanhId && Number(auth.chiNhanhId) !== Number(chiNhanhId)) throw v.loi('Không có quyền thao tác chi nhánh này',403,'BRANCH_FORBIDDEN');
        const branch = await query('SELECT id FROM chi_nhanh WHERE don_vi_id = $1 AND id = $2 AND trang_thai <> $3',[auth.donViId,chiNhanhId,'NGUNG_HOAT_DONG']);
        if (!branch.rows.length) throw v.loi('Không tìm thấy chi nhánh',404,'BRANCH_NOT_FOUND');
    }
    async kiemTraKhachHang(auth,khachHangId,client) {
        const row = await repo.mot('SELECT id FROM khach_hang WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL',[auth.donViId,khachHangId],client);
        if (!row) throw v.loi('Không tìm thấy khách hàng',404,'CUSTOMER_NOT_FOUND');
    }
    async danhSach(auth,queryString) {
        await this.quyen(auth,'books.read');
        const filter = v.boLoc(queryString);
        if (auth.chiNhanhId) filter.chi_nhanh_id = Number(auth.chiNhanhId);
        return repo.danhSach(auth.donViId,filter);
    }
    async chiTiet(auth,id) {
        await this.quyen(auth,'books.read');
        const datTruoc = await repo.lay(auth.donViId,v.idHopLe(id,'Đặt trước'));
        if (!datTruoc) throw v.loi('Không tìm thấy đặt trước',404,'RESERVATION_NOT_FOUND');
        const chiTiet = await repo.chiTiet(auth.donViId,datTruoc.id);
        const phanBo = [];
        for (const item of chiTiet) {
            const giuCho = await repo.nhieu(`SELECT g.*,t.kho_id,t.vi_tri_kho_id,t.phien_ban_sach_id,t.lo_ton_kho_id FROM giu_cho_ton_kho g JOIN ton_kho t ON t.don_vi_id = g.don_vi_id AND t.id = g.ton_kho_id WHERE g.don_vi_id = $1 AND g.chi_tiet_chung_tu_id = $2 ORDER BY g.id`,[auth.donViId,item.id]);
            const allocations = await repo.nhieu(`SELECT * FROM phan_bo_sach_dat_truoc WHERE don_vi_id = $1 AND chi_tiet_dat_truoc_id = $2 ORDER BY id`,[auth.donViId,item.id]);
            phanBo.push({ chi_tiet_id: item.id,phan_bo: allocations,giu_cho: giuCho });
        }
        return { dat_truoc: datTruoc,chi_tiet: chiTiet,phan_bo: phanBo };
    }
    async tao(auth,body,requestId) {
        const data = v.tao(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            await this.kiemTraChiNhanh(auth,data.chi_nhanh_id);
            await this.kiemTraKhachHang(auth,data.khach_hang_id,client);
            if (data.don_hang_id) {
                const order = await repo.mot('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.don_hang_id],client);
                if (!order) throw v.loi('Không tìm thấy đơn hàng',404,'ORDER_NOT_FOUND');
                if (order.khach_hang_id !== data.khach_hang_id) throw v.loi('Đơn hàng không thuộc khách hàng',409,'ORDER_CUSTOMER_MISMATCH');
                if (!['DAT_TRUOC','HON_HOP'].includes(order.loai_don)) throw v.loi('Đơn hàng không phải đơn đặt trước',409,'ORDER_TYPE_INVALID');
                if (data.chi_nhanh_id && order.chi_nhanh_id !== data.chi_nhanh_id) throw v.loi('Chi nhánh đặt trước không khớp đơn hàng',409,'BRANCH_MISMATCH');
                data.chi_nhanh_id = order.chi_nhanh_id;
            }
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.DAT_TRUOC);
            const datTruoc = await repo.tao(auth.donViId,data,ma,auth.taiKhoanId,client);
            for (const item of data.chi_tiet) {
                const offering = await repo.mot(`SELECT h.id FROM hinh_thuc_kinh_doanh_sach h WHERE h.don_vi_id = $1 AND h.phien_ban_sach_id = $2 AND h.chi_nhanh_id IS NOT DISTINCT FROM $3 AND h.hinh_thuc = $4 AND h.cho_dat_truoc = true AND h.trang_thai = 'DANG_DUNG' AND (h.ngay_bat_dau IS NULL OR h.ngay_bat_dau <= now()) AND (h.ngay_ket_thuc IS NULL OR h.ngay_ket_thuc > now())`,[auth.donViId,item.phien_ban_sach_id,data.chi_nhanh_id,item.hinh_thuc === 'MUA' ? 'BAN' : item.hinh_thuc === 'MUON' ? 'MUON_MIEN_PHI' : 'THUE_CO_PHI'],client);
                if (!offering) throw v.loi(`Phiên bản ${item.phien_ban_sach_id} không cho phép đặt trước với hình thức ${item.hinh_thuc}`,409,'PREORDER_NOT_ALLOWED');
                await repo.taoChiTiet(auth.donViId,datTruoc.id,item,client);
            }
            return { ...datTruoc,request_id: requestId };
        });
    }
    async phanBo(auth,id,body,requestId) {
        const data = v.phanBo(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const datTruoc = await repo.lay(auth.donViId,v.idHopLe(id,'Đặt trước'),client,true);
            if (!datTruoc) throw v.loi('Không tìm thấy đặt trước',404,'RESERVATION_NOT_FOUND');
            if (['DA_HUY','DA_NHAN','HET_HAN'].includes(datTruoc.trang_thai)) throw v.loi('Đặt trước đã kết thúc',409,'RESERVATION_CLOSED');
            if (datTruoc.ngay_het_han_nhan && new Date(datTruoc.ngay_het_han_nhan) <= new Date()) throw v.loi('Đặt trước đã hết hạn nhận',409,'RESERVATION_EXPIRED');
            const chiTiet = await repo.mot('SELECT * FROM chi_tiet_dat_truoc WHERE don_vi_id = $1 AND dat_truoc_id = $2 AND phien_ban_sach_id = $3 FOR UPDATE',[auth.donViId,datTruoc.id,data.phien_ban_sach_id],client);
            if (!chiTiet) throw v.loi('Không tìm thấy sách trong đặt trước',404,'RESERVATION_ITEM_NOT_FOUND');
            const conThieu = Number(chiTiet.so_luong) - Number(chiTiet.so_luong_da_phan_bo);
            if (conThieu <= 0) return { dat_truoc: datTruoc,chi_tiet: chiTiet,so_luong_phan_bo: 0 };
            const rows = await repo.nhieu(`SELECT t.*,k.chi_nhanh_id FROM ton_kho t JOIN kho k ON k.don_vi_id = t.don_vi_id AND k.id = t.kho_id WHERE t.don_vi_id = $1 AND t.phien_ban_sach_id = $2 AND t.so_luong_kha_dung > 0 AND ($3::integer IS NULL OR k.chi_nhanh_id = $3) ORDER BY CASE WHEN k.chi_nhanh_id = $3 THEN 0 ELSE 1 END,t.id FOR UPDATE OF t`,[auth.donViId,data.phien_ban_sach_id,datTruoc.chi_nhanh_id],client);
            let canPhanBo = conThieu;
            const daPhanBo = [];
            for (const ton of rows) {
                if (canPhanBo <= 0) break;
                const soLuong = Math.min(canPhanBo,Number(ton.so_luong_kha_dung));
                const hold = await giuKho.giuCho(client,{ donViId: auth.donViId,khoId: ton.kho_id,viTriKhoId: ton.vi_tri_kho_id,phienBanSachId: ton.phien_ban_sach_id,loTonKhoId: ton.lo_ton_kho_id,soLuong,nguonGiuCho: 'THU_CONG',chungTuId: Number(datTruoc.id),chiTietChungTuId: Number(chiTiet.id),ngayHetHan: datTruoc.ngay_het_han_nhan,actorId: auth.taiKhoanId,ghiChu: data.ghi_chu });
                const allocation = await repo.mot(`INSERT INTO phan_bo_sach_dat_truoc(don_vi_id,chi_tiet_dat_truoc_id,kho_id,vi_tri_kho_id,so_luong,trang_thai,ngay_het_han) VALUES($1,$2,$3,$4,$5,'DA_GIU',$6) RETURNING *`,[auth.donViId,chiTiet.id,ton.kho_id,ton.vi_tri_kho_id,soLuong,datTruoc.ngay_het_han_nhan],client);
                daPhanBo.push({ phan_bo: allocation,giu_cho: hold.giu_cho });
                canPhanBo -= soLuong;
            }
            const tongDa = Number(chiTiet.so_luong_da_phan_bo) + daPhanBo.reduce((sum,x) => sum + Number(x.phan_bo.so_luong),0);
            await repo.mot(`UPDATE chi_tiet_dat_truoc SET so_luong_da_phan_bo = $3 WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,chiTiet.id,tongDa],client);
            const trangThai = tongDa >= Number(chiTiet.so_luong) ? 'CO_SACH' : daPhanBo.length ? 'CO_SACH' : datTruoc.trang_thai;
            const updated = await repo.capNhatTrangThai(auth.donViId,datTruoc.id,trangThai,auth.taiKhoanId,client);
            return { dat_truoc: updated,chi_tiet_id: chiTiet.id,so_luong_phan_bo: tongDa - Number(chiTiet.so_luong_da_phan_bo),phan_bo: daPhanBo,request_id: requestId };
        });
    }
    async thongBao(auth,id,body,requestId) {
        const data = v.thongBao(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const datTruoc = await repo.lay(auth.donViId,v.idHopLe(id,'Đặt trước'),client,true);
            if (!datTruoc) throw v.loi('Không tìm thấy đặt trước',404,'RESERVATION_NOT_FOUND');
            if (!['CO_SACH'].includes(datTruoc.trang_thai)) throw v.loi('Đặt trước chưa đủ điều kiện thông báo',409,'RESERVATION_NOT_READY');
            if (datTruoc.ngay_het_han_nhan && new Date(datTruoc.ngay_het_han_nhan) <= new Date()) throw v.loi('Đặt trước đã hết hạn',409,'RESERVATION_EXPIRED');
            const updated = await repo.capNhatTrangThai(auth.donViId,datTruoc.id,'DA_THONG_BAO',auth.taiKhoanId,client);
            return { ...updated,ghi_chu_thong_bao: data.ghi_chu,request_id: requestId };
        });
    }
    async choNhan(auth,id,requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const datTruoc = await repo.lay(auth.donViId,v.idHopLe(id,'Đặt trước'),client,true);
            if (!datTruoc) throw v.loi('Không tìm thấy đặt trước',404,'RESERVATION_NOT_FOUND');
            if (datTruoc.trang_thai !== 'DA_THONG_BAO') throw v.loi('Đặt trước chưa được thông báo',409,'RESERVATION_NOT_NOTIFIED');
            const updated = await repo.capNhatTrangThai(auth.donViId,datTruoc.id,'CHO_NHAN',auth.taiKhoanId,client);
            return { ...updated,request_id: requestId };
        });
    }
    async nhanSach(auth,id,body,requestId) {
        const data = v.nhanSach(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const datTruoc = await repo.lay(auth.donViId,v.idHopLe(id,'Đặt trước'),client,true);
            if (!datTruoc) throw v.loi('Không tìm thấy đặt trước',404,'RESERVATION_NOT_FOUND');
            if (!['DA_THONG_BAO','CHO_NHAN'].includes(datTruoc.trang_thai)) throw v.loi('Đặt trước chưa ở trạng thái nhận sách',409,'RESERVATION_NOT_READY');
            if (datTruoc.ngay_het_han_nhan && new Date(datTruoc.ngay_het_han_nhan) <= new Date()) throw v.loi('Đặt trước đã hết hạn',409,'RESERVATION_EXPIRED');
            if (datTruoc.don_hang_id && Number(datTruoc.don_hang_id) !== Number(data.don_hang_id)) throw v.loi('Đơn hàng nhận sách không khớp đặt trước',409,'ORDER_MISMATCH');
            const order = await repo.mot('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.don_hang_id],client);
            if (!order || Number(order.khach_hang_id) !== Number(datTruoc.khach_hang_id)) throw v.loi('Đơn hàng không thuộc khách hàng đặt trước',409,'ORDER_CUSTOMER_MISMATCH');
            if (['DA_HUY','DA_HOAN'].includes(order.trang_thai)) throw v.loi('Đơn hàng đã kết thúc',409,'ORDER_CLOSED');
            const items = await repo.chiTiet(auth.donViId,datTruoc.id,client,true);
            for (const item of items) {
                if (Number(item.so_luong_da_phan_bo) < Number(item.so_luong)) throw v.loi('Đặt trước chưa được phân bổ đủ sách',409,'RESERVATION_NOT_FULLY_ALLOCATED');
                const holds = await giuKho.danhSachDangGiu(client,auth.donViId,item.id);
                for (const hold of holds) {
                    const alloc = await repo.mot('SELECT * FROM phan_bo_sach_dat_truoc WHERE don_vi_id = $1 AND chi_tiet_dat_truoc_id = $2 AND kho_id = $3 AND vi_tri_kho_id = $4 AND so_luong = $5 AND trang_thai = $6 ORDER BY id LIMIT 1 FOR UPDATE',[auth.donViId,item.id,hold.kho_id,hold.vi_tri_kho_id,hold.so_luong,'DA_GIU'],client);
                    if (alloc) {
                        await repo.mot(`UPDATE phan_bo_sach_dat_truoc SET trang_thai = 'DA_NHAN' WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,alloc.id],client);
                    }
                    await giuKho.giaiPhong(client,{ donViId: auth.donViId,giuChoId: hold.id,actorId: auth.taiKhoanId,lyDo: `Khách nhận theo đơn ${order.ma_don_hang}` });
                }
            }
            const updated = await repo.mot(`UPDATE dat_truoc SET trang_thai = 'DA_NHAN',ngay_hoan_tat = now(),ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,datTruoc.id],client);
            return { dat_truoc: updated,don_hang: order,request_id: requestId };
        });
    }
    async huy(auth,id,body,requestId) {
        const data = v.huy(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const datTruoc = await repo.lay(auth.donViId,v.idHopLe(id,'Đặt trước'),client,true);
            if (!datTruoc) throw v.loi('Không tìm thấy đặt trước',404,'RESERVATION_NOT_FOUND');
            if (['DA_NHAN','DA_HUY'].includes(datTruoc.trang_thai)) throw v.loi('Đặt trước đã kết thúc',409,'RESERVATION_CLOSED');
            const items = await repo.chiTiet(auth.donViId,datTruoc.id,client,true);
            for (const item of items) {
                const holds = await giuKho.danhSachDangGiu(client,auth.donViId,item.id);
                for (const hold of holds) await giuKho.giaiPhong(client,{ donViId: auth.donViId,giuChoId: hold.id,actorId: auth.taiKhoanId,lyDo: data.ly_do });
                await repo.mot(`UPDATE phan_bo_sach_dat_truoc SET trang_thai = 'DA_GIAI_TOA' WHERE don_vi_id = $1 AND chi_tiet_dat_truoc_id = $2 AND trang_thai = 'DA_GIU'`,[auth.donViId,item.id],client);
            }
            const updated = await repo.mot(`UPDATE dat_truoc SET trang_thai = 'DA_HUY',ngay_cap_nhat = now(),ghi_chu = CONCAT_WS(E'\\n',ghi_chu,$3) WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,datTruoc.id,`Hủy: ${data.ly_do}`],client);
            return { ...updated,request_id: requestId };
        });
    }
    async xuLyHetHan(auth,requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const now = new Date();
            const rows = await repo.nhieu(`SELECT id FROM dat_truoc WHERE don_vi_id = $1 AND trang_thai IN ('CHO_SACH','CO_SACH','DA_THONG_BAO','CHO_NHAN') AND ngay_het_han_nhan IS NOT NULL AND ngay_het_han_nhan <= $2 ORDER BY ngay_het_han_nhan,id FOR UPDATE SKIP LOCKED`,[auth.donViId,now.toISOString()],client);
            const result = [];
            for (const row of rows) {
                const datTruoc = await repo.lay(auth.donViId,row.id,client,true);
                const items = await repo.chiTiet(auth.donViId,row.id,client,true);
                for (const item of items) {
                    const holds = await giuKho.danhSachDangGiu(client,auth.donViId,item.id);
                    for (const hold of holds) await giuKho.giaiPhong(client,{ donViId: auth.donViId,giuChoId: hold.id,actorId: auth.taiKhoanId,lyDo: 'Đặt trước hết hạn nhận',trangThai: 'HET_HAN' });
                    await repo.mot(`UPDATE phan_bo_sach_dat_truoc SET trang_thai = 'DA_GIAI_TOA' WHERE don_vi_id = $1 AND chi_tiet_dat_truoc_id = $2 AND trang_thai IN ('DA_GIU','DA_THONG_BAO')`,[auth.donViId,item.id],client);
                }
                await repo.capNhatTrangThai(auth.donViId,datTruoc.id,'HET_HAN',auth.taiKhoanId,client);
                result.push(datTruoc.id);
            }
            return { so_luong: result.length,danh_sach_id: result,request_id: requestId };
        });
    }
    async tuDongPhanBo(auth,phienBanSachId,requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const rows = await repo.nhieu(`SELECT d.id FROM dat_truoc d JOIN chi_tiet_dat_truoc c ON c.don_vi_id = d.don_vi_id AND c.dat_truoc_id = d.id WHERE d.don_vi_id = $1 AND c.phien_ban_sach_id = $2 AND d.trang_thai IN ('CHO_SACH','CO_SACH') AND c.so_luong_da_phan_bo < c.so_luong AND (d.ngay_het_han_nhan IS NULL OR d.ngay_het_han_nhan > now()) ORDER BY d.muc_uu_tien DESC,d.ngay_dat,d.id FOR UPDATE OF d`,[auth.donViId,phienBanSachId],client);
            const result = [];
            for (const row of rows) {
                const dat = await repo.lay(auth.donViId,row.id,client,true);
                const item = await repo.mot('SELECT * FROM chi_tiet_dat_truoc WHERE don_vi_id = $1 AND dat_truoc_id = $2 AND phien_ban_sach_id = $3 FOR UPDATE',[auth.donViId,dat.id,phienBanSachId],client);
                const allocated = await this.phanBoTrongGiaoDich(client,auth,dat,item,requestId);
                if (allocated > 0) result.push({ dat_truoc_id: dat.id,so_luong: allocated });
            }
            return { ket_qua: result,request_id: requestId };
        });
    }
    async phanBoTrongGiaoDich(client,auth,datTruoc,chiTiet,requestId) {
        let conThieu = Number(chiTiet.so_luong) - Number(chiTiet.so_luong_da_phan_bo);
        if (conThieu <= 0) return 0;
        const rows = await repo.nhieu(`SELECT t.*,k.chi_nhanh_id FROM ton_kho t JOIN kho k ON k.don_vi_id = t.don_vi_id AND k.id = t.kho_id WHERE t.don_vi_id = $1 AND t.phien_ban_sach_id = $2 AND t.so_luong_kha_dung > 0 AND ($3::integer IS NULL OR k.chi_nhanh_id = $3) ORDER BY CASE WHEN k.chi_nhanh_id = $3 THEN 0 ELSE 1 END,t.id FOR UPDATE OF t`,[auth.donViId,chiTiet.phien_ban_sach_id,datTruoc.chi_nhanh_id],client);
        let tong = 0;
        for (const ton of rows) {
            if (conThieu <= 0) break;
            const soLuong = Math.min(conThieu,Number(ton.so_luong_kha_dung));
            const hold = await giuKho.giuCho(client,{ donViId: auth.donViId,khoId: ton.kho_id,viTriKhoId: ton.vi_tri_kho_id,phienBanSachId: ton.phien_ban_sach_id,loTonKhoId: ton.lo_ton_kho_id,soLuong,nguonGiuCho: 'THU_CONG',chungTuId: Number(datTruoc.id),chiTietChungTuId: Number(chiTiet.id),ngayHetHan: datTruoc.ngay_het_han_nhan,actorId: auth.taiKhoanId,ghiChu: `Tự động phân bổ ${requestId}` });
            await repo.mot(`INSERT INTO phan_bo_sach_dat_truoc(don_vi_id,chi_tiet_dat_truoc_id,kho_id,vi_tri_kho_id,so_luong,trang_thai,ngay_het_han) VALUES($1,$2,$3,$4,$5,'DA_GIU',$6)`,[auth.donViId,chiTiet.id,ton.kho_id,ton.vi_tri_kho_id,soLuong,datTruoc.ngay_het_han_nhan],client);
            conThieu -= soLuong;
            tong += soLuong;
        }
        if (tong > 0) {
            await repo.mot(`UPDATE chi_tiet_dat_truoc SET so_luong_da_phan_bo = so_luong_da_phan_bo + $3 WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,chiTiet.id,tong],client);
            await repo.capNhatTrangThai(auth.donViId,datTruoc.id,'CO_SACH',auth.taiKhoanId,client);
        }
        return tong;
    }
}
module.exports = new DatTruocService();