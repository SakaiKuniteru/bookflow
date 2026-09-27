const service = require('./ai.service.js');

class AiController {
    async chat(req, res, next) {
        try {
            const data = await service.chat(req.auth, req.body);
            return res.status(200).json({ code: 0, message: 'Thành công', data });
        } catch (error) {
            return next(error);
        }
    }

    async search(req, res, next) {
        try {
            const data = await service.search(req.auth, req.body);
            return res.status(200).json({ code: 0, message: 'Thành công', data });
        } catch (error) {
            return next(error);
        }
    }

    async goiYSach(req, res, next) {
        try {
            const data = await service.goiYSach(req.auth, req.body);
            return res.status(200).json({ code: 0, message: 'Thành công', data });
        } catch (error) {
            return next(error);
        }
    }

    async phanTich(req, res, next) {
        try {
            const data = await service.phanTich(req.auth, req.body);
            return res.status(200).json({ code: 0, message: 'Thành công', data });
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = new AiController();