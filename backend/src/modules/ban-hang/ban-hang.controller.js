const service = require('./ban-hang.service.js');
function xuLy(hanhDong,status = 200) {
    return async (req,res,next) => {
        try {
            const actions = {
                danhSachCa: () => service.danhSachCa(req.auth,req.query),
                chiTietCa: () => service.chiTietCa(req.auth,req.params.caId),
                moCa: () => service.moCa(req.auth,req.body),
                dongCa: () => service.dongCa(req.auth,req.params.caId,req.body),
                duyetCa: () => service.duyetCa(req.auth,req.params.caId),
                danhSachPhien: () => service.danhSachPhien(req.auth,req.query),
                chiTietPhien: () => service.chiTietPhien(req.auth,req.params.phienId),
                taoPhien: () => service.taoPhien(req.auth,req.body),
                huyPhien: () => service.huyPhien(req.auth,req.params.phienId),
                chotPhien: () => service.chotPhien(req.auth,req.params.phienId,req.body),
                thuTienMat: () => service.thuTienMat(req.auth,req.body)
            };
            return res.status(status).json({ success: true,request_id: req.requestId,data: await actions[hanhDong]() });
        } catch (error) { next(error); }
    };
}
module.exports = { xuLy };