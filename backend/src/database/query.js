const databasePool = require('./pool.js');

function query(sql, thamSo = [], ketNoi = databasePool.layPool()) {
    if (typeof sql !== 'string' || !sql.trim()) throw new TypeError('SQL không hợp lệ');
    if (!Array.isArray(thamSo)) throw new TypeError('Tham số truy vấn phải là mảng');
    return ketNoi.query(sql, thamSo);
}

module.exports = { query };