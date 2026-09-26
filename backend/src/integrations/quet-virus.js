const net = require('node:net');
const { AppError } = require('../common/errors/AppError.js');

function quetVirus(buffer) {
    const host = process.env.CLAMAV_HOST;
    const port = Number(process.env.CLAMAV_PORT || 3310);
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new AppError({ code: 'SCANNER_UNAVAILABLE', message: 'Dịch vụ kiểm tra file chưa được cấu hình', status: 503 });
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        let daXong = false;
        let phanHoi = '';
        const ketThuc = (error = null) => {
            if (daXong) return;
            daXong = true;
            socket.destroy();
            if (error) reject(error);
            else resolve(true);
        };
        socket.setTimeout(30000, () => ketThuc(new AppError({ code: 'SCANNER_TIMEOUT', message: 'Kiểm tra file quá thời gian cho phép', status: 503 })));
        socket.once('error', () => ketThuc(new AppError({ code: 'SCANNER_UNAVAILABLE', message: 'Không kết nối được dịch vụ kiểm tra file', status: 503 })));
        socket.once('connect', () => {
            socket.write(Buffer.from('zINSTREAM\0'));
            for (let i = 0; i < buffer.length; i += 65536) {
                const chunk = buffer.subarray(i, i + 65536);
                const length = Buffer.alloc(4);
                length.writeUInt32BE(chunk.length, 0);
                socket.write(length);
                socket.write(chunk);
            }
            socket.write(Buffer.alloc(4));
        });
        socket.on('data', data => {
            phanHoi += data.toString('utf8');
            if (!phanHoi.includes('\0') && !phanHoi.includes('\n')) return;
            if (/\bFOUND\b/.test(phanHoi)) return ketThuc(new AppError({ code: 'FILE_REJECTED', message: 'File không vượt qua kiểm tra an toàn', status: 422 }));
            if (/\bOK\b/.test(phanHoi)) return ketThuc();
            ketThuc(new AppError({ code: 'SCANNER_ERROR', message: 'Không xác minh được độ an toàn của file', status: 503 }));
        });
        socket.once('end', () => {
            if (!daXong) ketThuc(new AppError({ code: 'SCANNER_ERROR', message: 'Dịch vụ kiểm tra file ngắt kết nối', status: 503 }));
        });
    });
}
module.exports = { quetVirus };