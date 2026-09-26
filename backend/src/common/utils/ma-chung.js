const TIEN_TO = Object.freeze({ 
    DON_HANG: 'DH',
    GIAO_DICH: 'GD',
    CONG_NO: 'CN',
    TIEN_COC: 'TC',
    HOAN_TIEN: 'YH',
    DOI_SOAT: 'DS',
    VAN_DON: 'VD',
    CA_BAN_HANG: 'CB',
    PHIEN_BAN_HANG: 'PB',
    GIU_CHO: 'GC',
    DAT_TRUOC: 'DT',
    MUON_TRA: 'MT',
    GIA_HAN: 'GH',
    PHI_PHAT: 'PP',
    GIU_CHO: 'GC', 
});
async function taoMaChung(client,donViId,tienTo,ngay = new Date(),muiGio = 'Asia/Ho_Chi_Minh') {
    if (!client || typeof client.query !== 'function') throw new TypeError('Cần client đang ở trong transaction');
    if (!Number.isSafeInteger(Number(donViId)) || Number(donViId) <= 0) throw new TypeError('Đơn vị không hợp lệ');
    if (!/^[A-Z]{2,12}$/.test(tienTo)) throw new TypeError('Tiền tố không hợp lệ');
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{ timeZone: muiGio,year: 'numeric',month: '2-digit',day: '2-digit' }).formatToParts(ngay).filter(item => ['year','month','day'].includes(item.type)).map(item => [item.type,item.value]));
    const { rows } = await client.query('INSERT INTO bo_dem_ma_chung(don_vi_id,tien_to,ngay,gia_tri) VALUES($1,$2,$3,1) ON CONFLICT(don_vi_id,tien_to,ngay) DO UPDATE SET gia_tri = bo_dem_ma_chung.gia_tri + 1 WHERE bo_dem_ma_chung.gia_tri < 99999 RETURNING gia_tri',[donViId,tienTo,`${parts.year}-${parts.month}-${parts.day}`]);
    if (!rows.length) throw new Error(`Hết dải mã ${tienTo} trong ngày`);
    return `${tienTo}${parts.year.slice(-2)}${parts.month}${parts.day}${String(rows[0].gia_tri).padStart(5,'0')}`;
}
module.exports = { TIEN_TO,taoMaChung };