const service = require('./don-hang.service.js');
function xuLy(hanhDong,status = 200) {
    return async (req,res,next) => {
        try {
            const actions = {
                danhSach: () => service.danhSach(req.auth,req.query),
                chiTiet: () => service.chiTiet(req.auth,req.params.donHangId),
                tao: () => service.tao(req.auth,req.body),
                doiTrangThai: () => service.doiTrangThai(req.auth,req.params.donHangId,req.body)
            };
            return res.status(status).json({ success: true,request_id: req.requestId,data: await actions[hanhDong]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };