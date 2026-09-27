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

const THONG_BAO_THEO_LOAI = {
    DON_HANG_TAO: {
        tieuDe: 'Đơn hàng đã được tạo',
        moTa: 'Đơn hàng của bạn đã được tiếp nhận trên BookFlow.',
        bieuTuong: '🛒',
        mauNen: '#edf5ff',
        mauVien: '#c8dff9',
        mauChu: '#173b65',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '🛒',
            nhan: 'ĐƠN HÀNG',
            duLieu,
            cacTruong: [
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Ngày tạo', dinhDangNgay(duLieu.ngay_tao)],
                ['Số lượng', duLieu.so_luong != null ? `${duLieu.so_luong} sản phẩm` : null],
                ['Tổng tiền', dinhDangTien(duLieu.tong_tien)]
            ]
        })
    },
    DON_HANG_XAC_NHAN: {
        tieuDe: 'Đơn hàng đã được xác nhận',
        moTa: 'Đơn hàng của bạn đã được xác nhận và đang được xử lý.',
        bieuTuong: '✓',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '✓',
            nhan: 'ĐÃ XÁC NHẬN',
            duLieu,
            cacTruong: [
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Ngày xác nhận', dinhDangNgay(duLieu.ngay_xac_nhan)],
                ['Trạng thái', duLieu.trang_thai],
                ['Tổng tiền', dinhDangTien(duLieu.tong_tien)]
            ]
        })
    },
    DON_HANG_HOAN_TAT: {
        tieuDe: 'Đơn hàng đã hoàn tất',
        moTa: 'Đơn hàng của bạn đã được hoàn tất thành công.',
        bieuTuong: '✓',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '✓',
            nhan: 'HOÀN TẤT',
            duLieu,
            cacTruong: [
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Ngày hoàn tất', dinhDangNgay(duLieu.ngay_hoan_tat)],
                ['Tổng tiền', dinhDangTien(duLieu.tong_tien)]
            ]
        })
    },
    DON_HANG_HUY: {
        tieuDe: 'Đơn hàng đã được hủy',
        moTa: 'Đơn hàng của bạn đã được hủy trên BookFlow.',
        bieuTuong: '!',
        mauNen: '#fff7ed',
        mauVien: '#fed7aa',
        mauChu: '#c2410c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '!',
            nhan: 'ĐÃ HỦY',
            duLieu,
            cacTruong: [
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Thời gian hủy', dinhDangNgay(duLieu.thoi_gian_huy)],
                ['Lý do', duLieu.ly_do]
            ]
        })
    },
    MUA_THANH_CONG: {
        tieuDe: 'Mua hàng thành công',
        moTa: 'Giao dịch mua hàng của bạn đã được ghi nhận thành công.',
        bieuTuong: '✓',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '✓',
            nhan: 'GIAO DỊCH THÀNH CÔNG',
            duLieu,
            cacTruong: [
                ['Mã giao dịch', duLieu.ma_giao_dich],
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian)],
                ['Số lượng', duLieu.so_luong != null ? `${duLieu.so_luong} sản phẩm` : null],
                ['Tổng tiền', dinhDangTien(duLieu.tong_tien)]
            ]
        })
    },
    THANH_TOAN_THANH_CONG: {
        tieuDe: 'Thanh toán thành công',
        moTa: 'Khoản thanh toán của bạn đã được ghi nhận thành công.',
        bieuTuong: '✓',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '✓',
            nhan: 'THANH TOÁN THÀNH CÔNG',
            duLieu,
            cacTruong: [
                ['Mã giao dịch', duLieu.ma_giao_dich],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian)],
                ['Phương thức', duLieu.phuong_thuc],
                ['Số tiền', dinhDangTien(duLieu.so_tien)]
            ]
        })
    },
    THANH_TOAN_THAT_BAI: {
        tieuDe: 'Thanh toán chưa thành công',
        moTa: 'BookFlow chưa ghi nhận được khoản thanh toán của bạn.',
        bieuTuong: '!',
        mauNen: '#fff7ed',
        mauVien: '#fed7aa',
        mauChu: '#c2410c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '!',
            nhan: 'THANH TOÁN CHƯA THÀNH CÔNG',
            duLieu,
            cacTruong: [
                ['Mã giao dịch', duLieu.ma_giao_dich],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian)],
                ['Phương thức', duLieu.phuong_thuc],
                ['Số tiền', dinhDangTien(duLieu.so_tien)],
                ['Lý do', duLieu.ly_do]
            ]
        })
    },
    HOAN_TIEN_THANH_CONG: {
        tieuDe: 'Hoàn tiền thành công',
        moTa: 'Khoản tiền hoàn của bạn đã được ghi nhận trên BookFlow.',
        bieuTuong: '↩',
        mauNen: '#edf5ff',
        mauVien: '#c8dff9',
        mauChu: '#173b65',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '↩',
            nhan: 'HOÀN TIỀN',
            duLieu,
            cacTruong: [
                ['Mã giao dịch', duLieu.ma_giao_dich],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian)],
                ['Số tiền hoàn', dinhDangTien(duLieu.so_tien)],
                ['Lý do', duLieu.ly_do]
            ]
        })
    },
    MUON_THANH_CONG: {
        tieuDe: 'Mượn sách thành công',
        moTa: 'Phiếu mượn của bạn đã được ghi nhận thành công.',
        bieuTuong: '📖',
        mauNen: '#edf5ff',
        mauVien: '#c8dff9',
        mauChu: '#173b65',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '📖',
            nhan: 'PHIẾU MƯỢN',
            duLieu,
            cacTruong: [
                ['Mã phiếu', duLieu.ma_phieu],
                ['Ngày mượn', dinhDangNgay(duLieu.ngay_muon)],
                ['Hạn trả', dinhDangNgay(duLieu.han_tra)],
                ['Số lượng', duLieu.so_luong != null ? `${duLieu.so_luong} cuốn` : null]
            ],
            sach: duLieu.ten_sach
        })
    },
    TRA_THANH_CONG: {
        tieuDe: 'Trả sách thành công',
        moTa: 'Sách của bạn đã được ghi nhận trả thành công.',
        bieuTuong: '↩',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '↩',
            nhan: 'ĐÃ TRẢ SÁCH',
            duLieu,
            cacTruong: [
                ['Mã phiếu', duLieu.ma_phieu],
                ['Ngày trả', dinhDangNgay(duLieu.ngay_tra)],
                ['Số lượng', duLieu.so_luong != null ? `${duLieu.so_luong} cuốn` : null],
                ['Phí phát sinh', dinhDangTien(duLieu.phi_phat)]
            ],
            sach: duLieu.ten_sach
        })
    },
    DEN_HAN_TRA: {
        tieuDe: 'Sắp đến hạn trả sách',
        moTa: 'Một hoặc nhiều sách của bạn sắp đến hạn trả.',
        bieuTuong: '⏰',
        mauNen: '#fffbeb',
        mauVien: '#fde68a',
        mauChu: '#a16207',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '⏰',
            nhan: 'SẮP ĐẾN HẠN',
            duLieu,
            cacTruong: [
                ['Mã phiếu', duLieu.ma_phieu],
                ['Hạn trả', dinhDangNgay(duLieu.han_tra)],
                ['Số lượng', duLieu.so_luong != null ? `${duLieu.so_luong} cuốn` : null]
            ],
            sach: duLieu.ten_sach
        })
    },
    QUA_HAN_TRA: {
        tieuDe: 'Sách đã quá hạn',
        moTa: 'Một hoặc nhiều sách của bạn đã quá hạn trả.',
        bieuTuong: '!',
        mauNen: '#fff1f2',
        mauVien: '#fecdd3',
        mauChu: '#be123c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '!',
            nhan: 'ĐÃ QUÁ HẠN',
            duLieu,
            cacTruong: [
                ['Mã phiếu', duLieu.ma_phieu],
                ['Hạn trả', dinhDangNgay(duLieu.han_tra)],
                ['Quá hạn', duLieu.so_ngay_qua_han != null ? `${duLieu.so_ngay_qua_han} ngày` : null],
                ['Phí phạt', dinhDangTien(duLieu.phi_phat)]
            ],
            sach: duLieu.ten_sach
        })
    },
    GIA_HAN_THANH_CONG: {
        tieuDe: 'Gia hạn sách thành công',
        moTa: 'Thời hạn mượn sách của bạn đã được gia hạn.',
        bieuTuong: '↻',
        mauNen: '#edf5ff',
        mauVien: '#c8dff9',
        mauChu: '#173b65',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '↻',
            nhan: 'GIA HẠN THÀNH CÔNG',
            duLieu,
            cacTruong: [
                ['Mã gia hạn', duLieu.ma_gia_han],
                ['Mã phiếu', duLieu.ma_phieu],
                ['Hạn trả cũ', dinhDangNgay(duLieu.han_tra_cu)],
                ['Hạn trả mới', dinhDangNgay(duLieu.han_tra_moi)],
                ['Số ngày gia hạn', duLieu.so_ngay_gia_han != null ? `${duLieu.so_ngay_gia_han} ngày` : null]
            ],
            sach: duLieu.ten_sach
        })
    },
    DAT_TRUOC_TAO: {
        tieuDe: 'Đặt trước sách thành công',
        moTa: 'Yêu cầu đặt trước sách của bạn đã được ghi nhận.',
        bieuTuong: '🔖',
        mauNen: '#edf5ff',
        mauVien: '#c8dff9',
        mauChu: '#173b65',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '🔖',
            nhan: 'ĐẶT TRƯỚC',
            duLieu,
            cacTruong: [
                ['Mã đặt trước', duLieu.ma_dat_truoc],
                ['Ngày đặt', dinhDangNgay(duLieu.ngay_dat)],
                ['Số lượng', duLieu.so_luong != null ? `${duLieu.so_luong} cuốn` : null]
            ],
            sach: duLieu.ten_sach
        })
    },
    DAT_TRUOC_SAN_SANG: {
        tieuDe: 'Sách đặt trước đã sẵn sàng',
        moTa: 'Sách bạn đặt trước hiện đã sẵn sàng để nhận.',
        bieuTuong: '✓',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '✓',
            nhan: 'SÁCH ĐÃ SẴN SÀNG',
            duLieu,
            cacTruong: [
                ['Mã đặt trước', duLieu.ma_dat_truoc],
                ['Ngày sẵn sàng', dinhDangNgay(duLieu.ngay_san_sang)],
                ['Hạn nhận', dinhDangNgay(duLieu.han_nhan)]
            ],
            sach: duLieu.ten_sach
        })
    },
    DAT_TRUOC_HUY: {
        tieuDe: 'Đặt trước đã được hủy',
        moTa: 'Yêu cầu đặt trước sách của bạn đã được hủy.',
        bieuTuong: '×',
        mauNen: '#fff7ed',
        mauVien: '#fed7aa',
        mauChu: '#c2410c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '×',
            nhan: 'ĐẶT TRƯỚC ĐÃ HỦY',
            duLieu,
            cacTruong: [
                ['Mã đặt trước', duLieu.ma_dat_truoc],
                ['Thời gian hủy', dinhDangNgay(duLieu.thoi_gian_huy)],
                ['Lý do', duLieu.ly_do]
            ],
            sach: duLieu.ten_sach
        })
    },
    PHI_PHAT_PHAT_SINH: {
        tieuDe: 'Phát sinh phí phạt',
        moTa: 'Tài khoản của bạn vừa phát sinh một khoản phí cần xử lý.',
        bieuTuong: '!',
        mauNen: '#fff1f2',
        mauVien: '#fecdd3',
        mauChu: '#be123c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '!',
            nhan: 'PHÍ PHẠT',
            duLieu,
            cacTruong: [
                ['Mã phiếu', duLieu.ma_phieu],
                ['Loại phí', duLieu.loai_phi],
                ['Số ngày quá hạn', duLieu.so_ngay_qua_han != null ? `${duLieu.so_ngay_qua_han} ngày` : null],
                ['Số tiền', dinhDangTien(duLieu.so_tien ?? duLieu.phi_phat)],
                ['Lý do', duLieu.ly_do]
            ],
            sach: duLieu.ten_sach
        })
    },
    PHI_PHAT_THANH_TOAN: {
        tieuDe: 'Thanh toán phí phạt thành công',
        moTa: 'Khoản phí phạt của bạn đã được thanh toán thành công.',
        bieuTuong: '✓',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '✓',
            nhan: 'ĐÃ THANH TOÁN PHÍ',
            duLieu,
            cacTruong: [
                ['Mã giao dịch', duLieu.ma_giao_dich],
                ['Mã phiếu', duLieu.ma_phieu],
                ['Số tiền', dinhDangTien(duLieu.so_tien ?? duLieu.phi_phat)],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian)]
            ]
        })
    },
    MAT_SACH: {
        tieuDe: 'Ghi nhận mất sách',
        moTa: 'Hệ thống đã ghi nhận tình trạng mất sách.',
        bieuTuong: '!',
        mauNen: '#fff1f2',
        mauVien: '#fecdd3',
        mauChu: '#be123c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '!',
            nhan: 'MẤT SÁCH',
            duLieu,
            cacTruong: [
                ['Mã phiếu', duLieu.ma_phieu],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian)],
                ['Phí bồi thường', dinhDangTien(duLieu.so_tien ?? duLieu.phi_phat)],
                ['Lý do', duLieu.ly_do]
            ],
            sach: duLieu.ten_sach
        })
    },
    HU_HONG_SACH: {
        tieuDe: 'Ghi nhận hư hỏng sách',
        moTa: 'Hệ thống đã ghi nhận tình trạng hư hỏng của sách.',
        bieuTuong: '!',
        mauNen: '#fff7ed',
        mauVien: '#fed7aa',
        mauChu: '#c2410c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '!',
            nhan: 'HƯ HỎNG SÁCH',
            duLieu,
            cacTruong: [
                ['Mã phiếu', duLieu.ma_phieu],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian)],
                ['Phí bồi thường', dinhDangTien(duLieu.so_tien ?? duLieu.phi_phat)],
                ['Lý do', duLieu.ly_do]
            ],
            sach: duLieu.ten_sach
        })
    },
    GIAO_HANG: {
        tieuDe: 'Đơn hàng đang được giao',
        moTa: 'Đơn hàng của bạn đã được chuyển sang trạng thái giao hàng.',
        bieuTuong: '🚚',
        mauNen: '#edf5ff',
        mauVien: '#c8dff9',
        mauChu: '#173b65',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '🚚',
            nhan: 'ĐANG GIAO HÀNG',
            duLieu,
            cacTruong: [
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Mã vận đơn', duLieu.ma_van_don],
                ['Thời gian giao', dinhDangNgay(duLieu.thoi_gian_giao)]
            ]
        })
    },
    GIAO_HANG_THANH_CONG: {
        tieuDe: 'Giao hàng thành công',
        moTa: 'Đơn hàng của bạn đã được giao thành công.',
        bieuTuong: '✓',
        mauNen: '#ecfdf5',
        mauVien: '#bbf7d0',
        mauChu: '#166534',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '✓',
            nhan: 'GIAO HÀNG THÀNH CÔNG',
            duLieu,
            cacTruong: [
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Mã vận đơn', duLieu.ma_van_don],
                ['Thời gian giao', dinhDangNgay(duLieu.thoi_gian_giao)]
            ]
        })
    },
    GIAO_HANG_THAT_BAI: {
        tieuDe: 'Giao hàng không thành công',
        moTa: 'Đơn hàng chưa được giao thành công.',
        bieuTuong: '!',
        mauNen: '#fff7ed',
        mauVien: '#fed7aa',
        mauChu: '#c2410c',
        taoNoiDung: duLieu => taoNoiDungGiaoDich({
            bieuTuong: '!',
            nhan: 'GIAO HÀNG THẤT BẠI',
            duLieu,
            cacTruong: [
                ['Mã đơn hàng', duLieu.ma_don_hang],
                ['Mã vận đơn', duLieu.ma_van_don],
                ['Thời gian', dinhDangNgay(duLieu.thoi_gian_giao)],
                ['Lý do', duLieu.ly_do]
            ]
        })
    }
};

