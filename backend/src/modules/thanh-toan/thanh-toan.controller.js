const service = require('./thanh-toan.service.js');
function xuLy(name,status = 200) {
    return async (req,res,next) => {
        try {
            const run = {
                danhSachPhuongThuc: () => service.danhSachPhuongThuc(req.auth,req.query),
                taoPhuongThuc: () => service.taoPhuongThuc(req.auth,req.body,req.requestId),
                suaPhuongThuc: () => service.suaPhuongThuc(req.auth,req.params.id,req.body,req.requestId),
                danhSachTaiKhoan: () => service.danhSachTaiKhoan(req.auth,req.query),
                taoTaiKhoan: () => service.taoTaiKhoan(req.auth,req.body,req.requestId),
                suaTaiKhoan: () => service.suaTaiKhoan(req.auth,req.params.id,req.body,req.requestId),
                danhSachGiaoDich: () => service.danhSachGiaoDich(req.auth,req.query),
                chiTietGiaoDich: () => service.chiTietGiaoDich(req.auth,req.params.id),
                taoGiaoDich: () => service.taoGiaoDich(req.auth,req.body,req.requestId),
                xacNhanGiaoDich: () => service.xacNhanGiaoDich(req.auth,req.params.id,req.body,req.requestId),
                danhSachHoan: () => service.danhSachHoan(req.auth,req.query),
                taoYeuCauHoan: () => service.taoYeuCauHoan(req.auth,req.body,req.requestId),
                duyetHoan: () => service.duyetHoan(req.auth,req.params.id,req.body,req.requestId),
                taoDotDoiSoat: () => service.taoDotDoiSoat(req.auth,req.body,req.requestId),
                danhSachDot: () => service.danhSachDot(req.auth,req.query),
                chiTietDot: () => service.chiTietDot(req.auth,req.params.id),
                xuLyDoiSoat: () => service.xuLyDoiSoat(req.auth,req.params.id,req.body,req.requestId),
                chotDot: () => service.chotDot(req.auth,req.params.id,req.requestId)
            };
            return res.status(status).json({ success: true,request_id: req.requestId,data: await run[name]() });
        } catch (error) { next(error); }
    };
}
async function webhookQR(req,res,next) {
    try { return res.json({ success: true,data: await service.webhookQR(req.params.nhaCungCap,req.headers,req.rawBody) }); }
    catch (error) { next(error); }
}
module.exports = { xuLy,webhookQR };