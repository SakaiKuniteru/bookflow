const { trongGiaoDich } = require('../../database/transaction.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { congTien,truTien,soSanhTien } = require('../../common/utils/tien.js');
const phanQuyen = require('../phan-quyen/phan-quyen.service.js');
const v = require('./thanh-toan.validation.js');
const repo = require('./thanh-toan.repository.js');
const soCai = require('./thanh-toan.hach-toan.js');
const qrProvider = require('./thanh-toan.qr-provider.js');
class ThanhToanService {
    async quyen(auth,ma,client) {
        if (!auth?.donViId || !auth?.taiKhoanId) throw v.loi('Vui lòng đăng nhập và chọn đơn vị',403,'TENANT_REQUIRED');
        if (!await phanQuyen.kiemTraQuyen(auth,ma,{},client)) throw v.loi('Không đủ quyền thực hiện nghiệp vụ tài chính',403,'FORBIDDEN');
    }
    async chiNhanh(auth,id,client) {
        if (id == null) return;
        if (auth.chiNhanhId && Number(auth.chiNhanhId) !== Number(id)) throw v.loi('Chi nhánh khác chi nhánh đang làm việc',403,'BRANCH_FORBIDDEN');
        const row = await repo.mot('SELECT id FROM chi_nhanh WHERE don_vi_id = $1 AND id = $2',[auth.donViId,id],client);
        if (!row) throw v.loi('Chi nhánh không thuộc đơn vị',404,'BRANCH_NOT_FOUND');
    }
    async danhSachPhuongThuc(auth,query = {}) {
        await this.quyen(auth,'payments.read');
        const chiNhanh = query.chi_nhanh_id == null ? null : v.id(query.chi_nhanh_id,'Chi nhánh');
        await this.chiNhanh(auth,chiNhanh);
        return repo.danhSachPhuongThuc(auth.donViId,chiNhanh);
    }
    async taoPhuongThuc(auth,body,requestId) {
        const data = v.phuongThuc(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.manage',client);
            await this.chiNhanh(auth,data.chi_nhanh_id,client);
            const result = await repo.taoPhuongThuc(auth.donViId,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'phuong_thuc_thanh_toan','payments.method.create',requestId,null,client);
            return result;
        });
    }
    async suaPhuongThuc(auth,id,body,requestId) {
        const data = v.phuongThuc(body,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.manage',client);
            const old = await repo.layPhuongThuc(auth.donViId,v.id(id,'Phương thức'),client,true);
            if (!old) throw v.loi('Không tìm thấy phương thức',404,'METHOD_NOT_FOUND');
            await this.chiNhanh(auth,data.chi_nhanh_id ?? old.chi_nhanh_id,client);
            if (data.loai && data.loai !== old.loai) {
                const used = await repo.mot('SELECT 1 FROM giao_dich_thanh_toan WHERE don_vi_id = $1 AND phuong_thuc_id = $2 LIMIT 1',[auth.donViId,old.id],client);
                if (used) throw v.loi('Không được đổi loại phương thức đã phát sinh giao dịch',409,'METHOD_IN_USE');
            }
            const result = await repo.suaPhuongThuc(auth.donViId,old.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'phuong_thuc_thanh_toan','payments.method.update',requestId,null,client);
            return result;
        });
    }
    async danhSachTaiKhoan(auth,query = {}) {
        await this.quyen(auth,'payments.read');
        const chiNhanh = query.chi_nhanh_id == null ? null : v.id(query.chi_nhanh_id,'Chi nhánh');
        await this.chiNhanh(auth,chiNhanh);
        return repo.danhSachTaiKhoan(auth.donViId,chiNhanh);
    }
    kiemTraTaiKhoan(data) {
        if (data.loai === 'NGAN_HANG' && (!data.ma_ngan_hang || !data.so_tai_khoan || !data.chu_tai_khoan)) throw v.loi('Tài khoản ngân hàng cần mã ngân hàng, số tài khoản và chủ tài khoản');
        if (data.loai === 'VI_DIEN_TU' && !data.ma_vi) throw v.loi('Ví điện tử cần mã ví');
        if (data.mac_dinh && data.hoat_dong === false) throw v.loi('Tài khoản mặc định phải đang hoạt động');
    }
    async taoTaiKhoan(auth,body,requestId) {
        const data = v.taiKhoan(body);
        this.kiemTraTaiKhoan(data);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.manage',client);
            await this.chiNhanh(auth,data.chi_nhanh_id,client);
            if (data.mac_dinh) await repo.boMacDinh(auth.donViId,data.chi_nhanh_id ?? null,data.loai,client);
            const result = await repo.taoTaiKhoan(auth.donViId,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'tai_khoan_nhan_tien','payments.receiver.create',requestId,'Không ghi số tài khoản vào nhật ký',client);
            return result;
        });
    }
    async suaTaiKhoan(auth,id,body,requestId) {
        const data = v.taiKhoan(body,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.manage',client);
            const old = await repo.layTaiKhoan(auth.donViId,v.id(id,'Tài khoản nhận'),client,true);
            if (!old) throw v.loi('Không tìm thấy tài khoản nhận tiền',404,'RECEIVER_NOT_FOUND');
            await this.chiNhanh(auth,data.chi_nhanh_id === undefined ? old.chi_nhanh_id : data.chi_nhanh_id,client);
            const all = { ...old,...data };
            this.kiemTraTaiKhoan(all);
            if (data.loai && data.loai !== old.loai) {
                const used = await repo.mot('SELECT 1 FROM giao_dich_thanh_toan WHERE don_vi_id = $1 AND tai_khoan_nhan_id = $2 LIMIT 1',[auth.donViId,old.id],client);
                if (used) throw v.loi('Không được đổi loại tài khoản đã có giao dịch',409,'RECEIVER_IN_USE');
            }
            if (all.mac_dinh && (data.mac_dinh || data.loai || data.chi_nhanh_id !== undefined)) {
                await repo.boMacDinh(auth.donViId,all.chi_nhanh_id,all.loai,client);
                data.mac_dinh = true;
            }
            const result = await repo.suaTaiKhoan(auth.donViId,old.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'tai_khoan_nhan_tien','payments.receiver.update',requestId,'Không ghi số tài khoản vào nhật ký',client);
            return result;
        });
    }
    async timChiNhanhPhanBo(auth,data,client) {
        let chiNhanhId = data.chi_nhanh_id;
        let khachHangId = null;
        let caId = null;
        for (const a of data.phan_bo) {
            let target;
            if (a.loai_doi_tuong === 'DON_HANG') target = await repo.mot('SELECT id,chi_nhanh_id,khach_hang_id,kenh_ban FROM don_hang WHERE don_vi_id = $1 AND id = $2',[auth.donViId,a.doi_tuong_id],client);
            if (a.loai_doi_tuong === 'CONG_NO') target = await repo.mot('SELECT id,chi_nhanh_id,khach_hang_id,loai_cong_no FROM cong_no WHERE don_vi_id = $1 AND id = $2',[auth.donViId,a.doi_tuong_id],client);
            if (a.loai_doi_tuong === 'TIEN_COC') target = await repo.mot('SELECT id,khach_hang_id FROM tien_coc WHERE don_vi_id = $1 AND id = $2',[auth.donViId,a.doi_tuong_id],client);
            if (!target) throw v.loi('Đối tượng phân bổ không tồn tại trong đơn vị',404,'TARGET_NOT_FOUND');
            if (a.loai_doi_tuong === 'CONG_NO' && (data.loai_giao_dich === 'THU' ? target.loai_cong_no !== 'PHAI_THU' : target.loai_cong_no !== 'PHAI_TRA')) throw v.loi('Loại công nợ không khớp thu hoặc chi');
            if (target.chi_nhanh_id && chiNhanhId && target.chi_nhanh_id !== chiNhanhId) throw v.loi('Các đối tượng phải thuộc cùng chi nhánh',409,'BRANCH_MISMATCH');
            chiNhanhId = chiNhanhId ?? target.chi_nhanh_id ?? null;
            if (target.khach_hang_id && khachHangId && target.khach_hang_id !== khachHangId) khachHangId = null;
            else khachHangId = khachHangId ?? target.khach_hang_id ?? null;
            if (a.loai_doi_tuong === 'DON_HANG' && target.kenh_ban === 'POS') {
                const row = await repo.mot('SELECT cb.id,cb.thu_ngan_id,cb.trang_thai FROM phien_ban_hang pb JOIN ca_ban_hang cb ON cb.don_vi_id = pb.don_vi_id AND cb.id = pb.ca_ban_hang_id WHERE pb.don_vi_id = $1 AND pb.don_hang_id = $2',[auth.donViId,target.id],client);
                if (!row || row.thu_ngan_id !== auth.taiKhoanId || row.trang_thai !== 'DANG_MO' || caId && caId !== row.id) throw v.loi('Thu tiền POS phải thuộc ca mở của thu ngân hiện tại',403,'POS_SHIFT_REQUIRED');
                caId = row.id;
            }
        }
        if (!chiNhanhId) throw v.loi('Chưa xác định chi nhánh giao dịch');
        await this.chiNhanh(auth,chiNhanhId,client);
        return { chi_nhanh_id: chiNhanhId,khach_hang_id: khachHangId,ca_ban_hang_id: caId };
    }
    async taoGiaoDich(auth,body,requestId) {
        const data = v.giaoDich(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,data.loai_giao_dich === 'THU' ? 'payments.collect' : 'payments.disburse',client);
            await repo.chay('SELECT pg_advisory_xact_lock($1::integer,hashtext($2::text))',[auth.donViId,data.khoa_chong_trung],client);
            const existed = await repo.layTheoKhoa(auth.donViId,data.khoa_chong_trung,client);
            if (existed) {
                if (existed.loai_giao_dich !== data.loai_giao_dich || existed.phuong_thuc_id !== data.phuong_thuc_id || soSanhTien(existed.so_tien,data.so_tien) !== 0 || JSON.stringify(existed.du_lieu_yeu_cau?.phan_bo) !== JSON.stringify(data.phan_bo)) throw v.loi('Khóa chống trùng được dùng với dữ liệu khác',409,'IDEMPOTENCY_CONFLICT');
                return { ...existed,qr: existed.du_lieu_yeu_cau?.loai_phuong_thuc === 'QR' ? { tich_hop_ngan_hang: false,trang_thai: 'CHO_TICH_HOP',qr_payload: null,qr_image_url: null } : undefined };
            }
            const pt = await repo.layPhuongThuc(auth.donViId,data.phuong_thuc_id,client);
            if (!pt || !pt.hoat_dong || !['TIEN_MAT','CHUYEN_KHOAN','QR'].includes(pt.loai)) throw v.loi('Phương thức thanh toán chưa được hỗ trợ hoặc đã tắt',409,'PAYMENT_METHOD_INVALID');
            if (pt.loai === 'QR' && data.loai_giao_dich !== 'THU') throw v.loi('QR hiện chỉ hỗ trợ tạo yêu cầu thu');
            const phamVi = await this.timChiNhanhPhanBo(auth,data,client);
            if (pt.chi_nhanh_id && pt.chi_nhanh_id !== phamVi.chi_nhanh_id) throw v.loi('Phương thức không áp dụng cho chi nhánh',409,'METHOD_BRANCH_MISMATCH');
            let tk = null;
            if (data.tai_khoan_nhan_id) {
                tk = await repo.layTaiKhoan(auth.donViId,data.tai_khoan_nhan_id,client);
                if (!tk || !tk.hoat_dong || tk.chi_nhanh_id && tk.chi_nhanh_id !== phamVi.chi_nhanh_id) throw v.loi('Tài khoản nhận không hợp lệ',409,'RECEIVER_INVALID');
            }
            if (data.loai_giao_dich === 'THU' && ['CHUYEN_KHOAN','QR'].includes(pt.loai) && (!tk || tk.loai !== 'NGAN_HANG')) throw v.loi('Chuyển khoản và QR phải chọn tài khoản ngân hàng nhận tiền');
            if (pt.loai === 'TIEN_MAT' && tk && tk.loai !== 'TIEN_MAT') throw v.loi('Tiền mặt chỉ được gắn quỹ tiền mặt');
            if (pt.loai === 'TIEN_MAT' && data.loai_giao_dich === 'CHI' && !tk && !phamVi.ca_ban_hang_id) throw v.loi('Chi tiền mặt cần chọn quỹ tiền mặt hoặc ca đang mở');
            if (data.loai_giao_dich === 'CHI' && pt.loai === 'CHUYEN_KHOAN' && (!data.nguoi_thu_huong?.so_tai_khoan || !data.nguoi_thu_huong?.chu_tai_khoan || !data.nguoi_thu_huong?.ma_ngan_hang)) throw v.loi('Chuyển khoản chi cần thông tin ngân hàng người thụ hưởng');
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.GIAO_DICH);
            const meta = { phan_bo: data.phan_bo,loai_phuong_thuc: pt.loai,nha_cung_cap: ['QR','CHUYEN_KHOAN'].includes(pt.loai) ? pt.cau_hinh?.nha_cung_cap ?? null : null,ca_ban_hang_id: pt.loai === 'TIEN_MAT' ? phamVi.ca_ban_hang_id : null,nguoi_thu_huong: data.nguoi_thu_huong };
            const gd = await repo.taoGiaoDich(auth.donViId,{ ...data,...phamVi,trang_thai: pt.loai === 'TIEN_MAT' ? 'KHOI_TAO' : 'CHO_XU_LY',du_lieu_yeu_cau: meta },ma,auth.taiKhoanId,client);
            let ketQua = gd;
            if (pt.loai === 'TIEN_MAT') ketQua = await soCai.ghiSoGiaoDich(auth.donViId,gd,auth.taiKhoanId,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'giao_dich_thanh_toan',`payments.${data.loai_giao_dich.toLowerCase()}.create`,requestId,pt.loai,client);
            return { ...ketQua,qr: pt.loai === 'QR' ? await qrProvider.taoYeuCauQR({ giaoDich: gd,phuongThuc: pt,taiKhoanNhan: tk }) : undefined };
        });
    }
    async danhSachGiaoDich(auth,query = {}) {
        await this.quyen(auth,'payments.read');
        const filter = { ...v.trang(query),trang_thai: query.trang_thai ? v.enumValue(query.trang_thai,['KHOI_TAO','CHO_XU_LY','THANH_CONG','THAT_BAI','DA_HUY','HET_HAN'],'Trạng thái') : null,loai_giao_dich: query.loai_giao_dich ? v.enumValue(query.loai_giao_dich,['THU','CHI','HOAN_TIEN'],'Loại') : null,chi_nhanh_id: query.chi_nhanh_id ? v.id(query.chi_nhanh_id,'Chi nhánh') : null };
        await this.chiNhanh(auth,filter.chi_nhanh_id);
        return repo.danhSachGiaoDich(auth.donViId,filter);
    }
    async chiTietGiaoDich(auth,id) {
        await this.quyen(auth,'payments.read');
        const gd = await repo.layGiaoDich(auth.donViId,v.id(id,'Giao dịch'));
        if (!gd) throw v.loi('Không tìm thấy giao dịch',404,'PAYMENT_NOT_FOUND');
        return { ...gd,phan_bo: await repo.phanBoTheoGiaoDich(auth.donViId,gd.id) };
    }
    async xacNhanGiaoDich(auth,id,body,requestId) {
        const data = v.xacNhan(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.confirm',client);
            const gd = await repo.layGiaoDich(auth.donViId,v.id(id,'Giao dịch'),client,true);
            if (!gd) throw v.loi('Không tìm thấy giao dịch',404,'PAYMENT_NOT_FOUND');
            if (gd.trang_thai === 'THANH_CONG' || gd.trang_thai === 'THAT_BAI') return gd;
            if (gd.trang_thai !== 'CHO_XU_LY' || gd.du_lieu_yeu_cau?.loai_phuong_thuc === 'QR') throw v.loi('Không xác nhận thủ công QR hoặc giao dịch không chờ xử lý',409,'PAYMENT_NOT_CONFIRMABLE');
            if (gd.nguoi_thuc_hien_id === auth.taiKhoanId) throw v.loi('Người tạo giao dịch không tự xác nhận',403,'SELF_CONFIRMATION');
            if (gd.du_lieu_yeu_cau?.loai_phuong_thuc === 'CHUYEN_KHOAN' && data.ket_qua === 'THANH_CONG' && !data.ma_giao_dich_doi_tac) throw v.loi('Chuyển khoản thành công phải có mã tham chiếu ngân hàng');
            if (gd.loai_giao_dich === 'HOAN_TIEN' && gd.du_lieu_yeu_cau?.loai_phuong_thuc === 'TIEN_MAT' && data.ket_qua === 'THANH_CONG') {
                if (!data.ca_ban_hang_id) throw v.loi('Phải chọn ca bán hàng chi tiền hoàn');
                const ca = await repo.mot('SELECT id FROM ca_ban_hang WHERE don_vi_id = $1 AND id = $2 AND chi_nhanh_id = $3 AND thu_ngan_id = $4 AND trang_thai = \'DANG_MO\' FOR UPDATE',[auth.donViId,data.ca_ban_hang_id,gd.chi_nhanh_id,auth.taiKhoanId],client);
                if (!ca) throw v.loi('Ca hoàn tiền không thuộc thu ngân hoặc đã đóng',403,'INVALID_REFUND_SHIFT');
            }
            const phanHoi = { ket_qua_xac_minh: data.ket_qua,bang_chung: data.bang_chung,ghi_chu: data.ghi_chu,ca_ban_hang_id: data.ca_ban_hang_id,nguoi_xac_nhan_id: auth.taiKhoanId,ngay_xac_nhan: new Date().toISOString() };
            const daCapNhat = await repo.ghiKetQua(auth.donViId,gd.id,data.ket_qua === 'THAT_BAI' ? 'THAT_BAI' : 'CHO_XU_LY',data.ma_giao_dich_doi_tac,phanHoi,client);
            if (data.ket_qua === 'THAT_BAI') {
                if (gd.loai_giao_dich === 'HOAN_TIEN') await repo.chay('UPDATE yeu_cau_hoan_tien SET trang_thai = \'THAT_BAI\' WHERE don_vi_id = $1 AND giao_dich_hoan_id = $2 AND trang_thai = \'DANG_HOAN\'',[auth.donViId,gd.id],client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,'giao_dich_thanh_toan','payments.confirm.failed',requestId,data.bang_chung,client);
                return daCapNhat;
            }
            let result;
            if (gd.loai_giao_dich === 'HOAN_TIEN') {
                const yc = await repo.mot('SELECT * FROM yeu_cau_hoan_tien WHERE don_vi_id = $1 AND giao_dich_hoan_id = $2 FOR UPDATE',[auth.donViId,gd.id],client);
                if (!yc) throw v.loi('Không tìm thấy yêu cầu hoàn tiền',409,'REFUND_NOT_FOUND');
                result = await soCai.ghiSoHoan(auth.donViId,daCapNhat,yc,auth.taiKhoanId,client);
            } else result = await soCai.ghiSoGiaoDich(auth.donViId,daCapNhat,auth.taiKhoanId,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'giao_dich_thanh_toan','payments.confirm.success',requestId,data.bang_chung,client);
            return result;
        });
    }
    async taoYeuCauHoan(auth,body,requestId) {
        const data = v.yeuCauHoan(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.refund',client);
            const goc = await repo.layGiaoDich(auth.donViId,data.giao_dich_goc_id,client,true);
            if (!goc || goc.loai_giao_dich !== 'THU' || goc.trang_thai !== 'THANH_CONG') throw v.loi('Chỉ hoàn từ giao dịch thu đã thành công',409,'ORIGINAL_PAYMENT_INVALID');
            const loai = data.don_hang_id ? 'DON_HANG' : 'TIEN_COC';
            const target = data.don_hang_id ?? data.tien_coc_id;
            const phanBo = await repo.mot('SELECT COALESCE(SUM(so_tien),0)::numeric AS so_tien FROM phan_bo_thanh_toan WHERE don_vi_id = $1 AND giao_dich_id = $2 AND loai_doi_tuong = $3 AND doi_tuong_id = $4',[auth.donViId,goc.id,loai,target],client);
            if (soSanhTien(phanBo.so_tien,data.so_tien) < 0) throw v.loi('Yêu cầu hoàn vượt số tiền giao dịch gốc phân bổ cho đối tượng',409,'REFUND_ORIGIN_EXCEEDED');
            const targetRow = await repo.mot(`SELECT * FROM ${loai === 'DON_HANG' ? 'don_hang' : 'tien_coc'} WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,target],client);
            if (!targetRow) throw v.loi('Đối tượng hoàn không tồn tại',404,'REFUND_TARGET_NOT_FOUND');
            const reserved = await repo.mot(`SELECT COALESCE(SUM(so_tien),0)::numeric AS so_tien FROM yeu_cau_hoan_tien WHERE don_vi_id = $1 AND giao_dich_goc_id = $2 AND ${loai === 'DON_HANG' ? 'don_hang_id' : 'tien_coc_id'} = $3 AND trang_thai IN ('CHO_DUYET','DA_DUYET','DANG_HOAN','DA_HOAN')`,[auth.donViId,goc.id,target],client);
            if (soSanhTien(congTien(reserved.so_tien,data.so_tien),phanBo.so_tien) > 0) throw v.loi('Đã có yêu cầu hoàn làm vượt số tiền được hoàn',409,'REFUND_ALREADY_RESERVED');
            const tongReserved = await repo.mot(`SELECT COALESCE(SUM(so_tien),0)::numeric AS so_tien FROM yeu_cau_hoan_tien WHERE don_vi_id = $1 AND ${loai === 'DON_HANG' ? 'don_hang_id' : 'tien_coc_id'} = $2 AND trang_thai IN ('CHO_DUYET','DA_DUYET','DANG_HOAN')`,[auth.donViId,target],client);
            const available = loai === 'DON_HANG' ? truTien(targetRow.tien_da_thanh_toan,targetRow.tien_da_hoan) : soCai.duCoc(targetRow);
            if (soSanhTien(congTien(tongReserved.so_tien,data.so_tien),available) > 0) throw v.loi('Số dư khả dụng không đủ để giữ chỗ yêu cầu hoàn',409,'REFUND_BALANCE_EXCEEDED');
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.HOAN_TIEN);
            const yc = await repo.taoYeuCauHoan(auth.donViId,data,ma,auth.taiKhoanId,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'yeu_cau_hoan_tien','payments.refund.request',requestId,data.ly_do,client);
            return yc;
        });
    }
    async danhSachHoan(auth,query = {}) {
        await this.quyen(auth,'payments.refund');
        return repo.danhSachHoan(auth.donViId,{ ...v.trang(query),trang_thai: query.trang_thai ? v.enumValue(query.trang_thai,['CHO_DUYET','DA_DUYET','TU_CHOI','DANG_HOAN','DA_HOAN','THAT_BAI','DA_HUY'],'Trạng thái hoàn') : null });
    }
    async duyetHoan(auth,id,body,requestId) {
        const data = v.duyetHoan(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.refund.approve',client);
            const yc = await repo.layYeuCauHoan(auth.donViId,v.id(id,'Yêu cầu hoàn'),client,true);
            if (!yc) throw v.loi('Không tìm thấy yêu cầu hoàn',404,'REFUND_NOT_FOUND');
            if (yc.trang_thai !== 'CHO_DUYET') throw v.loi('Yêu cầu không còn chờ duyệt',409,'REFUND_NOT_PENDING');
            if (yc.nguoi_yeu_cau_id === auth.taiKhoanId) throw v.loi('Không được tự duyệt yêu cầu hoàn',403,'SELF_APPROVAL');
            if (!data.phe_duyet) {
                if (!data.ly_do) throw v.loi('Từ chối phải có lý do');
                const rejected = await repo.mot('UPDATE yeu_cau_hoan_tien SET trang_thai = \'TU_CHOI\',nguoi_duyet_id = $3,ngay_duyet = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,yc.id,auth.taiKhoanId],client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,'yeu_cau_hoan_tien','payments.refund.reject',requestId,data.ly_do,client);
                return rejected;
            }
            if (!data.phuong_thuc_id) throw v.loi('Phải chọn phương thức hoàn');
            const pt = await repo.layPhuongThuc(auth.donViId,data.phuong_thuc_id,client);
            if (!pt || !pt.hoat_dong || !['TIEN_MAT','CHUYEN_KHOAN'].includes(pt.loai)) throw v.loi('Chỉ hỗ trợ hoàn bằng tiền mặt hoặc chuyển khoản thủ công');
            const original = await repo.layGiaoDich(auth.donViId,yc.giao_dich_goc_id,client,true);
            if (!original || original.trang_thai !== 'THANH_CONG') throw v.loi('Giao dịch gốc không còn hợp lệ');
            if (pt.chi_nhanh_id && pt.chi_nhanh_id !== original.chi_nhanh_id) throw v.loi('Phương thức hoàn không thuộc chi nhánh giao dịch');
            if (pt.loai === 'CHUYEN_KHOAN' && (!data.nguoi_thu_huong?.so_tai_khoan || !data.nguoi_thu_huong?.ma_ngan_hang || !data.nguoi_thu_huong?.chu_tai_khoan)) throw v.loi('Hoàn chuyển khoản cần thông tin ngân hàng người nhận');
            const gd = await repo.taoGiaoDich(auth.donViId,{ chi_nhanh_id: original.chi_nhanh_id,khach_hang_id: original.khach_hang_id,phuong_thuc_id: pt.id,tai_khoan_nhan_id: null,loai_giao_dich: 'HOAN_TIEN',so_tien: yc.so_tien,trang_thai: 'CHO_XU_LY',khoa_chong_trung: `REFUND:${yc.id}`,noi_dung: yc.ly_do,du_lieu_yeu_cau: { yeu_cau_hoan_tien_id: yc.id,loai_phuong_thuc: pt.loai,nguoi_thu_huong: data.nguoi_thu_huong } },await taoMaChung(client,auth.donViId,TIEN_TO.GIAO_DICH),auth.taiKhoanId,client);
            const updated = await repo.mot('UPDATE yeu_cau_hoan_tien SET trang_thai = \'DANG_HOAN\',giao_dich_hoan_id = $3,nguoi_duyet_id = $4,ngay_duyet = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,yc.id,gd.id,auth.taiKhoanId],client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'yeu_cau_hoan_tien','payments.refund.approve',requestId,yc.ly_do,client);
            return { yeu_cau: updated,giao_dich_hoan: gd,ghi_chu: 'Đã duyệt; chỉ hạch toán sau khi xác nhận thực chi' };
        });
    }
    async taoDotDoiSoat(auth,body,requestId) {
        const data = v.dotDoiSoat(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.reconcile',client);
            if (data.tai_khoan_nhan_id && !await repo.layTaiKhoan(auth.donViId,data.tai_khoan_nhan_id,client)) throw v.loi('Tài khoản đối soát không hợp lệ');
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.DOI_SOAT);
            const dot = await repo.taoDotDoiSoat(auth.donViId,data,ma,auth.taiKhoanId,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'doi_soat_thanh_toan','payments.reconcile.create',requestId,null,client);
            return dot;
        });
    }
    async danhSachDot(auth,query = {}) {
        await this.quyen(auth,'payments.reconcile');
        const filter = v.trang(query);
        return repo.danhSachDot(auth.donViId,filter.limit,filter.offset);
    }
    async chiTietDot(auth,id) {
        await this.quyen(auth,'payments.reconcile');
        const dot = await repo.layDotDoiSoat(auth.donViId,v.id(id,'Đợt đối soát'));
        if (!dot) throw v.loi('Không tìm thấy đợt đối soát',404,'RECONCILIATION_NOT_FOUND');
        return { ...dot,chi_tiet: await repo.chiTietDot(auth.donViId,dot.id) };
    }
    async xuLyDoiSoat(auth,id,body,requestId) {
        const items = v.duLieuDoiSoat(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.reconcile',client);
            const dot = await repo.layDotDoiSoat(auth.donViId,v.id(id,'Đợt đối soát'),client,true);
            if (!dot || !['NHAP','CO_CHENH_LECH','DA_KHOP'].includes(dot.trang_thai)) throw v.loi('Đợt đối soát không thể xử lý',409,'RECONCILIATION_CLOSED');
            await repo.chay('DELETE FROM chi_tiet_doi_soat_thanh_toan WHERE don_vi_id = $1 AND doi_soat_id = $2',[auth.donViId,dot.id],client);
            const system = await repo.nhieu(`SELECT gd.id,gd.ma_giao_dich_doi_tac,gd.so_tien,gd.trang_thai FROM giao_dich_thanh_toan gd JOIN phuong_thuc_thanh_toan pt ON pt.don_vi_id = gd.don_vi_id AND pt.id = gd.phuong_thuc_id WHERE gd.don_vi_id = $1 AND (gd.ngay_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $2 AND $3 AND ($4::integer IS NULL OR gd.tai_khoan_nhan_id = $4) AND ($5::varchar IS NULL OR gd.du_lieu_yeu_cau->>'nha_cung_cap' = $5) AND pt.loai IN ('CHUYEN_KHOAN','QR') AND gd.loai_giao_dich = 'THU' AND gd.trang_thai IN ('THANH_CONG','THAT_BAI')`,[auth.donViId,dot.tu_ngay,dot.den_ngay,dot.tai_khoan_nhan_id,dot.nha_cung_cap],client);
            const byRef = new Map(system.filter(item => item.ma_giao_dich_doi_tac).map(item => [item.ma_giao_dich_doi_tac,item]));
            const reported = new Set();
            let totalSystem = '0';
            let totalPartner = '0';
            let mismatch = false;
            let rows = 0;
            for (const external of items) {
                const gd = byRef.get(external.ma_giao_dich_doi_tac);
                const ketQua = !gd ? 'THIEU_HE_THONG' : gd.trang_thai !== external.trang_thai ? 'SAI_TRANG_THAI' : soSanhTien(gd.so_tien,external.so_tien) !== 0 ? 'SAI_SO_TIEN' : 'KHOP';
                if (gd) reported.add(gd.id.toString());
                if (ketQua !== 'KHOP') mismatch = true;
                if (gd?.trang_thai === 'THANH_CONG') totalSystem = congTien(totalSystem,gd.so_tien);
                if (external.trang_thai === 'THANH_CONG') totalPartner = congTien(totalPartner,external.so_tien);
                await repo.chay('INSERT INTO chi_tiet_doi_soat_thanh_toan(don_vi_id,doi_soat_id,giao_dich_id,ma_giao_dich_doi_tac,so_tien_he_thong,so_tien_doi_tac,ket_qua) VALUES($1,$2,$3,$4,$5,$6,$7)',[auth.donViId,dot.id,gd?.id ?? null,external.ma_giao_dich_doi_tac,gd?.so_tien ?? null,external.so_tien,ketQua],client);
                rows++;
            }
            for (const gd of system) if (!reported.has(gd.id.toString())) {
                mismatch = true;
                if (gd.trang_thai === 'THANH_CONG') totalSystem = congTien(totalSystem,gd.so_tien);
                await repo.chay('INSERT INTO chi_tiet_doi_soat_thanh_toan(don_vi_id,doi_soat_id,giao_dich_id,ma_giao_dich_doi_tac,so_tien_he_thong,ket_qua) VALUES($1,$2,$3,$4,$5,\'THIEU_DOI_TAC\')',[auth.donViId,dot.id,gd.id,gd.ma_giao_dich_doi_tac,gd.so_tien],client);
                rows++;
            }
            const result = await repo.mot('UPDATE doi_soat_thanh_toan SET tong_so_giao_dich = $3,tong_tien_he_thong = $4,tong_tien_doi_tac = $5,chenh_lech = $6,trang_thai = $7 WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,dot.id,rows,totalSystem,totalPartner,truTien(totalPartner,totalSystem),mismatch ? 'CO_CHENH_LECH' : 'DA_KHOP'],client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'doi_soat_thanh_toan','payments.reconcile.process',requestId,`Dòng: ${rows}; lệch: ${mismatch}`,client);
            return result;
        });
    }
    async chotDot(auth,id,requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,'payments.reconcile',client);
            const dot = await repo.layDotDoiSoat(auth.donViId,v.id(id,'Đợt đối soát'),client,true);
            if (!dot || dot.trang_thai !== 'DA_KHOP') throw v.loi('Chỉ chốt đợt đã khớp',409,'RECONCILIATION_NOT_MATCHED');
            if (dot.nguoi_tao_id === auth.taiKhoanId) throw v.loi('Người tạo không tự chốt đối soát',403,'SELF_APPROVAL');
            const row = await repo.mot('UPDATE doi_soat_thanh_toan SET trang_thai = \'DA_CHOT\',nguoi_chot_id = $3,ngay_chot = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[auth.donViId,dot.id,auth.taiKhoanId],client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,'doi_soat_thanh_toan','payments.reconcile.close',requestId,null,client);
            return row;
        });
    }
    async webhookQR(nhaCungCap,headers,rawBody) {
        const event = await qrProvider.xacMinhSuKien({ nhaCungCap,headers,rawBody });
        if (!event || event.chu_ky_hop_le !== true) throw v.loi('Không xác minh được chữ ký sự kiện QR',403,'INVALID_BANK_SIGNATURE');
        throw v.loi('Chưa triển khai ánh xạ sự kiện đối tác; không được tự động ghi nhận giao dịch',503,'QR_WEBHOOK_NOT_MAPPED');
    }
}
module.exports = new ThanhToanService();