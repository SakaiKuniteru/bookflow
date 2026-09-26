const { createHash, randomUUID } = require('node:crypto');
const sharp = require('sharp');
const { AppError } = require('../../common/errors/AppError.js');
const { query } = require('../../database/query.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const storage = require('../../integrations/storage-client.js');
const { quetVirus } = require('../../integrations/quet-virus.js');
const v = require('./tep-tin.validation.js');
const repo = require('./tep-tin.repository.js');

function loi(message, status = 403, code = 'FORBIDDEN') {
    return new AppError({ code, message, status });
}
function tepCongKhai(row) {
    const { don_vi_so_huu_id, tai_khoan_so_huu_id, nguoi_tai_len_id, duong_dan_luu_tru, bucket, ...anToan } = row;
    return { ...anToan, don_vi_so_huu_id, tai_khoan_so_huu_id, nguoi_tai_len_id };
}
async function kiemTraQuyenUpload(auth, phamVi, loaiTep) {
    if (phamVi === 'CA_NHAN') return;
    if (!auth.donViId) throw loi('Phải chọn đơn vị trước khi upload', 403, 'TENANT_REQUIRED');
    const { rows: [tv] } = await query(`SELECT id FROM thanh_vien_don_vi WHERE don_vi_id = $1 AND tai_khoan_id = $2 AND trang_thai = 'DANG_LAM'`, [auth.donViId, auth.taiKhoanId]);
    if (!tv) throw loi('Không có quyền upload vào đơn vị');
    const chiNhanhId = auth.chiNhanhId || null;
    const coQuyen = async ma => await phanQuyenService.kiemTraQuyen(auth, ma) || (chiNhanhId && await phanQuyenService.kiemTraQuyen(auth, ma, { phamVi: 'CHI_NHANH', chiNhanhId }));
    const duocPhep = loaiTep === 'LOGO' ? await phanQuyenService.kiemTraQuyen(auth, 'units.manage') : loaiTep === 'ANH_BIA' ? await coQuyen('books.create') || await coQuyen('files.upload') : await coQuyen('files.upload');
    if (!duocPhep) throw loi('Không có quyền upload loại file này');
}
async function xuLyNoiDung(file, loaiTep) {
    const { fileTypeFromBuffer } = await import('file-type');
    const loaiThuc = await fileTypeFromBuffer(file.buffer);
    if (!loaiThuc || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(loaiThuc.mime)) throw v.loi('Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc PDF');
    if (loaiThuc.mime === 'application/pdf') {
        if (!['CHUNG_TU', 'MINH_CHUNG', 'KHAC'].includes(loaiTep)) throw v.loi('Loại file này chỉ chấp nhận hình ảnh');
        return { buffer: file.buffer, mimeType: 'application/pdf', duoiTep: 'pdf', width: null, height: null };
    }
    const anh = sharp(file.buffer, { limitInputPixels: 40000000, failOn: 'error' });
    const metadata = await anh.metadata();
    if (!metadata.width || !metadata.height || metadata.pages > 1) throw v.loi('Ảnh không hợp lệ hoặc không hỗ trợ ảnh động');
    const buffer = await anh.rotate().webp({ quality: 85, effort: 4 }).toBuffer();
    const ketQua = await sharp(buffer).metadata();
    return { buffer, mimeType: 'image/webp', duoiTep: 'webp', width: ketQua.width, height: ketQua.height };
}
class TepTinService {
    async uploadNhieu(auth, body, files) {
        const { phamVi, loaiTep } = v.duLieuUploadHopLe(body, files);
        await kiemTraQuyenUpload(auth, phamVi, loaiTep);
        const donViId = phamVi === 'DON_VI' ? auth.donViId : null;
        const tongByte = files.reduce((tong, file) => tong + file.size, 0);
        const lo = await repo.taoLo({ donViId, taiKhoanId: auth.taiKhoanId, soFile: files.length, tongByte, maLo: randomUUID() });
        const ketQua = [];
        for (const [index, file] of files.entries()) {
            let object = null;
            try {
                await quetVirus(file.buffer);
                const noiDung = await xuLyNoiDung(file, loaiTep);
                const maTep = randomUUID();
                const tenGoc = file.originalname.replace(/[/\\\x00-\x1f\x7f]/g, '_').slice(0, 300);
                const key = `${phamVi === 'DON_VI' ? `don-vi/${donViId}` : `tai-khoan/${auth.taiKhoanId}`}/${maTep}.${noiDung.duoiTep}`;
                object = await storage.taiLen(key, noiDung.buffer, noiDung.mimeType);
                const fileMoi = await trongGiaoDich(async client => {
                    const tep = await repo.taoFile({ donViId, taiKhoanId: auth.taiKhoanId, maTep, tenGoc, tenLuu: `${maTep}.${noiDung.duoiTep}`, key: object.key, bucket: object.bucket, mimeKhaiBao: file.mimetype, mimeXacMinh: noiDung.mimeType, duoiTep: noiDung.duoiTep, kichThuoc: noiDung.buffer.length, checksum: createHash('sha256').update(noiDung.buffer).digest('hex'), loaiTep, phamViTruyCap: phamVi === 'DON_VI' ? 'NOI_BO_DON_VI' : 'RIENG_TU', width: noiDung.width, height: noiDung.height }, client);
                    await repo.ghiKetQua(lo.id, donViId, auth.taiKhoanId, index, tenGoc, 'THANH_CONG', tep.id, null, null, client);
                    return tep;
                });
                ketQua.push({ thu_tu: index, thanh_cong: true, tep: fileMoi });
            } catch (error) {
                if (object) {
                    try { await storage.xoa(object.key, object.bucket); }
                    catch { console.error(JSON.stringify({ event: 'storage_cleanup_failed', lo_id: lo.id, thu_tu: index })); }
                }
                const maLoi = error instanceof AppError ? error.code : 'UPLOAD_FAILED';
                const thongBao = error instanceof AppError ? error.message : 'Không xử lý được file này';
                await repo.ghiKetQua(lo.id, donViId, auth.taiKhoanId, index, file.originalname.replace(/[/\\\x00-\x1f\x7f]/g, '_').slice(0, 300), 'THAT_BAI', null, maLoi, thongBao);
                ketQua.push({ thu_tu: index, thanh_cong: false, ten_tep_goc: file.originalname, loi: { code: maLoi, message: thongBao } });
            }
        }
        const loHoanTat = await repo.chotLo(lo.id, auth.taiKhoanId);
        return { lo_tai_tep: loHoanTat, ket_qua: ketQua };
    }
    async kiemTraQuyenDoc(auth, tep) {
        if (tep.don_vi_so_huu_id === null) {
            if (tep.tai_khoan_so_huu_id !== auth.taiKhoanId) throw loi('Không có quyền truy cập file');
            return;
        }
        if (tep.don_vi_so_huu_id !== auth.donViId) throw loi('Không có quyền truy cập file');
        const { rowCount } = await query(`SELECT id FROM thanh_vien_don_vi WHERE don_vi_id = $1 AND tai_khoan_id = $2 AND trang_thai = 'DANG_LAM'`, [auth.donViId, auth.taiKhoanId]);
        if (!rowCount) throw loi('Không có quyền truy cập đơn vị');
        if (tep.nguoi_tai_len_id !== auth.taiKhoanId && !await phanQuyenService.kiemTraQuyen(auth, 'files.read')) throw loi('Không có quyền xem file');
    }
    async chiTiet(auth, tepId) {
        const tep = await repo.layFile(v.idHopLe(tepId));
        if (!tep || tep.trang_thai === 'DA_XOA') throw loi('Không tìm thấy file', 404, 'NOT_FOUND');
        await this.kiemTraQuyenDoc(auth, tep);
        return tepCongKhai(tep);
    }
    async danhSach(auth, queryString = {}) {
        const trang = queryString.trang === undefined ? 1 : v.idHopLe(queryString.trang);
        const kichThuoc = queryString.kich_thuoc === undefined ? 20 : v.idHopLe(queryString.kich_thuoc);
        if (kichThuoc > 100) throw v.loi('Mỗi trang tối đa 100 file');
        const xemTatCa = auth.donViId ? await phanQuyenService.kiemTraQuyen(auth, 'files.read') : false;
        return repo.danhSach(auth.donViId, auth.taiKhoanId, xemTatCa, trang, kichThuoc);
    }
    async urlDoc(auth, tepId) {
        const tep = await repo.layFile(v.idHopLe(tepId));
        if (!tep || tep.trang_thai === 'DA_XOA') throw loi('Không tìm thấy file', 404, 'NOT_FOUND');
        await this.kiemTraQuyenDoc(auth, tep);
        if (tep.trang_thai !== 'SAN_SANG' || tep.trang_thai_quet_virus !== 'SACH') throw loi('File chưa sẵn sàng để truy cập', 409, 'FILE_NOT_READY');
        return { id: tep.id, url: await storage.taoUrlDoc(tep.duong_dan_luu_tru, tep.bucket, tep.mime_type_xac_minh, tep.id, tep.duoi_tep, 60), expires_in: 60 };
    }
    async xoa(auth, tepId) {
        const tep = await repo.layFile(v.idHopLe(tepId));
        if (!tep || tep.trang_thai === 'DA_XOA') throw loi('Không tìm thấy file', 404, 'NOT_FOUND');
        await this.kiemTraQuyenDoc(auth, tep);
        if (tep.don_vi_so_huu_id !== null && !await phanQuyenService.kiemTraQuyen(auth, 'files.delete')) throw loi('Không có quyền xóa file của đơn vị');
        if (await repo.dangDuocSuDung(tep.id)) throw loi('File đang được sử dụng; hãy gỡ liên kết tại phân hệ nghiệp vụ trước', 409, 'FILE_IN_USE');
        const daDanhDau = await repo.danhDauXoa(tep.id, auth.taiKhoanId);
        let daXoaStorage = false;
        try { await storage.xoa(daDanhDau.duong_dan_luu_tru, daDanhDau.bucket); daXoaStorage = true; }
        catch { console.error(JSON.stringify({ event: 'storage_cleanup_pending', tep_id: tep.id })); }
        return { id: tep.id, da_xoa: true, da_xoa_storage: daXoaStorage };
    }
}
module.exports = new TepTinService();