import nodemailer from 'nodemailer';
import { docCauHinhEmail } from '../config/environment.js';
import { AppError } from '../common/errors/AppError.js';

let transporter;
function cauHinhMail() {
    const cfg = docCauHinhEmail();
    return { host: cfg.host, port: cfg.port, secure: cfg.port === 465, requireTLS: cfg.port !== 465, auth: { user: cfg.user, pass: cfg.password }, tls: { minVersion: 'TLSv1.2' } };
}

export async function guiEmail({ den, tieuDe, noiDung }) {
    transporter ??= nodemailer.createTransport(cauHinhMail());
    try { await transporter.sendMail({ from: docCauHinhEmail().from, to: den, subject: tieuDe, text: noiDung, disableFileAccess: true, disableUrlAccess: true }); }
    catch { throw new AppError({ code: 'EMAIL_UNAVAILABLE', message: 'Không gửi được email, vui lòng thử lại!', status: 503 }); }
}
