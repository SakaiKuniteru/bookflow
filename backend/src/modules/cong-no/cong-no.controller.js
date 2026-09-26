const service = require('./cong-no.service.js');
function xuLy(name,status = 200) {
    return async (req,res,next) => {
        try {
            const run = {
                danhSach: () => service.danhSach(req.auth,req.query),
                chiTiet: () => service.chiTiet(req.auth,req.params.id),
                tao: () => service.tao(req.auth,req.body,req.requestId),
                dieuChinh: () => service.dieuChinh(req.auth,req.params.id,req.body,req.requestId),
                thanhToan: () => service.thanhToan(req.auth,req.params.id,req.body,req.requestId),
                capNhatQuaHan: () => service.capNhatQuaHan(req.auth,req.requestId)
            };
            return res.status(status).json({ success: true,request_id: req.requestId,data: await run[name]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };