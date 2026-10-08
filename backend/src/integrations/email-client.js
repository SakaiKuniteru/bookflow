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

    diaChiNguoiGui(cfg, tenNguoiGui = null) {
        const diaChiDaDinhDang = /<([^<>]+)>/.exec(cfg.from);
        return { name: String(tenNguoiGui || cfg.fromName).trim(), address: (diaChiDaDinhDang?.[1] ?? cfg.from).trim() };
    }

    async guiEmail({ den, tenNguoiNhan, tieuDe, noiDung, html, tenNguoiGui }) {
        this.transporter ??= nodemailer.createTransport(this.cauHinhMail());
        const cfg = docCauHinhEmail();
        try {
            const ketQua = await this.transporter.sendMail({
                from: this.diaChiNguoiGui(cfg, tenNguoiGui),
                to: { name: tenNguoiNhan?.trim() || '', address: den },
                subject: tieuDe,
                text: noiDung,
                ...(html ? { html } : {}),
                disableFileAccess: true,
                disableUrlAccess: true
            });
            const daChapNhan = (ketQua.accepted || []).some(diaChi => String(diaChi).toLowerCase() === den.toLowerCase());
            if (!daChapNhan) {
                const loi = new Error('SMTP_REJECTED_RECIPIENT');
                loi.code = 'SMTP_REJECTED_RECIPIENT';
                throw loi;
            }
            console.info(JSON.stringify({
                event: 'EMAIL_SMTP_ACCEPTED',
                accepted: ketQua.accepted?.length ?? 0,
                rejected: ketQua.rejected?.length ?? 0
            }));
        } catch (error) {
            console.error(JSON.stringify({
                event: 'EMAIL_SMTP_ERROR',
                code: error?.code ?? null,
                response_code: error?.responseCode ?? null,
                command: error?.command ?? null,
                name: error?.name ?? null
            }));
            throw new AppError({ code: 'EMAIL_UNAVAILABLE', message: 'Không gửi được email, vui lòng thử lại', status: 503 });
        }
    }
}

module.exports = new EmailService();
