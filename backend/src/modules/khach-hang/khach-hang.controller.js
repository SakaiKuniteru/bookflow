const service = require('./khach-hang.service.js');
function snake(value) {
    if (Array.isArray(value)) return value.map(snake);
    if (value === null || typeof value !== 'object' || value instanceof Date) return value;
    return Object.fromEntries(Object.entries(value).map(([key,item]) => [key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),snake(item)]));
}
function xuLy(hanhDong, status = 200) {
    return async (req,res,next) => {
        try {
            const id = req.params.khachHangId;
            const diaChiId = req.params.diaChiId;
            const lienHeId = req.params.lienHeId;
            const args = {
                danhSach: () => service.danhSach(req.auth,snake(req.query)),
                chiTiet: () => service.chiTiet(req.auth,id),
                tao: () => service.tao(req.auth,snake(req.body),req.requestId),
                sua: () => service.sua(req.auth,id,snake(req.body),req.requestId),
                kiemTraTaoMoi: () => service.kiemTraTaoMoi(req.auth,snake(req.body)),
                kiemTraSua: () => service.kiemTraSua(req.auth,id,snake(req.body)),
                resetMatKhau: () => service.resetMatKhau(req.auth,id,req.requestId),
                doiTrangThai: () => service.doiTrangThai(req.auth,id,snake(req.body),req.requestId),
                taoDiaChi: () => service.taoDiaChi(req.auth,id,snake(req.body),req.requestId),
                suaDiaChi: () => service.suaDiaChi(req.auth,id,diaChiId,snake(req.body),req.requestId),
                xoaDiaChi: () => service.xoaDiaChi(req.auth,id,diaChiId,req.requestId),
                taoLienHe: () => service.taoLienHe(req.auth,id,snake(req.body),req.requestId),
                suaLienHe: () => service.suaLienHe(req.auth,id,lienHeId,snake(req.body),req.requestId),
                xoaLienHe: () => service.xoaLienHe(req.auth,id,lienHeId,req.requestId),
                taoTuongTac: () => service.taoTuongTac(req.auth,id,snake(req.body),req.requestId),
                lichSuGiaoDich: () => service.lichSuGiaoDich(req.auth,id)
            };
            return res.status(status).json({ success: true, request_id: req.requestId, data: await args[hanhDong]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };
