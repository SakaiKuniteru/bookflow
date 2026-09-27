const { AppError } = require('../../common/errors/AppError.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const emailClient = require('../../integrations/email-client.js');
const emailTemplate = require('../../integrations/email-template.js');
const repo = require('./thong-bao.repository.js');
const v = require('./thong-bao.validation.js');

const PHUT_MOI_NGAY = 24 * 60;
const MAX_EMAIL_RETRY = 8;

function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}

function taoMaSuKienTuDong(loaiSuKien, doiTuongId, suffix = '') {
    const doiTuong = doiTuongId == null ? '0' : String(doiTuongId);
    return `${loaiSuKien}:${doiTuong}${suffix ? `:${suffix}` : ''}`;
}

function ngayTiepTheo(ngayHienTai, lapLaiPhut) {
    return new Date(new Date(ngayHienTai).getTime() + Number(lapLaiPhut) * 60 * 1000);
}

class ThongBaoService {
    async xacDinhNguoiNhan({ taiKhoanId, email, soDienThoai }, client) {
        const ketQua = new Map();
        if (taiKhoanId) {
            const taiKhoan = await repo.layTaiKhoan(taiKhoanId, client);
            if (taiKhoan) ketQua.set(taiKhoan.id, taiKhoan);
        }
        const danhSachTheoLienHe = await repo.timTaiKhoanTheoLienHe({ email, soDienThoai }, client);
        for (const taiKhoan of danhSachTheoLienHe) ketQua.set(taiKhoan.id, taiKhoan);
        return [...ketQua.values()];
    }

    async taoSuKien({ donViId, duLieu, client }) {
        if (!donViId) throw loi('Thiếu đơn vị', 403, 'TENANT_REQUIRED');
        const duLieuHopLe = v.duLieuTaoSuKienHopLe(duLieu);
        const nguoiNhan = await this.xacDinhNguoiNhan({ taiKhoanId: duLieuHopLe.taiKhoanId, email: duLieuHopLe.email, soDienThoai: duLieuHopLe.soDienThoai }, client);
        const suKien = await repo.taoSuKien({ donViId, maSuKien: duLieuHopLe.maSuKien, loaiSuKien: duLieuHopLe.loaiSuKien, doiTuongLoai: duLieuHopLe.doiTuongLoai, doiTuongId: duLieuHopLe.doiTuongId, tieuDe: duLieuHopLe.tieuDe, noiDung: duLieuHopLe.noiDung, duLieu: duLieuHopLe.duLieuSuKien }, client);
        const ketQua = [];
        for (const taiKhoan of nguoiNhan) {
            const thongBao = await repo.taoThongBao({ donViId, suKienId: suKien.id, taiKhoanId: taiKhoan.id, tieuDe: duLieuHopLe.tieuDe, noiDung: duLieuHopLe.noiDung, duLieu: duLieuHopLe.duLieuSuKien }, client);
            await repo.taoKenh({ thongBaoId: thongBao.id, kenh: 'IN_APP', diaChi: null }, client);
            if (taiKhoan.email) await repo.taoKenh({ thongBaoId: thongBao.id, kenh: 'EMAIL', diaChi: taiKhoan.email }, client);
            ketQua.push({ tai_khoan_id: taiKhoan.id, thong_bao_id: thongBao.id, email: taiKhoan.email ?? null });
        }
        return { su_kien: suKien, nguoi_nhan: ketQua };
    }

    async taoSuKienGiaoDich({ donViId, maSuKien, loaiSuKien, doiTuongLoai, doiTuongId, tieuDe, noiDung, duLieu = {}, taiKhoanId = null, email = null, soDienThoai = null, client }) {
        return this.taoSuKien({ donViId, duLieu: { ma_su_kien: maSuKien, loai_su_kien: loaiSuKien, doi_tuong_loai: doiTuongLoai, doi_tuong_id: doiTuongId, tieu_de: tieuDe, noi_dung: noiDung, du_lieu: duLieu, tai_khoan_id: taiKhoanId, email, so_dien_thoai: soDienThoai }, client });
    }

    async taoLich({ donViId, duLieu, client }) {
        if (!donViId) throw loi('Thiếu đơn vị', 403, 'TENANT_REQUIRED');
        const duLieuHopLe = v.duLieuTaoLichHopLe(duLieu);
        return repo.taoLich({ donViId, maLich: duLieuHopLe.maLich, taiKhoanId: duLieuHopLe.taiKhoanId, loaiLich: duLieuHopLe.loaiLich, doiTuongLoai: duLieuHopLe.doiTuongLoai, doiTuongId: duLieuHopLe.doiTuongId, tieuDe: duLieuHopLe.tieuDe, noiDung: duLieuHopLe.noiDung, duLieu: duLieuHopLe.duLieuLich, thoiDiemGuiTiep: duLieuHopLe.thoiDiemGuiTiep, lapLaiPhut: duLieuHopLe.lapLaiPhut, thoiDiemKetThuc: duLieuHopLe.thoiDiemKetThuc }, client);
    }

    async taoLichNhacDenHan({ donViId, taiKhoanId, doiTuongLoai, doiTuongId, thoiDiemGui, tieuDe, noiDung, duLieu = {}, maLich }) {
        return trongGiaoDich(client => this.taoLich({ donViId, duLieu: { ma_lich: maLich, tai_khoan_id: taiKhoanId, loai_lich: 'DEN_HAN_TRA', doi_tuong_loai: doiTuongLoai, doi_tuong_id: doiTuongId, tieu_de: tieuDe, noi_dung: noiDung, thoi_diem_gui_tiep: thoiDiemGui, lap_lai_phut: null, thoi_diem_ket_thuc: null, du_lieu_lich: duLieu }, client }));
    }

    async taoLichNhacQuaHanHangNgay({ donViId, taiKhoanId, doiTuongLoai, doiTuongId, thoiDiemGui, tieuDe, noiDung, duLieu = {}, maLich }) {
        return trongGiaoDich(client => this.taoLich({ donViId, duLieu: { ma_lich: maLich, tai_khoan_id: taiKhoanId, loai_lich: 'QUA_HAN_TRA', doi_tuong_loai: doiTuongLoai, doi_tuong_id: doiTuongId, tieu_de: tieuDe, noi_dung: noiDung, thoi_diem_gui_tiep: thoiDiemGui, lap_lai_phut: PHUT_MOI_NGAY, thoi_diem_ket_thuc: null, du_lieu_lich: duLieu }, client }));
    }

    async huyLich({ donViId, maLich, client }) {
        if (!donViId) throw loi('Thiếu đơn vị', 403, 'TENANT_REQUIRED');
        const ma = String(maLich ?? '').trim();
        if (!ma) throw loi('Mã lịch không hợp lệ');
        return repo.huyLich({ donViId, maLich: ma }, client);
    }

    async danhSach(auth, queryString) {
        const boLoc = v.danhSachHopLe(queryString);
        const ketQua = await repo.layDanhSach(auth, boLoc);
        return { items: ketQua.items, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kichThuoc, tong: Number(ketQua.tong), tong_trang: Math.ceil(Number(ketQua.tong) / boLoc.kichThuoc) } };
    }

    async chiTiet(auth, thongBaoId) {
        const id = v.idThongBaoHopLe(thongBaoId);
        const thongBao = await repo.layChiTiet(auth, id);
        if (!thongBao) throw loi('Không tìm thấy thông báo', 404, 'NOT_FOUND');
        return thongBao;
    }

    async danhDauDaDoc(auth, thongBaoId) {
        const id = v.idThongBaoHopLe(thongBaoId);
        const ketQua = await trongGiaoDich(client => repo.danhDauDaDoc(auth, id, client));
        if (!ketQua) throw loi('Không tìm thấy thông báo', 404, 'NOT_FOUND');
        return ketQua;
    }

    async danhDauTatCaDaDoc(auth) {
        const soLuong = await trongGiaoDich(client => repo.danhDauTatCaDaDoc(auth, client));
        return { so_luong_da_doc: soLuong };
    }

    async xuLyLichDenHan(limit = 50) {
        let tong = 0;
        await trongGiaoDich(async client => {
            const danhSach = await repo.layLichDenHan(limit, client);
            for (const lich of danhSach) {
                const thoiDiem = new Date(lich.thoi_diem_gui_tiep);
                const maSuKien = taoMaSuKienTuDong(lich.loai_lich, lich.doi_tuong_id, thoiDiem.toISOString().slice(0, 10));
                await this.taoSuKienGiaoDich({ donViId: lich.don_vi_id, maSuKien, loaiSuKien: lich.loai_lich, doiTuongLoai: lich.doi_tuong_loai, doiTuongId: lich.doi_tuong_id, tieuDe: lich.tieu_de, noiDung: lich.noi_dung, duLieu: { ...lich.du_lieu, ma_lich: lich.ma_lich, thoi_diem_nhac: lich.thoi_diem_gui_tiep }, taiKhoanId: lich.tai_khoan_id, client });
                let trangThai = 'DA_KET_THUC';
                let thoiDiemGuiTiep = lich.thoi_diem_gui_tiep;
                if (lich.lap_lai_phut) {
                    thoiDiemGuiTiep = ngayTiepTheo(new Date(), lich.lap_lai_phut);
                    if (lich.thoi_diem_ket_thuc && thoiDiemGuiTiep > new Date(lich.thoi_diem_ket_thuc)) trangThai = 'DA_KET_THUC';
                    else trangThai = 'HOAT_DONG';
                }
                await repo.capNhatLichSauKhiGui(lich.id, { trangThai, thoiDiemGuiTiep }, client);
                tong += 1;
            }
        });
        return tong;
    }

    async xuLyEmailDangCho(limit = 50) {
        const danhSach = await trongGiaoDich(async client => {
            const rows = await repo.layEmailChoGui(limit, client);
            for (const row of rows) await repo.danhDauEmailDangGui(row.id, row.so_lan_thu + 1, client);
            return rows.map(row => ({ ...row, lan_thu: row.so_lan_thu + 1 }));
        });
        let tong = 0;
        for (const row of danhSach) {
            try {
                const email = emailTemplate.taoEmailThongBao({
                    tenNguoiNhan: row.ho_ten,
                    loaiSuKien: row.loai_su_kien,
                    tieuDe: row.tieu_de,
                    noiDung: row.noi_dung,
                    duLieu: row.du_lieu ?? {},
                    linkChiTiet: row.link_chi_tiet ?? null
                });
                await emailClient.guiEmail({
                    den: row.dia_chi,
                    tenNguoiNhan: row.ho_ten,
                    tieuDe: email.tieuDe,
                    noiDung: email.noiDung,
                    html: email.html
                });
                await trongGiaoDich(async client => {
                    await repo.danhDauEmailThanhCong(row.id, client);
                    await repo.taoKenhLog({
                        thongBaoKenhId: row.id,
                        lanThu: row.lan_thu,
                        trangThai: 'DA_GUI',
                        loi: null
                    }, client);
                });
                tong += 1;
            } catch (error) {
                const soLan = row.lan_thu;
                const phutCho = Math.min(2 ** Math.min(soLan, 6), 60);
                const ngayGuiTiep = new Date(Date.now() + phutCho * 60 * 1000);
                const loiEmail = String(error?.message ?? 'Không gửi được email').slice(0, 2000);
                await trongGiaoDich(async client => {
                    await repo.danhDauEmailThatBai(row.id, soLan, loiEmail, ngayGuiTiep, client);
                    await repo.taoKenhLog({
                        thongBaoKenhId: row.id,
                        lanThu: soLan,
                        trangThai: 'THAT_BAI',
                        loi: loiEmail
                    }, client);
                });
            }
        }
        return tong;
    }

    async chayScheduler() {
        try {
            const lich = await this.xuLyLichDenHan(50);
            const email = await this.xuLyEmailDangCho(50);
            return { lich, email };
        } catch (error) {
            console.error(JSON.stringify({ event: 'THONG_BAO_SCHEDULER_ERROR', name: error?.name ?? null, message: error?.message ?? null }));
            return { lich: 0, email: 0 };
        }
    }

    khoiDongScheduler({ chuKyMs = 60000 } = {}) {
        if (this._schedulerTimer) return;
        this._schedulerBusy = false;
        this._schedulerTimer = setInterval(async () => {
            if (this._schedulerBusy) return;
            this._schedulerBusy = true;
            try {
                await this.chayScheduler();
            } finally {
                this._schedulerBusy = false;
            }
        }, chuKyMs);
        this.chayScheduler().catch(error => console.error(JSON.stringify({ event: 'THONG_BAO_SCHEDULER_START_ERROR', message: error?.message ?? null })));
    }

    dungScheduler() {
        if (!this._schedulerTimer) return;
        clearInterval(this._schedulerTimer);
        this._schedulerTimer = null;
        this._schedulerBusy = false;
    }
}

module.exports = new ThongBaoService();