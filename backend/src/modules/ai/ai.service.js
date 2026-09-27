const { AppError } = require('../../common/errors/AppError.js');
const repo = require('./ai.repository.js');
const v = require('./ai.validator.js');
const { AI_LOAI_YEU_CAU, AI_LOAI_PHAN_TICH, AI_INTENT, AI_ENDPOINT, AI_MAX } = require('./ai.constant.js');

function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}

function layDonViId(auth) {
    const donViId = Number(auth?.donViId);
    if (!Number.isSafeInteger(donViId) || donViId <= 0) throw loi('Thiếu đơn vị', 403, 'TENANT_REQUIRED');
    return donViId;
}

function layAiServiceUrl() {
    const url = String(process.env.AI_SERVICE_URL || '').trim();
    if (!url) throw loi('AI Service chưa được cấu hình', 503, 'AI_SERVICE_NOT_CONFIGURED');
    return url.replace(/\/+$/, '');
}

function layAiServiceKey() {
    return String(process.env.AI_SERVICE_KEY || '').trim();
}

async function goiAi(endpoint, payload) {
    const url = `${layAiServiceUrl()}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = layAiServiceKey();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000)
        });
    } catch (error) {
        throw loi(`Không kết nối được AI Service: ${error?.message || 'Unknown error'}`, 503, 'AI_SERVICE_UNAVAILABLE');
    }
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (!response.ok) throw loi(data?.message || 'AI Service xử lý thất bại', 502, 'AI_SERVICE_ERROR');
    return data;
}

function taoContext(loai, duLieu) {
    return {
        nguon: 'BookFlow',
        loai,
        du_lieu: duLieu
    };
}

function layKetQuaAi(data) {
    return data?.data ?? data?.result ?? data?.answer ?? data;
}

class AiService {
    async chat(auth, body) {
        const donViId = layDonViId(auth);
        const data = v.duLieuChatHopLe(body);
        const intent = await goiAi(AI_ENDPOINT.PHAN_TICH_Y_DINH, {
            loai_yeu_cau: AI_LOAI_YEU_CAU.CHAT,
            cau_hoi: data.cau_hoi,
            context: data.doi_tuong || null
        });
        const yDinh = layKetQuaAi(intent) || {};
        const context = await this.layContextTheoYDinh(donViId, yDinh);
        const ketQua = await goiAi(AI_ENDPOINT.CHAT, {
            loai_yeu_cau: AI_LOAI_YEU_CAU.CHAT,
            cau_hoi: data.cau_hoi,
            lich_su: data.lich_su,
            y_dinh: yDinh,
            context: taoContext('CHAT', context)
        });
        return {
            loai: AI_LOAI_YEU_CAU.CHAT,
            cau_hoi: data.cau_hoi,
            y_dinh: yDinh,
            tra_loi: layKetQuaAi(ketQua)
        };
    }

    async search(auth, body) {
        const donViId = layDonViId(auth);
        const data = v.duLieuSearchHopLe(body);
        const intentResponse = await goiAi(AI_ENDPOINT.PHAN_TICH_Y_DINH, {
            loai_yeu_cau: AI_LOAI_YEU_CAU.SEARCH,
            cau_hoi: data.cau_hoi
        });
        const yDinh = layKetQuaAi(intentResponse) || {};
        const dieuKien = {
            tu_khoa: yDinh.tu_khoa || yDinh.tuKhoa || null,
            the_loai: yDinh.the_loai || yDinh.theLoai || null,
            tac_gia: yDinh.tac_gia || yDinh.tacGia || null,
            gioi_han: data.gioi_han
        };
        const sach = await repo.timSachTheoDieuKien(donViId, dieuKien);
        const ketQua = await this.kiemTraKetQuaSearch(donViId, sach, yDinh);
        return {
            loai: AI_LOAI_YEU_CAU.SEARCH,
            cau_hoi: data.cau_hoi,
            dieu_kien: yDinh,
            items: ketQua,
            tong: ketQua.length
        };
    }

    async goiYSach(auth, body) {
        const donViId = layDonViId(auth);
        const data = v.duLieuGoiYSachHopLe(body);
        let sachGoc = null;
        if (data.sach_id) {
            sachGoc = await repo.laySachTheoId(donViId, data.sach_id);
            if (!sachGoc) throw loi('Không tìm thấy sách', 404, 'NOT_FOUND');
        }
        const ketQuaAi = await goiAi(AI_ENDPOINT.GOI_Y_SACH, {
            loai_yeu_cau: AI_LOAI_YEU_CAU.GOI_Y_SACH,
            cau_hoi: data.cau_hoi || null,
            so_luong: data.so_luong,
            sach: sachGoc
        });
        const danhSachAi = layKetQuaAi(ketQuaAi);
        const danhSachId = this.trichSachIds(danhSachAi);
        const danhSachSach = [];
        for (const sachId of danhSachId) {
            const sach = await repo.laySachTheoId(donViId, sachId);
            if (sach) danhSachSach.push(sach);
        }
        return {
            loai: AI_LOAI_YEU_CAU.GOI_Y_SACH,
            sach_goc: sachGoc,
            items: danhSachSach.slice(0, data.so_luong)
        };
    }

    async phanTich(auth, body) {
        const donViId = layDonViId(auth);
        const data = v.duLieuPhanTichHopLe(body);
        const context = await this.layContextPhanTich(donViId, data);
        const ketQua = await goiAi(AI_ENDPOINT.PHAN_TICH, {
            loai_yeu_cau: AI_LOAI_YEU_CAU.PHAN_TICH,
            loai_phan_tich: data.loai,
            cau_hoi: data.cau_hoi || null,
            context: taoContext(data.loai, context)
        });
        return {
            loai: AI_LOAI_YEU_CAU.PHAN_TICH,
            loai_phan_tich: data.loai,
            tu_ngay: data.tu_ngay,
            den_ngay: data.den_ngay,
            ket_qua: layKetQuaAi(ketQua)
        };
    }

    async layContextTheoYDinh(donViId, yDinh = {}) {
        const intent = yDinh.intent || yDinh.y_dinh || AI_INTENT.KHAC;
        if (intent === AI_INTENT.TIM_SACH) return { sach: await repo.timSachTheoDieuKien(donViId, { tu_khoa: yDinh.tu_khoa || yDinh.tuKhoa, the_loai: yDinh.the_loai || yDinh.theLoai, tac_gia: yDinh.tac_gia || yDinh.tacGia, gioi_han: 20 }) };
        if (intent === AI_INTENT.KIEM_TRA_TON_KHO) return { ton_kho: await repo.layTonKhoSach(donViId, yDinh.sach_id || yDinh.sachId || null, yDinh.chi_nhanh_id || yDinh.chiNhanhId || null) };
        if (intent === AI_INTENT.KIEM_TRA_MUON_TRA) return { muon_tra: await repo.layPhieuMuonTra(donViId, yDinh.phieu_id || yDinh.phieuId || null) };
        if (intent === AI_INTENT.KIEM_TRA_QUA_HAN) return { qua_han: await repo.laySachQuaHan(donViId) };
        if (intent === AI_INTENT.KIEM_TRA_DAT_TRUOC) return { dat_truoc: await repo.layDatTruocTheoSach(donViId, yDinh.sach_id || yDinh.sachId || null) };
        if (intent === AI_INTENT.PHAN_TICH_KHO) return { ton_kho: await repo.layTonKhoSach(donViId, null, yDinh.chi_nhanh_id || yDinh.chiNhanhId || null) };
        if (intent === AI_INTENT.PHAN_TICH_MUON_TRA) return { qua_han: await repo.laySachQuaHan(donViId) };
        if (intent === AI_INTENT.PHAN_TICH_DAT_TRUOC) return { dat_truoc: await repo.layDatTruocTheoSach(donViId, yDinh.sach_id || yDinh.sachId || null) };
        if (intent === AI_INTENT.PHAN_TICH_PHI_PHAT) return { phi_phat: await repo.layPhiPhat(donViId) };
        return repo.layDuLieuTongHop(donViId);
    }

    async layContextPhanTich(donViId, data) {
        if (data.loai === AI_LOAI_PHAN_TICH.KHO) return { ton_kho: await repo.layTonKhoSach(donViId, data.sach_id, data.chi_nhanh_id) };
        if (data.loai === AI_LOAI_PHAN_TICH.MUON_TRA) return { qua_han: await repo.laySachQuaHan(donViId), thong_ke_sach: await repo.layThongKeSach(donViId, data.tu_ngay, data.den_ngay) };
        if (data.loai === AI_LOAI_PHAN_TICH.DAT_TRUOC) return { dat_truoc: await repo.layDatTruocTheoSach(donViId, data.sach_id) };
        if (data.loai === AI_LOAI_PHAN_TICH.SACH) return { thong_ke_sach: await repo.layThongKeSach(donViId, data.tu_ngay, data.den_ngay) };
        if (data.loai === AI_LOAI_PHAN_TICH.PHI_PHAT) return { phi_phat: await repo.layPhiPhat(donViId, data.tu_ngay, data.den_ngay) };
        return repo.layDuLieuTongHop(donViId, data.tu_ngay, data.den_ngay);
    }

    async kiemTraKetQuaSearch(donViId, sach, yDinh) {
        if (!Array.isArray(sach) || !sach.length) return [];
        const ketQua = [];
        for (const item of sach) {
            if (yDinh.chi_nhanh_id || yDinh.chiNhanhId || yDinh.so_luong_toi_thieu || yDinh.soLuongToiThieu) {
                const tonKho = await repo.layTonKhoSach(donViId, item.id, yDinh.chi_nhanh_id || yDinh.chiNhanhId || null);
                const soLuong = tonKho.reduce((tong, row) => tong + Number(row.so_luong_ton || 0), 0);
                const toiThieu = Number(yDinh.so_luong_toi_thieu || yDinh.soLuongToiThieu || 0);
                if (toiThieu > 0 && soLuong < toiThieu) continue;
            }
            ketQua.push(item);
        }
        return ketQua;
    }

    trichSachIds(data) {
        const danhSach = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        return danhSach.map(item => Number(item?.sach_id ?? item?.sachId ?? item?.id)).filter(id => Number.isSafeInteger(id) && id > 0).slice(0, AI_MAX.SO_KET_QUA_GOI_Y);
    }
}

module.exports = new AiService();