import { layPool } from './pool.js';

export function query(sql, thamSo = [], ketNoi = layPool()) {
    if (typeof sql !== 'string' || !sql.trim()) throw new TypeError('SQL không hợp lệ');
    if (!Array.isArray(thamSo)) throw new TypeError('Tham số truy vấn phải là mảng');
    return ketNoi.query(sql, thamSo);
}