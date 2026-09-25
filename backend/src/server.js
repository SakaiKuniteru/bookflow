import { taoUngDung } from './app.js';
import { docMoiTruong } from './config/environment.js';
import { layPool, dongPool } from './database/pool.js';
import { kiemTraSanSang } from './services/ready.service.js';

const moiTruong = docMoiTruong();
const pool = layPool(moiTruong);
const app = taoUngDung({
    kiemTraSanSang: () => kiemTraSanSang({ pool, moiTruong })
});
const server = app.listen(moiTruong.port, '0.0.0.0', () => {
    console.log(`Backend đang chạy tại cổng ${moiTruong.port}`);
});
server.on('error', async (error) => {
    console.error(`Backend không khởi động được: ${error.code ?? error.name}`);
    process.exitCode = 1;
    await dongPool();
});
let dangDung = false;
function dungBackend() {
    if (dangDung) return;
    dangDung = true;
    server.close(async (error) => {
        if (error) {
            console.error(`Không đóng được HTTP server: ${error.code ?? error.name}`);
            process.exitCode = 1;
        }
        try { await dongPool(); }
        catch (loiPool) {
            console.error(`Không đóng được database pool: ${loiPool.name}`);
            process.exitCode = 1;
        }
    });
}
process.once('SIGINT', dungBackend);
process.once('SIGTERM', dungBackend);