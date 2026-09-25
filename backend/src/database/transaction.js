import { layPool } from './pool.js';

export async function trongGiaoDich(callback, { pool = layPool() } = {}) {
    if (typeof callback !== 'function') throw new TypeError('callback phải là hàm');
    const client = await pool.connect();
    let loiKetNoi = null;
    try {
        await client.query('BEGIN');
        const ketQua = await callback(client);
        await client.query('COMMIT');
        return ketQua;
    } catch (error) {
        try { await client.query('ROLLBACK'); }
        catch (rollbackError) {
            loiKetNoi = rollbackError;
            throw new AggregateError([error, rollbackError], 'Giao dịch và rollback đều thất bại');
        }
        throw error;
    } finally {
        client.release(loiKetNoi);
    }
}