const { trongGiaoDich } = require('../../database/transaction.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { congTien,truTien,soSanhTien } = require('../../common/utils/tien.js');
const phanQuyen = require('../phan-quyen/phan-quyen.service.js');
const thanhToan = require('../thanh-toan/thanh-toan.service.js');
const paymentRepo = require('../thanh-toan/thanh-toan.repository.js');
const soCai = require('../thanh-toan/thanh-toan.hach-toan.js');
const v = require('../thanh-toan/thanh-toan.validation.js');
const cv = require('./tien-coc.validation.js');
const repo = require('./tien-coc.repository.js');
class TienCocService {
    async quyen(auth,ma,client) {
        if (!auth?.donViId || !auth?.taiKhoanId) throw v.loi('Vui lòng đăng nhập và chọn đơn vị',403,'TENANT_REQUIRED');
        if (!await phanQuyen.kiemTraQuyen(auth,ma,{},client)) throw v.loi('Không có quyền tiền cọc',403,'FORBIDDEN');
    }
    async lay(auth,id,client,khoa = false) {
        const coc = await repo.lay(auth.donViId,v.id(id,'Tiền cọc'),client,khoa);
        if (!coc) throw v.loi('Không tìm thấy tiền cọc',404,'DEPOSIT_NOT_FOUND');
        return coc;
    }
    async danhSach(auth,query = {}) {
        await this.quyen(auth,'deposits.read');
        const filter = { ...v.trang(query),khach_hang_id: query.khach_hang_id == null ? null : v.id(query.khach_hang_id,'Khách hàng'),loai_doi_tuong: query.loai_doi_tuong ? v.enumValue(query.loai_doi_tuong,['DON_HANG','DAT_TRUOC','MUON_TRA','KHAC'],'Đối tượng') : null,trang_thai: query.trang_thai ? v.enumValue(query.trang_thai,['CHO_THU','THU_MOT_PHAN','DA_THU','GIU_MOT_PHAN','DA_TAT_TOAN','DA_HUY'],'Trạng thái') : null };
        return repo.danhSach(auth.donViId,filter);
    }
    async chiTiet(auth,id) {
        await this.quyen(auth,'deposits.read');
        const coc = await this.lay(auth,id);
        return { ...coc,so_du_kha_dung: soCai.duCoc(coc),giao_dich: await repo.giaoDich(auth.donViId,coc.id) };
    }
    async tao(auth,body,requestId) {
        const data = cv.tao(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'deposits.manage',client);
            const khach = await repo.mot('SELECT id FROM khach_hang WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL',[auth.donViId,data.khach_hang_id],client);
            if (!khach) throw v.loi('Khách hàng không thuộc đơn vị',404,'CUSTOMER_NOT_FOUND');
            if (data.loai_doi_tuong !== 'KHAC') {
                const bang = { DON_HANG: 'don_hang',DAT_TRUOC: 'dat_truoc',MUON_TRA: 'muon_tra' }[data.loai_doi_tuong];
                const target = await repo.mot(`SELECT * FROM ${bang} WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,data.doi_tuong_id],client);
                if (!target || target.khach_hang_id !== data.khach_hang_id || ['DA_HUY','HET_HAN'].includes(target.trang_thai)) throw v.loi('Đối tượng cọc không tồn tại hoặc khác khách hàng',409,'DEPOSIT_TARGET_INVALID');
                if (data.loai_doi_tuong === 'DON_HANG' && soSanhTien(data.so_tien_yeu_cau,target.tien_coc_yeu_cau) > 0) throw v.loi('Tiền cọc vượt khoản yêu cầu trên đơn hàng');
                const exists = await repo.mot('SELECT id FROM tien_coc WHERE don_vi_id = $1 AND loai_doi_tuong = $2 AND doi_tuong_id = $3 AND trang_thai <> \'DA_HUY\'',[auth.donViId,data.loai_doi_tuong,data.doi_tuong_id],client);
                if (exists) throw v.loi('Đối tượng đã có khoản cọc hoạt động',409,'DEPOSIT_ALREADY_EXISTS');
                if (data.loai_doi_tuong === 'MUON_TRA' && target.tien_coc_id) throw v.loi('Phiếu mượn trả đã liên kết tiền cọc');
            }
            const coc = await repo.tao(auth.donViId,data,await taoMaChung(client,auth.donViId,TIEN_TO.TIEN_COC),auth.taiKhoanId,client);
            if (data.loai_doi_tuong === 'MUON_TRA') await repo.mot('UPDATE muon_tra SET tien_coc_id = $3,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING id',[auth.donViId,data.doi_tuong_id,coc.id],client);
            await paymentRepo.nhatKy(auth.donViId,auth.taiKhoanId,'tien_coc','deposits.create',requestId,data.ghi_chu,client);
            return coc;
        });
    }
    async thu(auth,id,body,requestId) {
        const data = cv.thu(body);
        await this.quyen(auth,'deposits.settle');
        const coc = await this.lay(auth,id);
        if (['DA_HUY','DA_TAT_TOAN'].includes(coc.trang_thai)) throw v.loi('Tiền cọc không còn nhận thanh toán',409,'DEPOSIT_CLOSED');
        return thanhToan.taoGiaoDich(auth,{ loai_giao_dich: 'THU',chi_nhanh_id: data.chi_nhanh_id,phuong_thuc_id: data.phuong_thuc_id,tai_khoan_nhan_id: data.tai_khoan_nhan_id,so_tien: data.so_tien,khoa_chong_trung: data.khoa_chong_trung,noi_dung: data.noi_dung,phan_bo: [{ loai_doi_tuong: 'TIEN_COC',doi_tuong_id: coc.id,so_tien: data.so_tien }] },requestId);
    }
    async giu(auth,id,body,requestId) {
        const data = cv.soTien(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'deposits.manage',client);
            const coc = await this.lay(auth,id,client,true);
            if (['DA_HUY','DA_TAT_TOAN'].includes(coc.trang_thai) || soSanhTien(data.so_tien,soCai.duCoc(coc)) > 0) throw v.loi('Số dư cọc không đủ để giữ',409,'DEPOSIT_BALANCE_EXCEEDED');
            const truoc = soCai.duCoc(coc);
            const giu = congTien(coc.so_tien_dang_giu,data.so_tien);
            const updated = await repo.mot('UPDATE tien_coc SET so_tien_dang_giu = $3,trang_thai = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,coc.id,giu,soCai.trangThaiCoc(coc,coc.so_tien_da_thu,giu)],client);
            await repo.butToan(auth.donViId,coc,'GIU_COC',data.so_tien,truoc,truTien(truoc,data.so_tien),data.ly_do,auth.taiKhoanId,null,client);
            await paymentRepo.nhatKy(auth.donViId,auth.taiKhoanId,'tien_coc','deposits.hold',requestId,data.ly_do,client);
            return updated;
        });
    }
    async giaiToa(auth,id,body,requestId) {
        const data = cv.soTien(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'deposits.manage',client);
            const coc = await this.lay(auth,id,client,true);
            if (coc.trang_thai === 'DA_HUY' || soSanhTien(data.so_tien,coc.so_tien_dang_giu) > 0) throw v.loi('Số tiền giải tỏa vượt khoản đang giữ',409,'DEPOSIT_HOLD_EXCEEDED');
            const truoc = soCai.duCoc(coc);
            const giu = truTien(coc.so_tien_dang_giu,data.so_tien);
            const updated = await repo.mot('UPDATE tien_coc SET so_tien_dang_giu = $3,trang_thai = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,coc.id,giu,soCai.trangThaiCoc(coc,coc.so_tien_da_thu,giu)],client);
            await repo.butToan(auth.donViId,coc,'GIAI_TOA',data.so_tien,truoc,congTien(truoc,data.so_tien),data.ly_do,auth.taiKhoanId,null,client);
            await paymentRepo.nhatKy(auth.donViId,auth.taiKhoanId,'tien_coc','deposits.release',requestId,data.ly_do,client);
            return updated;
        });
    }
    async khauTru(auth,id,body,requestId) {
        const data = cv.khauTru(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'deposits.settle',client);
            const coc = await this.lay(auth,id,client,true);
            if (coc.trang_thai === 'DA_HUY' || soSanhTien(data.so_tien,soCai.duCoc(coc)) > 0) throw v.loi('Số dư cọc khả dụng không đủ',409,'DEPOSIT_BALANCE_EXCEEDED');
            let orderId = null;
            if (data.loai_doi_tuong === 'DON_HANG') {
                const don = await repo.mot('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.doi_tuong_id],client);
                if (!don || don.khach_hang_id !== coc.khach_hang_id || ['DA_HUY','DA_HOAN'].includes(don.trang_thai)) throw v.loi('Đơn hàng không khớp khách cọc',409,'ORDER_INVALID');
                if (coc.loai_doi_tuong === 'DON_HANG' && coc.doi_tuong_id !== don.id) throw v.loi('Tiền cọc chỉ khấu trừ vào đơn gốc');
                if (coc.loai_doi_tuong === 'DAT_TRUOC' || coc.loai_doi_tuong === 'MUON_TRA') {
                    const lienKet = await repo.mot(`SELECT don_hang_id FROM ${coc.loai_doi_tuong === 'DAT_TRUOC' ? 'dat_truoc' : 'muon_tra'} WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,coc.doi_tuong_id],client);
                    if (!lienKet?.don_hang_id || lienKet.don_hang_id !== don.id) throw v.loi('Khoản cọc chưa liên kết đơn hàng này',409,'ORDER_NOT_LINKED');
                }
                const debt = await repo.mot('SELECT id FROM cong_no WHERE don_vi_id = $1 AND loai_cong_no = \'PHAI_THU\' AND loai_nguon = \'DON_HANG\' AND nguon_id = $2 AND trang_thai NOT IN (\'DA_HUY\',\'DA_XOA_NO\',\'DA_THANH_TOAN\') AND so_tien_da_thanh_toan + so_tien_da_giam < so_tien_goc',[auth.donViId,don.id],client);
                if (debt) throw v.loi('Đơn đã ghi công nợ: hãy khấu trừ vào công nợ',409,'DEBT_SETTLEMENT_REQUIRED');
                if (soSanhTien(data.so_tien,truTien(don.tong_thanh_toan,don.tien_da_thanh_toan)) > 0) throw v.loi('Khấu trừ vượt số tiền còn phải thanh toán');
                const daThu = congTien(don.tien_da_thanh_toan,data.so_tien);
                await repo.mot('UPDATE don_hang SET tien_da_thanh_toan = $3,trang_thai_thanh_toan = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING id',[auth.donViId,don.id,daThu,soSanhTien(daThu,don.tong_thanh_toan) === 0 ? 'DA_THANH_TOAN' : 'THANH_TOAN_MOT_PHAN'],client);
                orderId = don.id;
            } else {
                const no = await repo.mot('SELECT * FROM cong_no WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,data.doi_tuong_id],client);
                if (!no || no.loai_cong_no !== 'PHAI_THU' || no.khach_hang_id !== coc.khach_hang_id || ['DA_HUY','DA_XOA_NO','DA_THANH_TOAN'].includes(no.trang_thai)) throw v.loi('Công nợ không hợp lệ cho khấu trừ',409,'DEBT_INVALID');
                if (coc.loai_doi_tuong === 'DON_HANG' && (no.loai_nguon !== 'DON_HANG' || no.nguon_id !== coc.doi_tuong_id)) throw v.loi('Công nợ không thuộc đơn hàng đã cọc');
                const truocNo = soCai.duNo(no);
                if (soSanhTien(data.so_tien,truocNo) > 0) throw v.loi('Khấu trừ vượt dư nợ');
                const daThu = congTien(no.so_tien_da_thanh_toan,data.so_tien);
                await repo.mot('UPDATE cong_no SET so_tien_da_thanh_toan = $3,trang_thai = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING id',[auth.donViId,no.id,daThu,soCai.trangThaiNo(no,daThu)],client);
                await repo.mot('INSERT INTO but_toan_cong_no(don_vi_id,cong_no_id,loai,so_tien_thay_doi,du_no_truoc,du_no_sau,ma_chung_tu,ly_do,nguoi_thuc_hien_id) VALUES($1,$2,\'THANH_TOAN\',$3,$4,$5,$6,$7,$8) RETURNING id',[auth.donViId,no.id,truTien('0',data.so_tien),truocNo,truTien(truocNo,data.so_tien),coc.ma_coc,data.ly_do,auth.taiKhoanId],client);
                if (no.loai_nguon === 'DON_HANG') {
                    const don = await repo.mot('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[auth.donViId,no.nguon_id],client);
                    if (!don || soSanhTien(data.so_tien,truTien(don.tong_thanh_toan,don.tien_da_thanh_toan)) > 0) throw v.loi('Số dư đơn hàng gốc không khớp');
                    const thanhToanMoi = congTien(don.tien_da_thanh_toan,data.so_tien);
                    await repo.mot('UPDATE don_hang SET tien_da_thanh_toan = $3,trang_thai_thanh_toan = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING id',[auth.donViId,don.id,thanhToanMoi,soSanhTien(thanhToanMoi,don.tong_thanh_toan) === 0 ? 'DA_THANH_TOAN' : 'THANH_TOAN_MOT_PHAN'],client);
                    orderId = don.id;
                }
            }
            const truoc = soCai.duCoc(coc);
            const khau = congTien(coc.so_tien_da_khau_tru,data.so_tien);
            const updated = await repo.mot('UPDATE tien_coc SET so_tien_da_khau_tru = $3,trang_thai = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,coc.id,khau,soCai.trangThaiCoc(coc,coc.so_tien_da_thu,coc.so_tien_dang_giu,khau)],client);
            const trace = `Khấu trừ ${data.loai_doi_tuong}:${data.doi_tuong_id}; ${data.ly_do}`;
            const event = await repo.butToan(auth.donViId,coc,'KHAU_TRU',data.so_tien,truoc,truTien(truoc,data.so_tien),trace,auth.taiKhoanId,null,client);
            await paymentRepo.nhatKy(auth.donViId,auth.taiKhoanId,'tien_coc','deposits.offset',requestId,trace,client);
            return { tien_coc: updated,giao_dich_coc: event,don_hang_id: orderId };
        });
    }
    async yeuCauHoan(auth,id,body,requestId) {
        const data = cv.yeuCauHoan(body);
        await this.quyen(auth,'deposits.settle');
        const coc = await this.lay(auth,id);
        if (soSanhTien(data.so_tien,soCai.duCoc(coc)) > 0) throw v.loi('Số dư khả dụng không đủ hoàn',409,'DEPOSIT_REFUND_EXCEEDED');
        return thanhToan.taoYeuCauHoan(auth,{ giao_dich_goc_id: data.giao_dich_goc_id,tien_coc_id: coc.id,so_tien: data.so_tien,ly_do: data.ly_do },requestId);
    }
    async huy(auth,id,body,requestId) {
        v.fields(body,['ly_do'],['ly_do']);
        const lyDo = v.chuoi(body.ly_do,'Lý do',20000,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'deposits.manage',client);
            const coc = await this.lay(auth,id,client,true);
            if (coc.trang_thai !== 'CHO_THU' || soSanhTien(coc.so_tien_da_thu,'0') > 0) throw v.loi('Chỉ hủy tiền cọc chưa thu tiền',409,'DEPOSIT_CANNOT_CANCEL');
            const pending = await repo.mot('SELECT gd.id FROM giao_dich_thanh_toan gd CROSS JOIN LATERAL jsonb_array_elements(COALESCE(gd.du_lieu_yeu_cau->\'phan_bo\',\'[]\'::jsonb)) pb WHERE gd.don_vi_id = $1 AND gd.trang_thai IN (\'KHOI_TAO\',\'CHO_XU_LY\') AND pb->>\'loai_doi_tuong\' = \'TIEN_COC\' AND (pb->>\'doi_tuong_id\')::bigint = $2 LIMIT 1',[auth.donViId,coc.id],client);
            if (pending) throw v.loi('Khoản cọc còn giao dịch thu đang chờ',409,'DEPOSIT_PENDING_PAYMENT');
            const updated = await repo.mot(`UPDATE tien_coc SET trang_thai = 'DA_HUY',ghi_chu = CONCAT_WS(E'\n',ghi_chu,$3),ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,coc.id,`Hủy: ${lyDo}`],client);
            if (coc.loai_doi_tuong === 'MUON_TRA') await repo.mot('UPDATE muon_tra SET tien_coc_id = NULL,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 AND tien_coc_id = $3 RETURNING id',[auth.donViId,coc.doi_tuong_id,coc.id],client);
            await paymentRepo.nhatKy(auth.donViId,auth.taiKhoanId,'tien_coc','deposits.cancel',requestId,lyDo,client);
            return updated;
        });
    }
}
module.exports = new TienCocService();