import { kiemTraRedis } from '../integrations/redis.js';
import { kiemTraStorage } from '../integrations/storage.js';

export async function kiemTraSanSang({ pool, moiTruong }) {
    const ketQua = await Promise.allSettled([
        pool.query('SELECT 1'),
        kiemTraRedis(moiTruong.redis),
        kiemTraStorage(moiTruong.storage)
    ]);
    return {
        database: ketQua[0].status === 'fulfilled',
        redis: ketQua[1].status === 'fulfilled',
        storage: ketQua[2].status === 'fulfilled'
    };
}