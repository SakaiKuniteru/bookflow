const { AppError } = require('../../common/errors/AppError.js');
const v = require('./ai.validator.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}
function layAiServiceUrl() {
    const url = String(process.env.AI_SERVICE_URL || '').trim();
    if (!url) throw loi('AI Service chưa được cấu hình', 503, 'AI_SERVICE_NOT_CONFIGURED');
    return url.replace(/\/+$/, '');
}
function layAiServiceKey() {
    return String(process.env.AI_SERVICE_KEY || '').trim();
}
async function goiAi(endpoint, payload, requestId) {
    const key = layAiServiceKey();
    if (!key) throw loi('AI_SERVICE_KEY chưa được cấu hình', 503, 'AI_SERVICE_KEY_NOT_CONFIGURED');
    let response;
    try {
        response = await fetch(`${layAiServiceUrl()}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Token': key,
                'X-Request-Id': String(requestId || ''),
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000),
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
    if (!response.ok) throw loi(data?.error?.message || data?.message || 'AI Service xử lý thất bại', 502, 'AI_SERVICE_ERROR');
    return data?.data ?? data;
}
async function layUserContext(auth) {
    const permissions = await phanQuyenService.quyenCuaToi(auth);
    return {
        user_id: auth.taiKhoanId,
        don_vi_id: auth.donViId,
        chi_nhanh_id: auth.chiNhanhId ?? null,
        permissions: (permissions?.quyen || []).map(item => item.ma_quyen),
        permission_scopes: permissions?.quyen || [],
        allowed_scope: auth.chiNhanhId ? 'BRANCH' : 'ORGANIZATION',
    };
}
class AiService {
    async chat(auth, body, requestId) {
        const data = v.duLieuChatHopLe(body);
        return goiAi('/internal/tro-ly', {
            assistant_type: data.assistant_type || 'BOOK_ADVISOR',
            conversation_id: body.conversation_id ?? null,
            message: data.cau_hoi,
            user_context: await layUserContext(auth),
            retrieved_context: [],
            recommendation_context: [],
            business_context: data.doi_tuong || {},
            tool_context: [],
            metadata: { request_id: requestId },
        }, requestId);
    }
    async search(auth, body, requestId) {
        const data = v.duLieuSearchHopLe(body);
        return goiAi('/internal/tim-kiem', {
            query: data.cau_hoi,
            filters: body.filters || {},
            limit: data.gioi_han,
            offset: body.offset || 0,
            user_context: await layUserContext(auth),
        }, requestId);
    }
    async goiYSach(auth, body, requestId) {
        const data = v.duLieuGoiYSachHopLe(body);
        return goiAi('/internal/goi-y', {
            context_type: data.sach_id ? 'BOOK_DETAIL' : 'SEARCH',
            user_id: auth.taiKhoanId,
            book_id: data.sach_id,
            query: data.cau_hoi,
            limit: data.so_luong,
            filters: body.filters || {},
            user_context: await layUserContext(auth),
        }, requestId);
    }
    async phanTich(auth, body, requestId) {
        const data = v.duLieuPhanTichHopLe(body);
        return goiAi('/internal/tro-ly', {
            assistant_type: 'REPORT_ASSISTANT',
            message: data.cau_hoi || 'Phân tích báo cáo được cung cấp.',
            user_context: await layUserContext(auth),
            business_context: body.context || {},
            metadata: {
                report_type: data.loai,
                tu_ngay: data.tu_ngay,
                den_ngay: data.den_ngay,
            },
        }, requestId);
    }
}
module.exports = new AiService();