const BIET_DANH_LOAI_THONG_BAO = {
    MUA: 'MUA_THANH_CONG',
    BAN_HANG: 'MUA_THANH_CONG',
    MUON: 'MUON_THANH_CONG',
    TRA: 'TRA_THANH_CONG',
    DAT: 'DAT_TRUOC_TAO',
    DAT_TRUOC: 'DAT_TRUOC_TAO',
    DAT_SAN_SANG: 'DAT_TRUOC_SAN_SANG',
    DEN_HAN: 'DEN_HAN_TRA',
    QUA_HAN: 'QUA_HAN_TRA',
    GIA_HAN: 'GIA_HAN_THANH_CONG',
    PHI_PHAT: 'PHI_PHAT_PHAT_SINH',
    THANH_TOAN: 'THANH_TOAN_THANH_CONG',
    HOAN_TIEN: 'HOAN_TIEN_THANH_CONG'
};

function dinhDangNgay(value) {
    if (!value) return null;
    const ngay = new Date(value);
    if (Number.isNaN(ngay.getTime())) return String(value);
    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(ngay);
}

function dinhDangTien(value) {
    if (value == null || value === '') return null;
    const soTien = Number(value);
    if (!Number.isFinite(soTien)) return String(value);
    return `${new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    }).format(soTien)} đ`;
}

