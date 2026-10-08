const { docMoiTruong } = require('../src/config/environment.js');
const databasePool = require('../src/database/pool.js');
const thongBaoService = require('../src/modules/thong-bao/thong-bao.service.js');

function thamSo(ten) {
    const prefix = `--${ten}=`;
    return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function main() {
    const email = thamSo('email');
    const ngay = thamSo('date');
    if (!email || !ngay || !/^\d{4}-\d{2}-\d{2}$/.test(ngay)) throw new Error('Cần truyền --email=<địa chỉ nhận> và --date=yyyy-mm-dd để giới hạn email kiểm thử.');
    const pool = databasePool.layPool(docMoiTruong());
    try {
        const lanMot = await thongBaoService.xuLySuKienNhanVien({ ngayHienTai: ngay, emailKiemThu: email });
        const lanHai = await thongBaoService.xuLySuKienNhanVien({ ngayHienTai: ngay, emailKiemThu: email });
        await thongBaoService.xuLyEmailDangCho(20, email, 'NHAN_VIEN_SINH_NHAT');
        const { rows: [ketQua] } = await pool.query(`SELECT COUNT(DISTINCT sk.id)::integer AS so_su_kien, COUNT(DISTINCT tbk.id)::integer AS so_email, MAX(tbk.trang_thai) AS trang_thai_email, COUNT(DISTINCT log.id) FILTER (WHERE log.trang_thai = 'DA_GUI')::integer AS so_lan_gui_thanh_cong FROM thong_bao_su_kien sk JOIN thong_bao tb ON tb.su_kien_id = sk.id JOIN thong_bao_kenh tbk ON tbk.thong_bao_id = tb.id AND tbk.kenh = 'EMAIL' LEFT JOIN thong_bao_kenh_log log ON log.thong_bao_kenh_id = tbk.id WHERE sk.loai_su_kien = 'NHAN_VIEN_SINH_NHAT' AND sk.ma_su_kien LIKE $1 AND lower(tbk.dia_chi) = lower($2)`, [`nhan-vien:sinh-nhat:%:${ngay.slice(0, 4)}`, email]);
        const report = { birthdayEventsFirstRun: lanMot.sinhNhat, birthdayEventsSecondRun: lanHai.sinhNhat, anniversaryEventsFirstRun: lanMot.kyNiem, anniversaryEventsSecondRun: lanHai.kyNiem, eventRows: ketQua.so_su_kien, emailRows: ketQua.so_email, emailStatus: ketQua.trang_thai_email, successfulSendLogs: ketQua.so_lan_gui_thanh_cong };
        console.log(JSON.stringify(report, null, 2));
        if (Number(ketQua.so_su_kien) !== 1 || Number(ketQua.so_email) !== 1 || ketQua.trang_thai_email !== 'DA_GUI' || Number(ketQua.so_lan_gui_thanh_cong) !== 1) throw new Error('Email sinh nhật chưa được gửi đúng một lần hoặc bản ghi chống trùng chưa hợp lệ.');
    } finally {
        await databasePool.dongPool();
    }
}

main().catch(error => { console.error(`Kiểm thử email sinh nhật thất bại: ${error.message}`); process.exitCode = 1; });
