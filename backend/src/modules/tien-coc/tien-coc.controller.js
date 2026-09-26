const service = require('./tien-coc.service.js');
function xuLy(name,status = 200) {
    return async (req,res,next) => {
        try {
            const run = {
                danhSach: () => service.danhSach(req.auth,req.query),
                chiTiet: () => service.chiTiet(req.auth,req.params.id),
                tao: () => service.tao(req.auth,req.body,req.requestId),
                thu: () => service.thu(req.auth,req.params.id,req.body,req.requestId),
                giu: () => service.giu(req.auth,req.params.id,req.body,req.requestId),
                giaiToa: () => service.giaiToa(req.auth,req.params.id,req.body,req.requestId),
                khauTru: () => service.khauTru(req.auth,req.params.id,req.body,req.requestId),
                yeuCauHoan: () => service.yeuCauHoan(req.auth,req.params.id,req.body,req.requestId),
                huy: () => service.huy(req.auth,req.params.id,req.body,req.requestId)
            };
            return res.status(status).json({ success: true,request_id: req.requestId,data: await run[name]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };