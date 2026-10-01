const { taoUngDung } = require('./app.js');
const { docMoiTruong } = require('./config/environment.js');
const databasePool = require('./database/pool.js');
const readyService = require('./services/ready.service.js');
const thongBaoService = require('./modules/thong-bao/thong-bao.service.js');
const xacThucService = require('./modules/xac-thuc/xac-thuc.service.js');
const moiTruong = docMoiTruong();
const pool = databasePool.layPool(moiTruong);
const app = taoUngDung({ kiemTraSanSang: () => readyService.kiemTraSanSang({ pool, moiTruong }) });

const server = app.listen(moiTruong.port, '0.0.0.0', () => {
    console.log(`Backend đang chạy tại cổng ${moiTruong.port}`);
});
thongBaoService.khoiDongScheduler({ chuKyMs: 60000 });
xacThucService.khoiDongDonDepDangKy({ chuKyMs: 60000 });
server.on('error', async (error) => {
    console.error(`Backend không khởi động được: ${error.code ?? error.name}`);
    process.exitCode = 1;
    await databasePool.dongPool();
});

let dangDung = false;

function dungBackend() {
    if (dangDung) return;
    dangDung = true;
    thongBaoService.dungScheduler();
    xacThucService.dungDonDepDangKy();
    server.close(async (error) => {
        if (error) {
            console.error(`Không đóng được HTTP server: ${error.code ?? error.name}`);
            process.exitCode = 1;
        }
        try { await databasePool.dongPool(); }
        catch (loiPool) {
            console.error(`Không đóng được database pool: ${loiPool.name}`);
            process.exitCode = 1;
        }
    });
}

process.once('SIGINT', dungBackend);
process.once('SIGTERM', dungBackend);