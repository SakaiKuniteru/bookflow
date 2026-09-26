const { query } = require('../../database/query.js');
const { BANG, loi } = require('./nha-cung-cap.validation.js');
class NhaCungCapRepository {
    constructor(bang = BANG) {
        this.BANG = bang;
    }
    async cotChoPhep(bang, client) {
        const { rows } = await query(`SELECT column_name, is_generated FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [bang], client);
        if (!rows.length) throw loi(`Chưa có bảng ${bang} trong database`, 500, 'SCHEMA_MISSING');
        const cam = new Set(['id', 'don_vi_id', 'ngay_tao', 'ngay_cap_nhat', 'nguoi_tao_id', 'nguoi_cap_nhat_id', 'ngay_xoa']);
        if (this.BANG[bang].khoaCha) cam.add(this.BANG[bang].khoaCha);
        return new Set(rows.filter(row => row.is_generated === 'NEVER' && !cam.has(row.column_name)).map(row => row.column_name));
    }
    async kiemTraCot(bang, duLieu, client) {
        const choPhep = await this.cotChoPhep(bang, client);
        for (const ten of Object.keys(duLieu)) if (!choPhep.has(ten)) throw loi(`Trường ${ten} không tồn tại hoặc không được phép cập nhật`);
    }
    async lay(donViId, bang, id, client, khoa = false) {
        const cauHinh = this.BANG[bang];
        const { rows } = await query(`SELECT * FROM ${bang} WHERE don_vi_id = $1 AND id = $2${cauHinh.xoaMem ? ' AND ngay_xoa IS NULL' : ''}${khoa ? ' FOR UPDATE' : ''}`, [donViId, id], client);
        return rows[0] ?? null;
    }
    async danhSach(donViId, bang, boLoc, { chaId = null } = {}, client) {
        const cauHinh = this.BANG[bang];
        const where = ['don_vi_id = $1'];
        const thamSo = [donViId];
        if (cauHinh.xoaMem) where.push('ngay_xoa IS NULL');
        if (cauHinh.khoaCha) {
            thamSo.push(chaId);
            where.push(`${cauHinh.khoaCha} = $${thamSo.length}`);
        }
        if (boLoc.trang_thai) {
            thamSo.push(boLoc.trang_thai);
            where.push(`trang_thai = $${thamSo.length}`);
        }
        if (boLoc.tu_khoa) {
            const cot = [cauHinh.ma, cauHinh.ten].filter(Boolean);
            if (cot.length) {
                thamSo.push(`%${boLoc.tu_khoa}%`);
                where.push(`(${cot.map(ten => `${ten} ILIKE $${thamSo.length}`).join(' OR ')})`);
            }
        }
        const dieuKien = where.join(' AND ');
        const { rows: [dem] } = await query(`SELECT COUNT(*)::INTEGER AS tong FROM ${bang} WHERE ${dieuKien}`, thamSo, client);
        const { rows } = await query(`SELECT * FROM ${bang} WHERE ${dieuKien} ORDER BY id DESC LIMIT $${thamSo.length + 1} OFFSET $${thamSo.length + 2}`, [...thamSo, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client);
        return { danh_sach: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong: dem.tong, tong_trang: Math.ceil(dem.tong / boLoc.kich_thuoc) } };
    }
    async tao(donViId, actorId, bang, duLieu, { chaId = null } = {}, client) {
        await this.kiemTraCot(bang, duLieu, client);
        const cauHinh = this.BANG[bang];
        const cot = ['don_vi_id', 'nguoi_tao_id', ...cauHinh.khoaCha ? [cauHinh.khoaCha] : [], ...Object.keys(duLieu)];
        const giaTri = [donViId, actorId, ...cauHinh.khoaCha ? [chaId] : [], ...Object.values(duLieu)];
        const { rows } = await query(`INSERT INTO ${bang} (${cot.join(', ')}) VALUES (${cot.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, giaTri, client);
        return rows[0];
    }
    async sua(donViId, actorId, bang, id, duLieu, { chaId = null } = {}, client) {
        await this.kiemTraCot(bang, duLieu, client);
        const cauHinh = this.BANG[bang];
        const cot = Object.keys(duLieu);
        const thamSo = [donViId, id, actorId, ...cauHinh.khoaCha ? [chaId] : [], ...Object.values(duLieu)];
        const batDau = cauHinh.khoaCha ? 5 : 4;
        const whereCha = cauHinh.khoaCha ? ` AND ${cauHinh.khoaCha} = $4` : '';
        const { rows } = await query(`UPDATE ${bang} SET ${cot.map((ten, i) => `${ten} = $${batDau + i}`).join(', ')}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2${whereCha}${cauHinh.xoaMem ? ' AND ngay_xoa IS NULL' : ''} RETURNING *`, thamSo, client);
        return rows[0] ?? null;
    }
    async xoa(donViId, actorId, bang, id, { chaId = null } = {}, client) {
        const cauHinh = this.BANG[bang];
        const thamSo = [donViId, id, ...cauHinh.khoaCha ? [chaId] : []];
        const whereCha = cauHinh.khoaCha ? ` AND ${cauHinh.khoaCha} = $3` : '';
        const sql = cauHinh.xoaMem
            ? `UPDATE ${bang} SET ngay_xoa = now(), nguoi_cap_nhat_id = $${thamSo.length + 1} WHERE don_vi_id = $1 AND id = $2${whereCha} AND ngay_xoa IS NULL RETURNING *`
            : `DELETE FROM ${bang} WHERE don_vi_id = $1 AND id = $2${whereCha} RETURNING *`;
        const { rows } = await query(sql, cauHinh.xoaMem ? [...thamSo, actorId] : thamSo, client);
        return rows[0] ?? null;
    }
    async ghiNhatKy({ donViId, actorId, bang, id, hanhDong, requestId }, client) {
        await query(`INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai, doi_tuong_id, ket_qua, ly_do, request_id, nguon) VALUES ($1,$2,$3,$4,$5,'THANH_CONG','Quản lý danh mục',$6,'API')`, [donViId, actorId, hanhDong, bang, id, requestId], client);
    }
}
module.exports = new NhaCungCapRepository();