function taoDongThongTinEmail(nhan, giaTri) {
    return `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e8edf3;color:#64748b;font-size:13px;width:42%;">
                ${escapeHtml(nhan)}
            </td>
            <td align="right" style="padding:10px 0;border-bottom:1px solid #e8edf3;color:#172033;font-size:13px;font-weight:700;word-break:break-word;">
                ${escapeHtml(giaTri)}
            </td>
        </tr>`;
}

function taoNoiDungGiaoDich({
    bieuTuong,
    nhan,
    duLieu = {},
    cacTruong = [],
    sach = null,
    mauNen = '#edf5ff',
    mauVien = '#c8dff9',
    mauChu = '#173b65'
}) {
    const cacDong = cacTruong
        .filter(([, giaTri]) => giaTri != null && String(giaTri).trim() !== '')
        .map(([nhanTruong, giaTri]) => taoDongThongTinEmail(nhanTruong, String(giaTri)))
        .join('');

    const tenSach = sach || duLieu.ten_sach;

    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
            style="background:${mauNen};border:1px solid ${mauVien};border-radius:14px;">
            <tr>
                <td style="padding:22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                            <td width="52" valign="top">
                                <div style="width:42px;height:42px;border-radius:12px;background:#ffffff;border:1px solid ${mauVien};text-align:center;line-height:42px;font-size:20px;">
                                    ${escapeHtml(bieuTuong)}
                                </div>
                            </td>
                            <td valign="middle">
                                <div style="font-size:11px;font-weight:700;letter-spacing:1.1px;color:${mauChu};">
                                    ${escapeHtml(nhan)}
                                </div>
                                ${tenSach ? `
                                    <div style="margin-top:5px;font-size:17px;font-weight:700;color:#172033;">
                                        ${escapeHtml(tenSach)}
                                    </div>
                                ` : ''}
                            </td>
                        </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                        style="margin-top:19px;">
                        ${cacDong}
                    </table>
                </td>
            </tr>
        </table>`;
}

function taoEmailThongBao({
    tenNguoiNhan,
    loaiSuKien,
    tieuDe,
    noiDung,
    duLieu = {},
    linkChiTiet = null
}) {
    const loai = BIET_DANH_LOAI_THONG_BAO[loaiSuKien] || loaiSuKien;
    const mau = THONG_BAO_THEO_LOAI[loai];

    const tieuDeCuoi = String(tieuDe ?? '').trim() || mau?.tieuDe || 'Thông báo BookFlow';
    const moTa = mau?.moTa || 'Bạn có một thông báo mới liên quan đến hoạt động trên BookFlow.';
    const noiDungGiaoDich = mau
        ? mau.taoNoiDung(duLieu)
        : `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:#f8fafc;border:1px solid #e5eaf1;border-radius:14px;">
                <tr>
                    <td style="padding:22px;">
                        <div style="font-size:14px;line-height:1.8;color:#536477;">
                            ${escapeHtml(String(noiDung ?? '').trim() || 'Bạn có một thông báo mới trên BookFlow.').replace(/\n/g, '<br>')}
                        </div>
                    </td>
                </tr>
            </table>`;

    const htmlCta = linkChiTiet ? `
        <div style="margin-top:26px;text-align:center;">
            <a href="${escapeHtml(linkChiTiet)}"
                style="display:inline-block;padding:13px 24px;border-radius:9px;background:#173b65;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Xem chi tiết
            </a>
        </div>` : '';

    const chuThich = 'Đây là email tự động từ BookFlow. Vui lòng không trả lời email này.';

    return {
        tieuDe: `BookFlow | ${tieuDeCuoi}`,
        noiDung: [
            `Xin chào ${tenNguoiNhan?.trim() || 'bạn'},`,
            '',
            moTa,
            '',
            String(noiDung ?? '').trim(),
            '',
            chuThich,
            '',
            'BookFlow'
        ].filter((dong, index, danhSach) => !(dong === '' && danhSach[index - 1] === '')).join('\n'),
        html: khungEmail({
            tenNguoiNhan,
            tieuDe: tieuDeCuoi,
            moTa,
            noiDungHtml: `${noiDungGiaoDich}${htmlCta}`,
            chuThich
        })
    };
}

module.exports = {
    taoEmailOtp,
    taoEmailMoiNhanVien,
    taoEmailThongBao
};