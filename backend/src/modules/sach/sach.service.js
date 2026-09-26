const { AppError } = require('../../common/errors/AppError.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const { idHopLe, duLieuSach, duLieuLienKet, boLocHopLe, trangThaiHopLe, LIEN_KET, duLieuAnhHopLe, danhSachAnhHopLe, sapXepAnhHopLe } = require('./sach.validation.js');
const repo = require('./sach.repository.js');
class SachService {
    loi(message, status = 422, code = 'INVALID_INPUT') {
        return new AppError({ code, message, status });
    }
    async yeuCauQuyen(auth, maQuyen, client) {
        if (!await phanQuyenService.kiemTraQuyen(auth, maQuyen, {}, client)) throw this.loi('Không có quyền quản lý sách', 403, 'FORBIDDEN');
    }
    async sachTonTai(donViId, sachId, client, khoa = false, gomDaXoa = false) {
        const sach = await repo.laySach(donViId, sachId, client, khoa, gomDaXoa);
        if (!sach) throw this.loi('Không tìm thấy đầu sách', 404, 'BOOK_NOT_FOUND');
        return sach;
    }
    kiemTraNghiepVu(duLieu) {
        if (duLieu.do_tuoi_toi_thieu != null && duLieu.do_tuoi_toi_da != null && duLieu.do_tuoi_toi_da < duLieu.do_tuoi_toi_thieu) throw this.loi('Độ tuổi tối đa không được nhỏ hơn độ tuổi tối thiểu');
        if (duLieu.nam_sang_tac != null && duLieu.nam_xuat_ban_dau_tien != null && duLieu.nam_xuat_ban_dau_tien < duLieu.nam_sang_tac) throw this.loi('Năm xuất bản đầu tiên không được trước năm sáng tác');
    }
    async kiemTraThamChieu(donViId, bang, id, client) {
        if (id != null && !await repo.thamChieuTonTai(bang, donViId, id, client)) throw this.loi(`Dữ liệu tham chiếu ${bang} không tồn tại trong đơn vị`);
    }
    async kiemTraLienKet(donViId, sachId, loai, duLieu, client) {
        const bang = { 'tac-gia': 'tac_gia', 'the-loai': 'the_loai_sach', 'tu-khoa': 'tu_khoa_sach', 'bo-sach': 'bo_sach', 'lien-quan': 'dau_sach' }[loai];
        const cot = { 'tac-gia': 'tac_gia_id', 'the-loai': 'the_loai_id', 'tu-khoa': 'tu_khoa_id', 'bo-sach': 'bo_sach_id', 'lien-quan': 'dau_sach_lien_quan_id' }[loai];
        if (bang && duLieu[cot] != null) await this.kiemTraThamChieu(donViId, bang, duLieu[cot], client);
        if (loai === 'lien-quan' && duLieu.dau_sach_lien_quan_id === sachId) throw this.loi('Đầu sách không thể liên quan đến chính nó');
    }
    xuLyLoiDb(error) {
        if (error.code === '23505') throw this.loi('Mã đầu sách, đường dẫn hoặc dữ liệu liên kết đã tồn tại', 409, 'BOOK_DUPLICATE');
        if (error.code === '23503') throw this.loi('Dữ liệu đang được sử dụng hoặc tham chiếu không hợp lệ', 409, 'BOOK_REFERENCE_CONFLICT');
        if (['23514', '23502', '22003', '22P02', '22001'].includes(error.code)) throw this.loi('Dữ liệu sách vi phạm ràng buộc');
        throw error;
    }
    async kiemTraTepAnh(donViId, tepId, client) {
        const tep = await repo.layTepAnh(donViId, tepId, client);
        if (!tep) throw this.loi('Ảnh không tồn tại trong đơn vị', 404, 'IMAGE_NOT_FOUND');
        if (tep.trang_thai !== 'SAN_SANG' || tep.trang_thai_quet_virus !== 'SACH') throw this.loi('Ảnh chưa sẵn sàng sử dụng', 409, 'IMAGE_NOT_READY');
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(tep.mime_type_xac_minh)) throw this.loi('Tệp được chọn không phải hình ảnh');
        if (tep.loai_tep !== 'ANH_BIA') throw this.loi('Ảnh sách phải được upload với loại ANH_BIA');
        return tep;
    }
    async danhSachAnh(auth, sachId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        await this.yeuCauQuyen(auth, 'books.read');
        await this.sachTonTai(auth.donViId, sachId);
        return { anh_sach: await repo.danhSachAnh(auth.donViId, sachId) };
    }
    async themNhieuAnh(auth, sachId, body, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        const danhSach = danhSachAnhHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const sach = await this.sachTonTai(auth.donViId, sachId, client, true);
                if (sach.trang_thai === 'NGUNG_KINH_DOANH') throw this.loi('Không thể thêm ảnh vào sách đã ngừng kinh doanh');
                const anhHienTai = await repo.danhSachAnh(auth.donViId, sachId, client);
                const idsHienTai = new Set(anhHienTai.map(item => item.tep_dinh_kem_id));
                for (const item of danhSach) {
                    if (idsHienTai.has(item.tep_dinh_kem_id)) throw this.loi(`Ảnh ${item.tep_dinh_kem_id} đã được gắn với sách`, 409, 'IMAGE_DUPLICATE');
                    await this.kiemTraTepAnh(auth.donViId, item.tep_dinh_kem_id, client);
                }
                const coAnhChinhMoi = danhSach.some(item => item.la_anh_chinh === true);
                if (coAnhChinhMoi) await repo.boAnhChinh(auth.donViId, sachId, auth.taiKhoanId, client);
                const ketQua = [];
                for (const item of danhSach) {
                    const anh = await repo.taoAnh(auth.donViId, sachId, auth.taiKhoanId, item, client);
                    ketQua.push(anh);
                    await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'anh_dau_sach', doiTuongId: anh.id, hanhDong: 'books.image.create', requestId }, client);
                }
                await repo.dongBoAnhChinh(auth.donViId, sachId, auth.taiKhoanId, client);
                return { da_them: ketQua.length, anh_sach: await repo.danhSachAnh(auth.donViId, sachId, client) };
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async suaAnh(auth, sachId, anhId, body, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        anhId = idHopLe(anhId, 'Ảnh sách');
        const duLieu = duLieuAnhHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const sach = await this.sachTonTai(auth.donViId, sachId, client, true);
                if (sach.trang_thai === 'NGUNG_KINH_DOANH') throw this.loi('Không thể sửa ảnh của sách đã ngừng kinh doanh');
                const hienTai = await repo.layAnh(auth.donViId, sachId, anhId, client);
                if (!hienTai) throw this.loi('Không tìm thấy ảnh trong sách', 404, 'BOOK_IMAGE_NOT_FOUND');
                if (duLieu.la_anh_chinh === false && hienTai.la_anh_chinh) throw this.loi('Muốn đổi ảnh chính, hãy chọn ảnh khác làm ảnh chính hoặc gỡ ảnh hiện tại');
                if (duLieu.hien_thi_cong_khai === false && hienTai.la_anh_chinh && duLieu.la_anh_chinh !== false) throw this.loi('Không thể ẩn ảnh chính');
                if (duLieu.la_anh_chinh === true) await repo.boAnhChinh(auth.donViId, sachId, auth.taiKhoanId, client);
                const anh = await repo.suaAnh(auth.donViId, sachId, anhId, auth.taiKhoanId, duLieu, client);
                await repo.dongBoAnhChinh(auth.donViId, sachId, auth.taiKhoanId, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'anh_dau_sach', doiTuongId: anhId, hanhDong: 'books.image.update', requestId }, client);
                return anh;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async datAnhChinh(auth, sachId, anhId, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        anhId = idHopLe(anhId, 'Ảnh sách');
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            await this.sachTonTai(auth.donViId, sachId, client, true);
            const hienTai = await repo.layAnh(auth.donViId, sachId, anhId, client);
            if (!hienTai) throw this.loi('Không tìm thấy ảnh trong sách', 404, 'BOOK_IMAGE_NOT_FOUND');
            if (!hienTai.hien_thi_cong_khai) throw this.loi('Không thể chọn ảnh đang ẩn làm ảnh chính');
            await this.kiemTraTepAnh(auth.donViId, hienTai.tep_dinh_kem_id, client);
            await repo.boAnhChinh(auth.donViId, sachId, auth.taiKhoanId, client);
            await repo.suaAnh(auth.donViId, sachId, anhId, auth.taiKhoanId, { la_anh_chinh: true }, client);
            await repo.dongBoAnhChinh(auth.donViId, sachId, auth.taiKhoanId, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'anh_dau_sach', doiTuongId: anhId, hanhDong: 'books.image.set_primary', requestId }, client);
            return { anh_chinh_id: anhId, anh_sach: await repo.danhSachAnh(auth.donViId, sachId, client) };
        });
    }
    async sapXepAnh(auth, sachId, body, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        const anhIds = sapXepAnhHopLe(body);
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            await this.sachTonTai(auth.donViId, sachId, client, true);
            const hienTai = await repo.danhSachAnh(auth.donViId, sachId, client);
            if (hienTai.length !== anhIds.length || hienTai.some(item => !anhIds.includes(item.id))) throw this.loi('Danh sách sắp xếp phải chứa đầy đủ ảnh hiện có, không thừa hoặc thiếu');
            await repo.sapXepAnh(auth.donViId, sachId, anhIds, auth.taiKhoanId, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'dau_sach', doiTuongId: sachId, hanhDong: 'books.image.reorder', requestId }, client);
            return { anh_sach: await repo.danhSachAnh(auth.donViId, sachId, client) };
        });
    }
    async xoaAnh(auth, sachId, anhId, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        anhId = idHopLe(anhId, 'Ảnh sách');
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            await this.sachTonTai(auth.donViId, sachId, client, true);
            const anh = await repo.layAnh(auth.donViId, sachId, anhId, client);
            if (!anh) throw this.loi('Không tìm thấy ảnh trong sách', 404, 'BOOK_IMAGE_NOT_FOUND');
            await repo.xoaAnh(auth.donViId, sachId, anhId, client);
            await repo.dongBoAnhChinh(auth.donViId, sachId, auth.taiKhoanId, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'anh_dau_sach', doiTuongId: anhId, hanhDong: 'books.image.delete', requestId }, client);
            return { da_go_anh_id: anhId, tep_dinh_kem_id: anh.tep_dinh_kem_id, anh_sach: await repo.danhSachAnh(auth.donViId, sachId, client) };
        });
    }
    async danhSach(auth, queryString) {
        const boLoc = boLocHopLe(queryString);
        await this.yeuCauQuyen(auth, 'books.read');
        return repo.danhSach(auth.donViId, boLoc);
    }
    async chiTiet(auth, sachId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        await this.yeuCauQuyen(auth, 'books.read');
        const sach = await this.sachTonTai(auth.donViId, sachId);
        const [tenKhac, tacGia, theLoai, tuKhoa, boSach, lienQuan, phanLoai, phienBan, nguonDuLieu, quyenNoiDung] = await Promise.all([
            repo.danhSachLienKet('ten-khac', auth.donViId, sachId),
            repo.danhSachLienKet('tac-gia', auth.donViId, sachId),
            repo.danhSachLienKet('the-loai', auth.donViId, sachId),
            repo.danhSachLienKet('tu-khoa', auth.donViId, sachId),
            repo.danhSachLienKet('bo-sach', auth.donViId, sachId),
            repo.danhSachLienKet('lien-quan', auth.donViId, sachId),
            repo.danhSachLienKet('phan-loai', auth.donViId, sachId),
            repo.phienBan(auth.donViId, sachId),
            repo.nguonDuLieu(auth.donViId, sachId),
            repo.quyenNoiDung(auth.donViId, sachId)
        ]);
        return {
            ...sach,
            ten_khac: tenKhac, tac_gia: tacGia, the_loai: theLoai,
            tu_khoa: tuKhoa, bo_sach: boSach, sach_lien_quan: lienQuan,
            phan_loai: phanLoai, phien_ban_sach: phienBan,
            nguon_du_lieu_sach: nguonDuLieu, quyen_noi_dung_sach: quyenNoiDung
        };
    }
    async taoSach(auth, body, requestId) {
        const duLieu = duLieuSach(body, true);
        this.kiemTraNghiepVu(duLieu);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                await this.kiemTraThamChieu(auth.donViId, 'tep_dinh_kem', duLieu.anh_bia_chinh_id, client);
                const sach = await repo.taoSach(auth.donViId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'dau_sach', doiTuongId: sach.id, hanhDong: 'books.create', requestId }, client);
                return sach;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async suaSach(auth, sachId, body, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        const duLieu = duLieuSach(body);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const hienTai = await this.sachTonTai(auth.donViId, sachId, client, true);
                if (hienTai.trang_thai === 'NGUNG_KINH_DOANH') throw this.loi('Không thể sửa sách đã ngừng kinh doanh', 409, 'BOOK_INACTIVE');
                this.kiemTraNghiepVu({ ...hienTai, ...duLieu });
                await this.kiemTraThamChieu(auth.donViId, 'tep_dinh_kem', duLieu.anh_bia_chinh_id, client);
                const sach = await repo.suaSach(auth.donViId, sachId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'dau_sach', doiTuongId: sachId, hanhDong: 'books.update', requestId }, client);
                return sach;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async doiTrangThai(auth, sachId, body, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        const yeuCau = trangThaiHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const hienTai = await this.sachTonTai(auth.donViId, sachId, client, true);
                const chuyenTrangThai = {
                    NHAP: ['CHO_DUYET', 'TAM_AN'],
                    CHO_DUYET: ['NHAP', 'DANG_HIEN_THI', 'TAM_AN'],
                    DANG_HIEN_THI: ['TAM_AN', 'NGUNG_KINH_DOANH'],
                    TAM_AN: ['NHAP', 'CHO_DUYET', 'DANG_HIEN_THI', 'NGUNG_KINH_DOANH'],
                    NGUNG_KINH_DOANH: ['NHAP']
                };
                if (!chuyenTrangThai[hienTai.trang_thai]?.includes(yeuCau.trang_thai)) throw this.loi('Không thể chuyển sang trạng thái được yêu cầu');
                const duLieu = { trang_thai: yeuCau.trang_thai };
                if (yeuCau.trang_thai === 'CHO_DUYET') {
                    const [tacGia, theLoai] = await Promise.all([
                        repo.danhSachLienKet('tac-gia', auth.donViId, sachId, client),
                        repo.danhSachLienKet('the-loai', auth.donViId, sachId, client)
                    ]);
                    if (!tacGia.length || !theLoai.length) throw this.loi('Cần có tác giả và thể loại trước khi gửi duyệt');
                    duLieu.cho_hien_thi_cong_khai = false;
                }
                if (yeuCau.trang_thai === 'DANG_HIEN_THI') {
                    if (hienTai.trang_thai === 'CHO_DUYET') {
                        duLieu.nguoi_kiem_duyet_id = auth.taiKhoanId;
                        duLieu.ngay_kiem_duyet = new Date();
                    } else if (!hienTai.ngay_kiem_duyet) throw this.loi('Sách chưa được kiểm duyệt');
                    duLieu.cho_hien_thi_cong_khai = true;
                    duLieu.ngay_cong_bo = hienTai.ngay_cong_bo ?? new Date();
                    duLieu.ngay_an = null;
                    duLieu.ly_do_an = null;
                }
                if (['TAM_AN', 'NGUNG_KINH_DOANH'].includes(yeuCau.trang_thai)) {
                    duLieu.cho_hien_thi_cong_khai = false;
                    duLieu.ngay_an = new Date();
                    duLieu.ly_do_an = yeuCau.ly_do_an;
                }
                if (yeuCau.trang_thai === 'NHAP') {
                    duLieu.cho_hien_thi_cong_khai = false;
                    duLieu.nguoi_kiem_duyet_id = null;
                    duLieu.ngay_kiem_duyet = null;
                }
                const sach = await repo.doiTrangThai(auth.donViId, sachId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'dau_sach', doiTuongId: sachId, hanhDong: `books.status.${yeuCau.trang_thai.toLowerCase()}`, requestId }, client);
                return sach;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async xoaSach(auth, sachId, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            const sach = await this.sachTonTai(auth.donViId, sachId, client, true);
            if (sach.trang_thai === 'DANG_HIEN_THI') throw this.loi('Cần ẩn sách trước khi xóa', 409, 'BOOK_PUBLIC');
            const ketQua = await repo.xoaMem(auth.donViId, sachId, auth.taiKhoanId, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'dau_sach', doiTuongId: sachId, hanhDong: 'books.delete', requestId }, client);
            return ketQua;
        });
    }
    async khoiPhuc(auth, sachId, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            const sach = await this.sachTonTai(auth.donViId, sachId, client, true, true);
            if (!sach.ngay_xoa) throw this.loi('Đầu sách chưa bị xóa');
            const ketQua = await repo.khoiPhuc(auth.donViId, sachId, auth.taiKhoanId, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'dau_sach', doiTuongId: sachId, hanhDong: 'books.restore', requestId }, client);
            return ketQua;
        });
    }
    async danhSachLienKet(auth, sachId, loai) {
        sachId = idHopLe(sachId, 'Đầu sách');
        if (!LIEN_KET[loai]) throw this.loi('Loại dữ liệu liên kết không hợp lệ');
        await this.yeuCauQuyen(auth, 'books.read');
        await this.sachTonTai(auth.donViId, sachId);
        return { [LIEN_KET[loai].bang]: await repo.danhSachLienKet(loai, auth.donViId, sachId) };
    }
    async taoLienKet(auth, sachId, loai, body, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        const duLieu = duLieuLienKet(loai, body, true);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const sach = await this.sachTonTai(auth.donViId, sachId, client, true);
                if (sach.trang_thai === 'NGUNG_KINH_DOANH') throw this.loi('Không thể cập nhật sách đã ngừng kinh doanh');
                await this.kiemTraLienKet(auth.donViId, sachId, loai, duLieu, client);
                if (loai === 'the-loai' && duLieu.la_the_loai_chinh) {
                    const hienTai = await repo.danhSachLienKet('the-loai', auth.donViId, sachId, client);
                    if (hienTai.some(item => item.la_the_loai_chinh)) throw this.loi('Đầu sách đã có thể loại chính; hãy đổi thể loại chính bằng API cập nhật', 409, 'PRIMARY_CATEGORY_EXISTS');
                }
                const lienKet = await repo.taoLienKet(loai, auth.donViId, sachId, auth.taiKhoanId, duLieu, client);
                if (['tac-gia', 'phan-loai', 'ten-khac'].includes(loai) && (lienKet.la_nguoi_dong_gop_chinh || lienKet.la_phan_loai_chinh || lienKet.la_ten_uu_tien)) await repo.boDanhDauChinh(loai, auth.donViId, sachId, lienKet.id, auth.taiKhoanId, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: LIEN_KET[loai].bang, doiTuongId: lienKet.id, hanhDong: `books.${loai}.create`, requestId }, client);
                return lienKet;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async suaLienKet(auth, sachId, loai, lienKetId, body, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        lienKetId = idHopLe(lienKetId, 'Liên kết');
        const duLieu = duLieuLienKet(loai, body);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const sach = await this.sachTonTai(auth.donViId, sachId, client, true);
                if (sach.trang_thai === 'NGUNG_KINH_DOANH') throw this.loi('Không thể cập nhật sách đã ngừng kinh doanh');
                const hienTai = await repo.layLienKet(loai, auth.donViId, sachId, lienKetId, client, true);
                if (!hienTai) throw this.loi('Không tìm thấy dữ liệu liên kết', 404, 'BOOK_LINK_NOT_FOUND');
                if (loai === 'the-loai' && duLieu.la_the_loai_chinh) await repo.boDanhDauChinh(loai, auth.donViId, sachId, lienKetId, auth.taiKhoanId, client);
                const lienKet = await repo.suaLienKet(loai, auth.donViId, sachId, lienKetId, auth.taiKhoanId, duLieu, client);
                if (['tac-gia', 'phan-loai', 'ten-khac'].includes(loai) && (lienKet.la_nguoi_dong_gop_chinh || lienKet.la_phan_loai_chinh || lienKet.la_ten_uu_tien)) await repo.boDanhDauChinh(loai, auth.donViId, sachId, lienKetId, auth.taiKhoanId, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: LIEN_KET[loai].bang, doiTuongId: lienKetId, hanhDong: `books.${loai}.update`, requestId }, client);
                return lienKet;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async xoaLienKet(auth, sachId, loai, lienKetId, requestId) {
        sachId = idHopLe(sachId, 'Đầu sách');
        lienKetId = idHopLe(lienKetId, 'Liên kết');
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const sach = await this.sachTonTai(auth.donViId, sachId, client, true);
                if (sach.trang_thai === 'NGUNG_KINH_DOANH') throw this.loi('Không thể cập nhật sách đã ngừng kinh doanh');
                const hienTai = await repo.layLienKet(loai, auth.donViId, sachId, lienKetId, client, true);
                if (!hienTai) throw this.loi('Không tìm thấy dữ liệu liên kết', 404, 'BOOK_LINK_NOT_FOUND');
                const ketQua = await repo.xoaLienKet(loai, auth.donViId, sachId, lienKetId, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: LIEN_KET[loai].bang, doiTuongId: lienKetId, hanhDong: `books.${loai}.delete`, requestId }, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
}
module.exports = new SachService();