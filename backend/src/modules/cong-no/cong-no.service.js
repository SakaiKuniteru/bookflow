const { trongGiaoDich } = require('../../database/transaction.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { congTien,truTien,soSanhTien } = require('../../common/utils/tien.js');
const phanQuyen = require('../phan-quyen/phan-quyen.service.js');
const thanhToan = require('../thanh-toan/thanh-toan.service.js');
const thanhToanRepo = require('../thanh-toan/thanh-toan.repository.js');
const soCai = require('../thanh-toan/thanh-toan.hach-toan.js');
const v = require('../thanh-toan/thanh-toan.validation.js');
const cv = require('./cong-no.validation.js');
const repo = require('./cong-no.repository.js');
class CongNoService {
    async quyen(auth,ma,client) {
        if (!auth?.donViId || !auth?.taiKhoanId) throw v.loi('Vui lòng đăng nhập và chọn đơn vị',403,'TENANT_REQUIRED');
        if (!await phanQuyen.kiemTraQuyen(auth,ma,{},client)) throw v.loi('Không có quyền công nợ',403,'FORBIDDEN');
    }
    async lay(auth,id,client,khoa = false) {
        const no = await repo.lay(auth.donViId,v.id(id,'Công nợ'),client,khoa);
        if (!no) throw v.loi('Không tìm thấy công nợ',404,'DEBT_NOT_FOUND');
        return no;
    }
    async danhSach(auth,query = {}) {
        await this.quyen(auth,'debts.read');
        const filter = { ...v.trang(query),loai_cong_no: query.loai_cong_no ? v.enumValue(query.loai_cong_no,['PHAI_THU','PHAI_TRA'],'Loại') : null,trang_thai: query.trang_thai ? v.enumValue(query.trang_thai,['CHUA_THANH_TOAN','THANH_TOAN_MOT_PHAN','DA_THANH_TOAN','QUA_HAN','DA_XOA_NO','DA_HUY'],'Trạng thái') : null,chi_nhanh_id: query.chi_nhanh_id == null ? null : v.id(query.chi_nhanh_id,'Chi nhánh'),khach_hang_id: query.khach_hang_id == null ? null : v.id(query.khach_hang_id,'Khách hàng'),nha_cung_cap_id: query.nha_cung_cap_id == null ? null : v.id(query.nha_cung_cap_id,'Nhà cung cấp') };
        await thanhToan.chiNhanh(auth,filter.chi_nhanh_id);
        return repo.danhSach(auth.donViId,filter);
    }
    async chiTiet(auth,id) {
        await this.quyen(auth,'debts.read');
        const no = await this.lay(auth,id);
        await thanhToan.chiNhanh(auth,no.chi_nhanh_id);
        return { ...no,so_tien_con_lai: soCai.duNo(no),but_toan: await repo.butToan(auth.donViId,no.id) };
    }
    async tao(auth,body,requestId) {
        const data = cv.tao(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'debts.manage',client);
            await thanhToan.chiNhanh(auth,data.chi_nhanh_id,client);
            if (data.khach_hang_id && !await repo.mot('SELECT id FROM khach_hang WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL',[auth.donViId,data.khach_hang_id],client)) throw v.loi('Khách hàng không thuộc đơn vị',404,'CUSTOMER_NOT_FOUND');
            if (data.nha_cung_cap_id && !await repo.mot('SELECT id FROM nha_cung_cap WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL',[auth.donViId,data.nha_cung_cap_id],client)) throw v.loi('Nhà cung cấp không thuộc đơn vị',404,'SUPPLIER_NOT_FOUND');
            if (data.loai_nguon === 'DON_HANG') {
                const don = await repo.mot('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.nguon_id],client);
                if (!don || ['DA_HUY','DA_HOAN'].includes(don.trang_thai)) throw v.loi('Đơn hàng không hợp lệ',409,'SOURCE_INVALID');
                if (don.khach_hang_id !== data.khach_hang_id || data.chi_nhanh_id && don.chi_nhanh_id !== data.chi_nhanh_id) throw v.loi('Khách hàng hoặc chi nhánh khác đơn gốc',409,'SOURCE_MISMATCH');
                data.chi_nhanh_id = don.chi_nhanh_id;
                const conLai = truTien(don.tong_thanh_toan,don.tien_da_thanh_toan);
                if (soSanhTien(conLai,data.so_tien_goc) !== 0) throw v.loi('Công nợ đơn hàng phải bằng số tiền còn phải thu',409,'DEBT_AMOUNT_MISMATCH');
            }
            if (data.loai_nguon === 'PHIEU_NHAP') {
                const nhap = await repo.mot('SELECT pn.*,k.chi_nhanh_id FROM phieu_nhap_kho pn JOIN kho k ON k.don_vi_id = pn.don_vi_id AND k.id = pn.kho_id WHERE pn.don_vi_id = $1 AND pn.id = $2 FOR UPDATE OF pn',[auth.donViId,data.nguon_id],client);
                if (!nhap || nhap.trang_thai !== 'DA_XAC_NHAN' || nhap.nha_cung_cap_id !== data.nha_cung_cap_id || data.chi_nhanh_id && nhap.chi_nhanh_id !== data.chi_nhanh_id) throw v.loi('Phiếu nhập đã xác nhận hoặc nhà cung cấp không khớp',409,'SOURCE_INVALID');
                data.chi_nhanh_id = nhap.chi_nhanh_id;
                const thanhTien = await repo.mot('SELECT COALESCE(SUM(so_luong_dat * don_gia_nhap),0)::numeric AS tong FROM chi_tiet_phieu_nhap WHERE don_vi_id = $1 AND phieu_nhap_kho_id = $2',[auth.donViId,nhap.id],client);
                if (soSanhTien(data.so_tien_goc,thanhTien.tong) !== 0) throw v.loi('Công nợ nhập kho phải bằng tổng số lượng đạt nhân đơn giá nhập');
            }
            if (data.loai_nguon === 'PHI_PHAT') {
                const phat = await repo.mot('SELECT * FROM phi_phat WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.nguon_id],client);
                if (!phat || phat.khach_hang_id !== data.khach_hang_id || ['DA_HUY','DA_MIEN'].includes(phat.trang_thai)) throw v.loi('Phiếu phạt không hợp lệ',409,'SOURCE_INVALID');
                if (soSanhTien(data.so_tien_goc,truTien(phat.so_tien_phai_thu,phat.so_tien_da_thu)) !== 0) throw v.loi('Công nợ phải bằng tiền phạt còn lại');
            }
            if (data.loai_nguon === 'MUON_TRA') {
                const muon = await repo.mot('SELECT * FROM muon_tra WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.nguon_id],client);
                if (!muon || muon.khach_hang_id !== data.khach_hang_id) throw v.loi('Phiếu mượn trả không thuộc khách hàng',409,'SOURCE_INVALID');
            }
            if (data.nguon_id && await repo.mot('SELECT id FROM cong_no WHERE don_vi_id = $1 AND loai_cong_no = $2 AND loai_nguon = $3 AND nguon_id = $4 AND trang_thai <> \'DA_HUY\' LIMIT 1',[auth.donViId,data.loai_cong_no,data.loai_nguon,data.nguon_id],client)) throw v.loi('Nguồn phát sinh đã có công nợ',409,'DEBT_SOURCE_EXISTS');
            await thanhToan.chiNhanh(auth,data.chi_nhanh_id,client);
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.CONG_NO);
            const no = await repo.tao(auth.donViId,data,ma,auth.taiKhoanId,client);
            await repo.butToanMoi(auth.donViId,no,'PHAT_SINH',no.so_tien_goc,'0',no.so_tien_goc,null,ma,data.ghi_chu,auth.taiKhoanId,client);
            await thanhToanRepo.nhatKy(auth.donViId,auth.taiKhoanId,'cong_no','debts.create',requestId,data.ghi_chu,client);
            return no;
        });
    }
    async dieuChinh(auth,id,body,requestId) {
        const data = cv.dieuChinh(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'debts.manage',client);
            const no = await this.lay(auth,id,client,true);
            await thanhToan.chiNhanh(auth,no.chi_nhanh_id,client);
            if (['DA_HUY','DA_XOA_NO','DA_THANH_TOAN'].includes(no.trang_thai)) throw v.loi('Công nợ đã kết thúc',409,'DEBT_CLOSED');
            if (no.loai_nguon === 'DON_HANG') throw v.loi('Công nợ đơn hàng chỉ điều chỉnh thông qua nghiệp vụ điều chỉnh đơn gốc',409,'ORDER_ADJUSTMENT_REQUIRED');
            const truoc = soCai.duNo(no);
            let sau;
            let goc = no.so_tien_goc;
            let giam = no.so_tien_da_giam;
            if (data.loai === 'DIEU_CHINH_TANG') { goc = congTien(goc,data.so_tien); sau = congTien(truoc,data.so_tien); }
            else {
                if (soSanhTien(data.so_tien,truoc) > 0 || data.loai === 'XOA_NO' && soSanhTien(data.so_tien,truoc) !== 0) throw v.loi('Điều chỉnh vượt số dư hoặc xóa nợ chưa hết dư',409,'DEBT_ADJUSTMENT_EXCEEDED');
                giam = congTien(giam,data.so_tien);
                sau = truTien(truoc,data.so_tien);
            }
            const status = data.loai === 'XOA_NO' ? 'DA_XOA_NO' : soCai.trangThaiNo({ ...no,so_tien_goc: goc,so_tien_da_giam: giam });
            const updated = await repo.mot('UPDATE cong_no SET so_tien_goc = $3,so_tien_da_giam = $4,trang_thai = $5,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,no.id,goc,giam,status],client);
            const delta = data.loai === 'DIEU_CHINH_TANG' ? data.so_tien : truTien('0',data.so_tien);
            await repo.butToanMoi(auth.donViId,no,data.loai,delta,truoc,sau,null,null,data.ly_do,auth.taiKhoanId,client);
            await thanhToanRepo.nhatKy(auth.donViId,auth.taiKhoanId,'cong_no','debts.adjust',requestId,data.ly_do,client);
            return updated;
        });
    }
    async thanhToan(auth,id,body,requestId) {
        const data = cv.thuChi(body);
        await this.quyen(auth,'debts.settle');
        const no = await this.lay(auth,id);
        await thanhToan.chiNhanh(auth,no.chi_nhanh_id);
        if (['DA_HUY','DA_THANH_TOAN','DA_XOA_NO'].includes(no.trang_thai)) throw v.loi('Công nợ đã kết thúc',409,'DEBT_CLOSED');
        return thanhToan.taoGiaoDich(auth,{ loai_giao_dich: no.loai_cong_no === 'PHAI_THU' ? 'THU' : 'CHI',chi_nhanh_id: no.chi_nhanh_id ?? auth.chiNhanhId,phuong_thuc_id: data.phuong_thuc_id,tai_khoan_nhan_id: data.tai_khoan_nhan_id,so_tien: data.so_tien,khoa_chong_trung: data.khoa_chong_trung,noi_dung: data.noi_dung,nguoi_thu_huong: data.nguoi_thu_huong,phan_bo: [{ loai_doi_tuong: 'CONG_NO',doi_tuong_id: no.id,so_tien: data.so_tien }] },requestId);
    }
    async capNhatQuaHan(auth,requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,'debts.manage',client);
            const { rowCount } = await client.query('UPDATE cong_no SET trang_thai = \'QUA_HAN\',ngay_cap_nhat = now() WHERE don_vi_id = $1 AND ngay_den_han < (now() AT TIME ZONE \'Asia/Ho_Chi_Minh\')::date AND trang_thai IN (\'CHUA_THANH_TOAN\',\'THANH_TOAN_MOT_PHAN\') AND so_tien_da_thanh_toan + so_tien_da_giam < so_tien_goc',[auth.donViId]);
            await thanhToanRepo.nhatKy(auth.donViId,auth.taiKhoanId,'cong_no','debts.overdue.refresh',requestId,`Đã cập nhật ${rowCount} khoản`,client);
            return { so_khoan_qua_han: rowCount };
        });
    }
}
module.exports = new CongNoService();