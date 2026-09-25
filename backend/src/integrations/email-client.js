const nodemailer = require('nodemailer');
const { docCauHinhEmail } = require('../config/environment.js');
const { AppError } = require('../common/errors/AppError.js');

class EmailService {
    transporter;

    cauHinhMail() {
        const cfg = docCauHinhEmail();
        return {
            host: cfg.host,
            port: cfg.port,
            secure: cfg.port === 465,
            requireTLS: cfg.port !== 465,
            auth: { user: cfg.user, pass: cfg.password },
            tls: { minVersion: 'TLSv1.2' }
        };
    }

    diaChiNguoiGui(cfg) {
        const diaChiDaDinhDang = /<([^<>]+)>/.exec(cfg.from);
        return { name: cfg.fromName, address: (diaChiDaDinhDang?.[1] ?? cfg.from).trim() };
    }

    async guiEmail({ den, tenNguoiNhan, tieuDe, noiDung, html }) {
        this.transporter ??= nodemailer.createTransport(this.cauHinhMail());
        const cfg = docCauHinhEmail();
        try {
            await this.transporter.sendMail({
                from: this.diaChiNguoiGui(cfg),
                to: { name: tenNguoiNhan?.trim() || '', address: den },
                subject: tieuDe,
                text: noiDung,
                ...(html ? { html } : {}),
                disableFileAccess: true,
                disableUrlAccess: true
            });
        } catch {
            throw new AppError({ code: 'EMAIL_UNAVAILABLE', message: 'Không gửi được email, vui lòng thử lại', status: 503 });
        }
    }
}

module.exports = new EmailService();