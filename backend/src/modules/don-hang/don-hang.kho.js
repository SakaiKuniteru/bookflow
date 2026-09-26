const { query } = require('../../database/query.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { AppError } = require('../../common/errors/AppError.js');
function loi(message) {
    return new AppError({ code: 'INVENTORY_CONFLICT',message,status: 409 });
}
async function giuHang(donViId,chiNhanhId,donHangId,chiTiet,nguoiId,client) {
    for (const item of chiTiet) {
        let conLai = item.so_luong;
        const { rows } = await query(`SELECT tk.* FROM ton_kho tk JOIN kho k ON k.don_vi_id = tk.don_vi_id AND k.id = tk.kho_id WHERE tk.don_vi_id = $1 AND k.chi_nhanh_id = $2 AND tk.phien_ban_sach_id = $3 AND k.cho_ban_hang = TRUE AND k.cho_xuat_hang = TRUE AND tk.so_luong_kha_dung > 0 ORDER BY tk.ngay_nhap_gan_nhat NULLS LAST,tk.id FOR UPDATE OF tk`,[donViId,chiNhanhId,item.phien_ban_sach_id],client);
        for (const ton of rows) {
            if (!conLai) break;
            const soLuong = Math.min(conLai,ton.so_luong_kha_dung);
            const ma = await taoMaChung(client,donViId,TIEN_TO.GIU_CHO);
            await query(`UPDATE ton_kho SET so_luong_giu_cho = so_luong_giu_cho + $3,phien_ban_du_lieu = phien_ban_du_lieu + 1,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2`,[donViId,ton.id,soLuong],client);
            await query(`INSERT INTO giu_cho_ton_kho(don_vi_id,ma_giu_cho,ton_kho_id,so_luong,nguon_giu_cho,chung_tu_id,chi_tiet_chung_tu_id,nguoi_tao_id) VALUES($1,$2,$3,$4,'DON_HANG',$5,$6,$7)`,[donViId,ma,ton.id,soLuong,donHangId,item.id,nguoiId],client);
            conLai -= soLuong;
        }
        if (conLai) throw loi(`Không đủ tồn khả dụng cho phiên bản sách ${item.phien_ban_sach_id}; thiếu ${conLai}`);
    }
}
async function giaiPhong(donViId,donHangId,nguoiId,client) {
    const { rows } = await query(`SELECT gc.* FROM giu_cho_ton_kho gc WHERE gc.don_vi_id = $1 AND gc.nguon_giu_cho = 'DON_HANG' AND gc.chung_tu_id = $2 AND gc.trang_thai = 'DANG_GIU' ORDER BY gc.ton_kho_id,gc.id FOR UPDATE`,[donViId,donHangId],client);
    for (const gc of rows) {
        await query('UPDATE ton_kho SET so_luong_giu_cho = so_luong_giu_cho - $3,phien_ban_du_lieu = phien_ban_du_lieu + 1,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2',[donViId,gc.ton_kho_id,gc.so_luong],client);
        await query(`UPDATE giu_cho_ton_kho SET trang_thai = 'DA_GIAI_PHONG',ngay_giai_phong = now(),nguoi_giai_phong_id = $3 WHERE don_vi_id = $1 AND id = $2`,[donViId,gc.id,nguoiId],client);
    }
}
module.exports = { giuHang,giaiPhong };