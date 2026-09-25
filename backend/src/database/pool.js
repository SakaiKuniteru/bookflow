import { Pool } from 'pg';

let poolChung = null;

export function taoPool(moiTruong) {
    return new Pool({
        host: moiTruong.database.host,
        port: moiTruong.database.port,
        user: moiTruong.database.user,
        password: moiTruong.database.password,
        database: moiTruong.database.name,
        max: 10,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000
    });
}
export function layPool(moiTruong) {
    if (!poolChung) {
        if (!moiTruong) throw new Error('Database pool chưa được khởi tạo');
        poolChung = taoPool(moiTruong);
    }
    return poolChung;
}
export async function dongPool() {
    if (!poolChung) return;
    const pool = poolChung;
    poolChung = null;
    await pool.end();
}