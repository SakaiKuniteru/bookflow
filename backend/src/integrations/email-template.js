const MUC_DICH_OTP = {
    DANG_KY: {
        tieuDe: 'Xác minh tài khoản BookFlow',
        moTa: 'Sử dụng mã dưới đây để xác minh địa chỉ email và hoàn tất đăng ký.'
    },
    KICH_HOAT_NHAN_VIEN: {
        tieuDe: 'Kích hoạt tài khoản nhân viên',
        moTa: 'Sử dụng mã dưới đây để xác minh tài khoản nhân viên của bạn.'
    },
    DAT_LAI_MAT_KHAU: {
        tieuDe: 'Đặt lại mật khẩu BookFlow',
        moTa: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.'
    },
    DOI_MAT_KHAU: {
        tieuDe: 'Xác nhận đổi mật khẩu',
        moTa: 'Sử dụng mã dưới đây để xác nhận yêu cầu đổi mật khẩu.'
    },
    DOI_EMAIL: {
        tieuDe: 'Xác nhận thay đổi email',
        moTa: 'Sử dụng mã dưới đây để xác nhận địa chỉ email mới.'
    },
    XAC_MINH_SDT: {
        tieuDe: 'Xác minh tài khoản BookFlow',
        moTa: 'Sử dụng mã dưới đây để xác minh yêu cầu của bạn.'
    }
};

function escapeHtml(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        kyTu => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[kyTu]
    );
}

function khungEmail({
    tenNguoiNhan,
    tieuDe,
    moTa,
    noiDungHtml,
    chuThich
}) {
    const ten = escapeHtml(tenNguoiNhan?.trim() || 'bạn');

    return `<!doctype html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(tieuDe)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
        style="background:#f3f6fb;padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560"
                    style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e5eaf1;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="padding:26px 32px;background:#173b65;color:#ffffff;">
                            <div style="font-size:24px;font-weight:700;letter-spacing:.3px;">BookFlow</div>
                            <div style="margin-top:7px;font-size:13px;color:#dce9f7;">
                                Nền tảng quản lý sách và thư viện
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h1 style="margin:0 0 18px;font-size:23px;line-height:1.35;color:#172033;">
                                ${escapeHtml(tieuDe)}
                            </h1>

                            <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">
                                Xin chào <strong>${ten}</strong>,
                            </p>

                            <p style="margin:0 0 24px;color:#536477;font-size:14px;line-height:1.7;">
                                ${escapeHtml(moTa)}
                            </p>

                            ${noiDungHtml}

                            <p style="margin:25px 0 0;color:#64748b;font-size:13px;line-height:1.7;">
                                ${escapeHtml(chuThich)}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:19px 32px;background:#f8fafc;border-top:1px solid #e5eaf1;">
                            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                                Đây là email tự động từ BookFlow. Vui lòng không trả lời email này.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function taoEmailOtp({
    tenNguoiNhan,
    otp,
    mucDich
}) {
    const noiDung = MUC_DICH_OTP[mucDich];

    if (!noiDung || !/^\d{6}$/.test(String(otp))) {
        throw new Error('Thông tin tạo email OTP không hợp lệ');
    }

    const chuThich = 'Mã có hiệu lực trong 10 phút và chỉ sử dụng một lần. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Không chia sẻ mã cho bất kỳ ai.';

    const noiDungHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
                <td align="center"
                    style="padding:24px 12px;background:#edf5ff;border:1px solid #c8dff9;border-radius:12px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#41658c;">
                        MÃ XÁC MINH
                    </div>

                    <div style="margin-top:12px;font-size:34px;font-weight:700;letter-spacing:8px;line-height:1.4;color:#173b65;">
                        ${escapeHtml(otp)}
                    </div>

                    <div style="margin-top:9px;font-size:13px;color:#536477;">
                        Có hiệu lực trong 10 phút
                    </div>
                </td>
            </tr>
        </table>`;

    return {
        tieuDe: `BookFlow | ${noiDung.tieuDe}`,
        noiDung: [
            `Xin chào ${tenNguoiNhan?.trim() || 'bạn'},`,
            '',
            noiDung.moTa,
            '',
            `Mã xác minh: ${otp}`,
            '',
            chuThich,
            '',
            'BookFlow'
        ].join('\n'),
        html: khungEmail({
            tenNguoiNhan,
            tieuDe: noiDung.tieuDe,
            moTa: noiDung.moTa,
            noiDungHtml,
            chuThich
        })
    };
}

function taoEmailMoiNhanVien({
    tenNguoiNhan,
    tenDangNhap,
    matKhauTam,
    linkDangNhap,
    guiLai = false
}) {
    const tieuDe = guiLai
        ? 'Thông tin đăng nhập nhân viên mới'
        : 'Lời mời tham gia BookFlow';

    const moTa = guiLai
        ? 'Thông tin đăng nhập tạm thời của bạn đã được cấp lại.'
        : 'Bạn đã được mời tham gia BookFlow với tài khoản nhân viên.';

    const chuThich = 'Mật khẩu tạm có hiệu lực trong 24 giờ. Khi đăng nhập, bạn cần xác minh OTP và đặt mật khẩu mới. Không chia sẻ thông tin đăng nhập.';

    const noiDungHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
            style="background:#edf5ff;border:1px solid #c8dff9;border-radius:12px;">
            <tr>
                <td style="padding:22px;">
                    <div style="color:#536477;font-size:12px;">Tên đăng nhập</div>
                    <div style="margin:7px 0 18px;font-size:17px;font-weight:700;color:#173b65;word-break:break-word;">
                        ${escapeHtml(tenDangNhap)}
                    </div>

                    <div style="color:#536477;font-size:12px;">Mật khẩu tạm</div>
                    <div style="margin:7px 0;font-size:17px;font-weight:700;color:#173b65;word-break:break-all;">
                        ${escapeHtml(matKhauTam)}
                    </div>
                </td>
            </tr>
        </table>

        <div style="margin-top:26px;text-align:center;">
            <a href="${escapeHtml(linkDangNhap)}"
                style="display:inline-block;padding:13px 24px;border-radius:9px;background:#173b65;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Đăng nhập BookFlow
            </a>
        </div>`;

    return {
        tieuDe: `BookFlow | ${tieuDe}`,
        noiDung: [
            `Xin chào ${tenNguoiNhan?.trim() || 'bạn'},`,
            '',
            moTa,
            '',
            `Tên đăng nhập: ${tenDangNhap}`,
            `Mật khẩu tạm: ${matKhauTam}`,
            `Đường dẫn đăng nhập: ${linkDangNhap}`,
            '',
            chuThich,
            '',
            'BookFlow'
        ].join('\n'),
        html: khungEmail({
            tenNguoiNhan,
            tieuDe,
            moTa,
            noiDungHtml,
            chuThich
        })
    };
}

module.exports = { taoEmailOtp, taoEmailMoiNhanVien };