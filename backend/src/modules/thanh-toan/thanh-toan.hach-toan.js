const { query } = require('../../database/query.js');
const { congTien,truTien,soSanhTien } = require('../../common/utils/tien.js');
const v = require('./thanh-toan.validation.js');
const repo = require('./thanh-toan.repository.js');
function duNo(no) { return truTien(no.so_tien_goc,congTien(no.so_tien_da_thanh_toan,no.so_tien_da_giam)); }
function duCoc(coc) { return truTien(coc.so_tien_da_thu,congTien(coc.so_tien_da_khau_tru,coc.so_tien_da_hoan,coc.so_tien_dang_giu)); }
function trangThaiNo(no,daThanhToan = no.so_tien_da_thanh_toan,daGiam = no.so_tien_da_giam) {
    const conLai = truTien(no.so_tien_goc,congTien(daThanhToan,daGiam));
    if (soSanhTien(conLai,'0') === 0) return 'DA_THANH_TOAN';
    if (no.ngay_den_han && new Date(no.ngay_den_han).toISOString().slice(0,10) < new Date().toISOString().slice(0,10)) return 'QUA_HAN';
    return soSanhTien(congTien(daThanhToan,daGiam),'0') > 0 ? 'THANH_TOAN_MOT_PHAN' : 'CHUA_THANH_TOAN';
}
function trangThaiCoc(coc,thu = coc.so_tien_da_thu,giu = coc.so_tien_dang_giu,khau = coc.so_tien_da_khau_tru,hoan = coc.so_tien_da_hoan) {
    if (soSanhTien(thu,'0') === 0) return 'CHO_THU';
    if (soSanhTien(truTien(thu,congTien(khau,hoan)),'0') === 0) return 'DA_TAT_TOAN';
    if (soSanhTien(giu,'0') > 0) return 'GIU_MOT_PHAN';
    if (soSanhTien(thu,coc.so_tien_yeu_cau) < 0) return 'THU_MOT_PHAN';
    return 'DA_THU';
}
async function ghiSoGiaoDich(donViId,gd,actorId,client) {
    if (gd.trang_thai === 'THANH_CONG') return gd;
    if (!['KHOI_TAO','CHO_XU_LY'].includes(gd.trang_thai) || !['THU','CHI'].includes(gd.loai_giao_dich)) throw v.loi('Giao dịch không thể ghi sổ',409,'INVALID_TRANSACTION_STATE');
    const allocs = gd.du_lieu_yeu_cau?.phan_bo;
    if (!Array.isArray(allocs) || !allocs.length || soSanhTien(congTien(...allocs.map(item => item.so_tien)),gd.so_tien) !== 0) throw v.loi('Dữ liệu phân bổ không khớp giao dịch',409,'ALLOCATION_MISMATCH');
    for (const a of [...allocs].sort((x,y) => x.loai_doi_tuong.localeCompare(y.loai_doi_tuong) || x.doi_tuong_id - y.doi_tuong_id)) {
        if (a.loai_doi_tuong === 'DON_HANG') {
            if (gd.loai_giao_dich !== 'THU') throw v.loi('Chỉ giao dịch thu được phân bổ vào đơn hàng');
            const { rows } = await query('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[donViId,a.doi_tuong_id],client);
            const don = rows[0];
            if (!don || don.chi_nhanh_id !== gd.chi_nhanh_id || ['DA_HUY','DA_HOAN'].includes(don.trang_thai)) throw v.loi('Đơn hàng không hợp lệ cho thanh toán',409,'ORDER_INVALID');
            const { rows: debts } = await query(`SELECT id FROM cong_no WHERE don_vi_id = $1 AND loai_cong_no = 'PHAI_THU' AND loai_nguon = 'DON_HANG' AND nguon_id = $2 AND trang_thai NOT IN ('DA_HUY','DA_THANH_TOAN','DA_XOA_NO') AND so_tien_da_thanh_toan + so_tien_da_giam < so_tien_goc LIMIT 1`,[donViId,don.id],client);
            if (debts.length) throw v.loi('Đơn có công nợ phải thu; hãy thanh toán qua công nợ',409,'DEBT_PAYMENT_REQUIRED');
            if (soSanhTien(a.so_tien,truTien(don.tong_thanh_toan,don.tien_da_thanh_toan)) > 0) throw v.loi('Số tiền thu vượt số còn thanh toán của đơn hàng',409,'ORDER_OVERPAYMENT');
            const moi = congTien(don.tien_da_thanh_toan,a.so_tien);
            const trangThai = soSanhTien(moi,don.tong_thanh_toan) === 0 ? 'DA_THANH_TOAN' : 'THANH_TOAN_MOT_PHAN';
            await query('UPDATE don_hang SET tien_da_thanh_toan = $3,trang_thai_thanh_toan = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[donViId,don.id,moi,trangThai],client);
        } else if (a.loai_doi_tuong === 'CONG_NO') {
            const { rows } = await query('SELECT * FROM cong_no WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[donViId,a.doi_tuong_id],client);
            const no = rows[0];
            if (!no || ['DA_HUY','DA_XOA_NO'].includes(no.trang_thai) || (gd.loai_giao_dich === 'THU' ? no.loai_cong_no !== 'PHAI_THU' : no.loai_cong_no !== 'PHAI_TRA')) throw v.loi('Công nợ không phù hợp giao dịch',409,'DEBT_INVALID');
            if (no.chi_nhanh_id && no.chi_nhanh_id !== gd.chi_nhanh_id) throw v.loi('Chi nhánh công nợ không khớp',409,'BRANCH_MISMATCH');
            const truoc = duNo(no);
            if (soSanhTien(a.so_tien,truoc) > 0) throw v.loi('Thanh toán vượt dư nợ còn lại',409,'DEBT_OVERPAYMENT');
            const sau = truTien(truoc,a.so_tien);
            const moi = congTien(no.so_tien_da_thanh_toan,a.so_tien);
            await query('UPDATE cong_no SET so_tien_da_thanh_toan = $3,trang_thai = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[donViId,no.id,moi,trangThaiNo(no,moi)],client);
            await query(`INSERT INTO but_toan_cong_no(don_vi_id,cong_no_id,loai,so_tien_thay_doi,du_no_truoc,du_no_sau,giao_dich_thanh_toan_id,ma_chung_tu,nguoi_thuc_hien_id) VALUES($1,$2,'THANH_TOAN',$3,$4,$5,$6,$7,$8)`,[donViId,no.id,truTien('0',a.so_tien),truoc,sau,gd.id,gd.ma_giao_dich,actorId],client);
            if (no.loai_cong_no === 'PHAI_THU' && no.loai_nguon === 'DON_HANG') {
                const { rows: orders } = await query('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[donViId,no.nguon_id],client);
                const don = orders[0];
                if (!don || don.trang_thai === 'DA_HUY' || soSanhTien(a.so_tien,truTien(don.tong_thanh_toan,don.tien_da_thanh_toan)) > 0) throw v.loi('Số dư đơn hàng gốc không khớp công nợ',409,'ORDER_DEBT_MISMATCH');
                const daThu = congTien(don.tien_da_thanh_toan,a.so_tien);
                await query('UPDATE don_hang SET tien_da_thanh_toan = $3,trang_thai_thanh_toan = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[donViId,don.id,daThu,soSanhTien(daThu,don.tong_thanh_toan) === 0 ? 'DA_THANH_TOAN' : 'THANH_TOAN_MOT_PHAN'],client);
            }
        } else if (a.loai_doi_tuong === 'TIEN_COC') {
            if (gd.loai_giao_dich !== 'THU') throw v.loi('Không thể chi trực tiếp vào khoản tiền cọc');
            const { rows } = await query('SELECT * FROM tien_coc WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[donViId,a.doi_tuong_id],client);
            const coc = rows[0];
            if (!coc || coc.trang_thai === 'DA_HUY' || coc.trang_thai === 'DA_TAT_TOAN') throw v.loi('Khoản cọc không còn nhận tiền',409,'DEPOSIT_INVALID');
            if (soSanhTien(a.so_tien,truTien(coc.so_tien_yeu_cau,coc.so_tien_da_thu)) > 0) throw v.loi('Thu vượt số tiền cọc yêu cầu',409,'DEPOSIT_OVERPAYMENT');
            const truoc = duCoc(coc);
            const thu = congTien(coc.so_tien_da_thu,a.so_tien);
            await query('UPDATE tien_coc SET so_tien_da_thu = $3,trang_thai = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[donViId,coc.id,thu,trangThaiCoc(coc,thu)],client);
            await query(`INSERT INTO giao_dich_tien_coc(don_vi_id,tien_coc_id,giao_dich_thanh_toan_id,loai,so_tien,so_du_truoc,so_du_sau,nguoi_thuc_hien_id) VALUES($1,$2,$3,'THU_COC',$4,$5,$6,$7)`,[donViId,coc.id,gd.id,a.so_tien,truoc,congTien(truoc,a.so_tien),actorId],client);
        } else throw v.loi('Đối tượng phân bổ không hỗ trợ');
        await repo.phanBo(donViId,gd.id,a,client);
    }
    const ketQua = await repo.ghiKetQua(donViId,gd.id,'THANH_CONG',gd.ma_giao_dich_doi_tac,gd.du_lieu_phan_hoi,client);
    if (gd.du_lieu_yeu_cau?.loai_phuong_thuc === 'TIEN_MAT' && gd.du_lieu_yeu_cau?.ca_ban_hang_id) {
        const field = gd.loai_giao_dich === 'THU' ? 'tien_mat_thu' : 'tien_mat_chi';
        const { rowCount } = await query(`UPDATE ca_ban_hang SET ${field} = ${field} + $3 WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_MO'`,[donViId,gd.du_lieu_yeu_cau.ca_ban_hang_id,gd.so_tien],client);
        if (rowCount !== 1) throw v.loi('Không tìm thấy ca tiền mặt đang mở',409,'SHIFT_NOT_OPEN');
    }
    return ketQua;
}
async function ghiSoHoan(donViId,gd,yeuCau,actorId,client) {
    if (gd.trang_thai === 'THANH_CONG') return gd;
    if (gd.loai_giao_dich !== 'HOAN_TIEN' || gd.trang_thai !== 'CHO_XU_LY' || yeuCau.giao_dich_hoan_id !== gd.id || yeuCau.trang_thai !== 'DANG_HOAN') throw v.loi('Yêu cầu hoàn không ở trạng thái được phép',409,'REFUND_INVALID');
    if (yeuCau.don_hang_id) {
        const { rows } = await query('SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[donViId,yeuCau.don_hang_id],client);
        const don = rows[0];
        if (!don || soSanhTien(yeuCau.so_tien,truTien(don.tien_da_thanh_toan,don.tien_da_hoan)) > 0) throw v.loi('Số dư đơn không đủ hoàn',409,'ORDER_REFUND_EXCEEDED');
        const daHoan = congTien(don.tien_da_hoan,yeuCau.so_tien);
        await query('UPDATE don_hang SET tien_da_hoan = $3,trang_thai_thanh_toan = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[donViId,don.id,daHoan,soSanhTien(daHoan,don.tien_da_thanh_toan) === 0 ? 'DA_HOAN' : 'HOAN_MOT_PHAN'],client);
        await repo.phanBo(donViId,gd.id,{ loai_doi_tuong: 'DON_HANG',doi_tuong_id: don.id,so_tien: yeuCau.so_tien },client);
    } else if (yeuCau.tien_coc_id) {
        const { rows } = await query('SELECT * FROM tien_coc WHERE don_vi_id = $1 AND id = $2 FOR UPDATE',[donViId,yeuCau.tien_coc_id],client);
        const coc = rows[0];
        if (!coc || soSanhTien(yeuCau.so_tien,duCoc(coc)) > 0) throw v.loi('Tiền cọc khả dụng không đủ để hoàn',409,'DEPOSIT_REFUND_EXCEEDED');
        const truoc = duCoc(coc);
        const moi = congTien(coc.so_tien_da_hoan,yeuCau.so_tien);
        await query('UPDATE tien_coc SET so_tien_da_hoan = $3,trang_thai = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[donViId,coc.id,moi,trangThaiCoc(coc,coc.so_tien_da_thu,coc.so_tien_dang_giu,coc.so_tien_da_khau_tru,moi)],client);
        await query(`INSERT INTO giao_dich_tien_coc(don_vi_id,tien_coc_id,giao_dich_thanh_toan_id,loai,so_tien,so_du_truoc,so_du_sau,nguoi_thuc_hien_id) VALUES($1,$2,$3,'HOAN_COC',$4,$5,$6,$7)`,[donViId,coc.id,gd.id,yeuCau.so_tien,truoc,truTien(truoc,yeuCau.so_tien),actorId],client);
        await repo.phanBo(donViId,gd.id,{ loai_doi_tuong: 'TIEN_COC',doi_tuong_id: coc.id,so_tien: yeuCau.so_tien },client);
    } else throw v.loi('Yêu cầu hoàn không có đối tượng');
    if (gd.du_lieu_yeu_cau?.loai_phuong_thuc === 'TIEN_MAT') {
        const caId = gd.du_lieu_phan_hoi?.ca_ban_hang_id;
        if (!caId) throw v.loi('Hoàn tiền mặt phải xác định ca chi tiền',409,'REFUND_CASH_SHIFT_REQUIRED');
        const { rowCount } = await query(`UPDATE ca_ban_hang SET tien_mat_chi = tien_mat_chi + $3 WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_MO' AND thu_ngan_id = $4`,[donViId,caId,gd.so_tien,actorId],client);
        if (rowCount !== 1) throw v.loi('Ca chi tiền không mở hoặc không thuộc người xác nhận',403,'REFUND_CASH_SHIFT_INVALID');
    }
    await query(`UPDATE yeu_cau_hoan_tien SET trang_thai = 'DA_HOAN',ngay_hoan = now() WHERE don_vi_id = $1 AND id = $2`,[donViId,yeuCau.id],client);
    return repo.ghiKetQua(donViId,gd.id,'THANH_CONG',gd.ma_giao_dich_doi_tac,gd.du_lieu_phan_hoi,client);
}
module.exports = { duNo,duCoc,trangThaiNo,trangThaiCoc,ghiSoGiaoDich,ghiSoHoan };