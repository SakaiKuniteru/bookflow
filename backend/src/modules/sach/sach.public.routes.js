const { Router } = require('express');
const { query } = require('../../database/query.js');
const router = Router();
const selectPublicBook = `SELECT ds.id, ds.ma_dau_sach, ds.duong_dan, ds.ten_sach, ds.ten_hien_thi, ds.ten_phu, ds.mo_ta_ngan, ds.mo_ta_day_du, ds.loai_tac_pham, ds.nam_sang_tac, ds.ngay_cong_bo, dv.ten_hien_thi AS ten_don_vi,
    (SELECT string_agg(COALESCE(tg.ten_hien_thi, tg.ho_ten), ', ' ORDER BY dstg.thu_tu_hien_thi, tg.ho_ten) FROM dau_sach_tac_gia dstg JOIN tac_gia tg ON tg.don_vi_id = dstg.don_vi_id AND tg.id = dstg.tac_gia_id WHERE dstg.don_vi_id = ds.don_vi_id AND dstg.dau_sach_id = ds.id) AS tac_gia,
    (SELECT string_agg(tl.ten_the_loai, ', ' ORDER BY dstl.thu_tu_hien_thi, tl.ten_the_loai) FROM dau_sach_the_loai dstl JOIN the_loai_sach tl ON tl.don_vi_id = dstl.don_vi_id AND tl.id = dstl.the_loai_id WHERE dstl.don_vi_id = ds.don_vi_id AND dstl.dau_sach_id = ds.id) AS the_loai,
    (SELECT COALESCE(pb.isbn_13, pb.isbn_10) FROM phien_ban_sach pb WHERE pb.don_vi_id = ds.don_vi_id AND pb.dau_sach_id = ds.id ORDER BY pb.id LIMIT 1) AS isbn
    FROM dau_sach ds JOIN don_vi dv ON dv.id = ds.don_vi_id WHERE ds.cho_hien_thi_cong_khai = TRUE AND ds.trang_thai = 'DANG_HIEN_THI' AND ds.ngay_xoa IS NULL AND dv.trang_thai = 'DANG_DUNG'`;
function safeNumber(value, fallback, max) { const parsed = Number.parseInt(value, 10); return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback; }
router.get('/', async (req, res, next) => {
    try {
        const page = safeNumber(req.query.page ?? req.query.trang, 1, 1000000);
        const pageSize = safeNumber(req.query.pageSize ?? req.query.kich_thuoc, 20, 100);
        const keyword = String(req.query.q ?? req.query.tu_khoa ?? '').trim().slice(0, 120);
        const offset = (page - 1) * pageSize;
        const args = keyword ? [`%${keyword.replace(/[\\%_]/g, '\\$&')}%`] : [];
        const where = keyword ? ` AND (ds.ten_sach ILIKE $1 ESCAPE '\\' OR ds.ten_hien_thi ILIKE $1 ESCAPE '\\' OR ds.ma_dau_sach ILIKE $1 ESCAPE '\\' OR EXISTS (SELECT 1 FROM phien_ban_sach pb WHERE pb.don_vi_id = ds.don_vi_id AND pb.dau_sach_id = ds.id AND (pb.isbn_10 ILIKE $1 ESCAPE '\\' OR pb.isbn_13 ILIKE $1 ESCAPE '\\')) OR EXISTS (SELECT 1 FROM dau_sach_tac_gia dstg JOIN tac_gia tg ON tg.don_vi_id = dstg.don_vi_id AND tg.id = dstg.tac_gia_id WHERE dstg.don_vi_id = ds.don_vi_id AND dstg.dau_sach_id = ds.id AND (tg.ho_ten ILIKE $1 ESCAPE '\\' OR tg.ten_hien_thi ILIKE $1 ESCAPE '\\')))` : '';
        const count = await query(`SELECT count(*)::integer AS total FROM dau_sach ds JOIN don_vi dv ON dv.id = ds.don_vi_id WHERE ds.cho_hien_thi_cong_khai = TRUE AND ds.trang_thai = 'DANG_HIEN_THI' AND ds.ngay_xoa IS NULL AND dv.trang_thai = 'DANG_DUNG'${where}`, args);
        const rows = await query(`${selectPublicBook}${where} ORDER BY ds.ngay_cong_bo DESC NULLS LAST, ds.ten_sach ASC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, pageSize, offset]);
        return res.json({ success: true, request_id: req.requestId, data: { sach: rows.rows, phan_trang: { trang: page, kich_thuoc: pageSize, tong_so: count.rows[0].total, tong_trang: Math.ceil(count.rows[0].total / pageSize) } } });
    } catch (error) { return next(error); }
});
router.get('/:id', async (req, res, next) => {
    try {
        if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ success: false, message: 'Không tìm thấy sách.' });
        const result = await query(`${selectPublicBook} AND ds.id = $1 LIMIT 1`, [Number(req.params.id)]);
        if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy sách.' });
        return res.json({ success: true, request_id: req.requestId, data: result.rows[0] });
    } catch (error) { return next(error); }
});
module.exports = router;
