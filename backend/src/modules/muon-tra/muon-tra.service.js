const { trongGiaoDich } = require('../../database/transaction.js');
const { query } = require('../../database/query.js');
const { taoMaChung,TIEN_TO } = require('../../common/utils/ma-chung.js');
const { congTien,truTien,nhanTien,soSanhTien } = require('../../common/utils/tien.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const giuKho = require('../../common/utils/giu-cho-ton-kho.js');
const v = require('./muon-tra.validation.js');
const repo = require('./muon-tra.repository.js');
class MuonTraService {
    async quyen(auth,maQuyen) {
        if (!auth?.taiKhoanId) throw v.loi('Vui lòng đăng nhập',401,'UNAUTHORIZED');
        if (!auth.donViId) throw v.loi('Vui lòng chọn đơn vị',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,maQuyen,{})) throw v.loi('Không có quyền thực hiện thao tác',403,'FORBIDDEN');
    }
    async chiNhanh(auth,id) {
        if (id == null) return;
        if (auth.chiNhanhId && Number(auth.chiNhanhId) !== Number(id)) throw v.loi('Không có quyền thao tác chi nhánh này',403,'BRANCH_FORBIDDEN');
        const row = await query(`SELECT id FROM chi_nhanh WHERE don_vi_id = $1 AND id = $2 AND trang_thai <> 'NGUNG_HOAT_DONG'`,[auth.donViId,id]);
        if (!row.rows.length) throw v.loi('Không tìm thấy chi nhánh',404,'BRANCH_NOT_FOUND');
    }
    async khachHang(auth,id,client) {
        const row = await repo.mot(`SELECT id FROM khach_hang WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL`,[auth.donViId,id],client);
        if (!row) throw v.loi('Không tìm thấy khách hàng',404,'CUSTOMER_NOT_FOUND');
    }
    async danhSach(auth,queryString) {
        await this.quyen(auth,'books.read');
        const filter = v.boLoc(queryString);
        if (auth.chiNhanhId) filter.chi_nhanh_id = Number(auth.chiNhanhId);
        return repo.danhSach(auth.donViId,filter);
    }
    async chiTiet(auth,id) {
        await this.quyen(auth,'books.read');
        const phieu = await repo.lay(auth.donViId,v.idHopLe(id,'Phiếu mượn trả'));
        if (!phieu) throw v.loi('Không tìm thấy phiếu mượn trả',404,'LOAN_NOT_FOUND');
        return { muon_tra: phieu,chi_tiet: await repo.chiTiet(auth.donViId,phieu.id) };
    }
    async tao(auth,body,requestId) {
        const data = v.tao(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            await this.chiNhanh(auth,data.chi_nhanh_id);
            await this.khachHang(auth,data.khach_hang_id,client);
            if (data.don_hang_id) {
                const order = await repo.mot(`SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,data.don_hang_id],client);
                if (!order) throw v.loi('Không tìm thấy đơn hàng',404,'ORDER_NOT_FOUND');
                if (Number(order.khach_hang_id) !== Number(data.khach_hang_id)) throw v.loi('Đơn hàng không thuộc khách hàng',409,'ORDER_CUSTOMER_MISMATCH');
                if (data.loai === 'MUON' && !['MUON','HON_HOP'].includes(order.loai_don)) throw v.loi('Đơn hàng không có hình thức mượn',409,'ORDER_TYPE_INVALID');
                if (data.loai === 'THUE' && !['THUE','HON_HOP'].includes(order.loai_don)) throw v.loi('Đơn hàng không có hình thức thuê',409,'ORDER_TYPE_INVALID');
                data.chi_nhanh_id = order.chi_nhanh_id;
            }
            if (data.tien_coc_id) {
                const coc = await repo.mot(`SELECT * FROM tien_coc WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,data.tien_coc_id],client);
                if (!coc || Number(coc.khach_hang_id) !== Number(data.khach_hang_id)) throw v.loi('Tiền cọc không thuộc khách hàng',409,'DEPOSIT_MISMATCH');
                if (!['DA_THU','GIU_MOT_PHAN'].includes(coc.trang_thai)) throw v.loi('Tiền cọc chưa sẵn sàng sử dụng',409,'DEPOSIT_NOT_READY');
            }
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.MUON_TRA);
            const phieu = await repo.tao(auth.donViId,data,ma,auth.taiKhoanId,client);
            for (const item of data.chi_tiet) {
                const cuon = await repo.mot(`SELECT * FROM cuon_sach WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,item.cuon_sach_id],client);
                if (!cuon) throw v.loi(`Không tìm thấy cuốn sách ${item.cuon_sach_id}`,404,'COPY_NOT_FOUND');
                if (cuon.trang_thai !== 'SAN_SANG' && cuon.trang_thai !== 'DA_GIU') throw v.loi(`Cuốn ${cuon.ma_cuon} không sẵn sàng`,409,'COPY_NOT_AVAILABLE');
                if (cuon.trang_thai === 'DA_GIU') {
                    const hold = await repo.mot(`SELECT g.* FROM giu_cho_ton_kho g JOIN ton_kho t ON t.don_vi_id = g.don_vi_id AND t.id = g.ton_kho_id WHERE g.don_vi_id = $1 AND t.phien_ban_sach_id = $2 AND g.trang_thai = 'DANG_GIU' AND g.nguon_giu_cho IN ('MUON_SACH','THU_CONG') ORDER BY g.id LIMIT 1`,[auth.donViId,cuon.phien_ban_sach_id],client);
                    if (hold) await giuKho.giaiPhong(client,{ donViId: auth.donViId,giuChoId: hold.id,actorId: auth.taiKhoanId,lyDo: `Chuyển sang phiếu ${phieu.ma_phieu}` });
                }
                await repo.taoChiTiet(auth.donViId,phieu.id,item,client);
            }
            return { ...phieu,request_id: requestId };
        });
    }
    async giao(auth,id,body,requestId) {
        const data = v.giao(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const phieu = await repo.lay(auth.donViId,v.idHopLe(id,'Phiếu mượn trả'),client,true);
            if (!phieu) throw v.loi('Không tìm thấy phiếu',404,'LOAN_NOT_FOUND');
            if (!['NHAP','CHO_GIAO','DANG_GIAO'].includes(phieu.trang_thai)) throw v.loi('Phiếu không ở trạng thái có thể giao',409,'LOAN_STATUS_INVALID');
            const ids = new Set(data.chi_tiet.map(x => x.chi_tiet_muon_tra_id));
            const chiTiet = await repo.chiTiet(auth.donViId,phieu.id,client,true);
            if (!data.chi_tiet.every(x => chiTiet.some(c => Number(c.id) === Number(x.chi_tiet_muon_tra_id)))) throw v.loi('Có chi tiết giao không thuộc phiếu');
            const banGiao = await repo.mot(`INSERT INTO ban_giao_sach(don_vi_id,muon_tra_id,loai,nguoi_giao_id,ten_nguoi_nhan,chu_ky_nguoi_nhan,anh_bang_chung,ghi_chu) VALUES($1,$2,'GIAO',$3,$4,$5,$6,$7) RETURNING *`,[auth.donViId,phieu.id,auth.taiKhoanId,data.ten_nguoi_nhan,data.chu_ky_nguoi_nhan,JSON.stringify(data.anh_bang_chung),data.ghi_chu],client);
            for (const item of data.chi_tiet) {
                const detail = chiTiet.find(x => Number(x.id) === Number(item.chi_tiet_muon_tra_id));
                if (!['CHO_GIAO','DANG_GIAO'].includes(detail.trang_thai)) throw v.loi(`Cuốn ${detail.ma_cuon} không ở trạng thái giao`);
                const cuon = await repo.mot(`SELECT * FROM cuon_sach WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,detail.cuon_sach_id],client);
                if (!['SAN_SANG','DA_GIU'].includes(cuon.trang_thai)) throw v.loi(`Cuốn ${cuon.ma_cuon} không thể giao`);
                await repo.mot(`INSERT INTO chi_tiet_ban_giao_sach(don_vi_id,ban_giao_id,chi_tiet_muon_tra_id,tinh_trang,mo_ta,anh_bang_chung) VALUES($1,$2,$3,$4,$5,$6)`,[auth.donViId,banGiao.id,detail.id,item.tinh_trang,item.mo_ta,JSON.stringify(item.anh_bang_chung)],client);
                await repo.mot(`UPDATE chi_tiet_muon_tra SET tinh_trang_luc_giao = $3,mo_ta_luc_giao = $4,ngay_giao = now(),trang_thai = 'DANG_MUON',ngay_hen_tra = COALESCE(ngay_hen_tra,$5) WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,detail.id,item.tinh_trang, item.mo_ta,phieu.ngay_hen_tra],client);
                await repo.mot(`UPDATE cuon_sach SET trang_thai = $3,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,detail.cuon_sach_id,phieu.loai === 'THUE' ? 'DANG_THUE' : 'DANG_MUON'],client);
            }
            const remain = await repo.mot(`SELECT count(*)::integer AS n FROM chi_tiet_muon_tra WHERE don_vi_id = $1 AND muon_tra_id = $2 AND trang_thai NOT IN ('DA_TRA','DA_HUY')`,[auth.donViId,phieu.id],client);
            const delivered = await repo.mot(`SELECT count(*)::integer AS n FROM chi_tiet_muon_tra WHERE don_vi_id = $1 AND muon_tra_id = $2 AND ngay_giao IS NOT NULL`,[auth.donViId,phieu.id],client);
            const trangThai = Number(remain.n) === 0 ? 'DA_TRA' : Number(delivered.n) > 0 ? 'DANG_MUON' : 'DANG_GIAO';
            const updated = await repo.mot(`UPDATE muon_tra SET trang_thai = $3,ngay_bat_dau = COALESCE(ngay_bat_dau,now()),nguoi_giao_id = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,phieu.id,trangThai,auth.taiKhoanId],client);
            return { muon_tra: updated,ban_giao: banGiao,request_id: requestId };
        });
    }
    async tra(auth,id,body,requestId) {
        const data = v.tra(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'loans.return');
            const phieu = await repo.lay(auth.donViId,v.idHopLe(id,'Phiếu mượn trả'),client,true);
            if (!phieu) throw v.loi('Không tìm thấy phiếu',404,'LOAN_NOT_FOUND');
            if (['DA_TRA','DA_HUY'].includes(phieu.trang_thai)) throw v.loi('Phiếu đã kết thúc',409,'LOAN_CLOSED');
            const chiTiet = await repo.chiTiet(auth.donViId,phieu.id,client,true);
            const banGiao = await repo.mot(`INSERT INTO ban_giao_sach(don_vi_id,muon_tra_id,loai,nguoi_giao_id,ten_nguoi_nhan,chu_ky_nguoi_nhan,anh_bang_chung,ghi_chu) VALUES($1,$2,'NHAN_TRA',$3,$4,$5,$6,$7) RETURNING *`,[auth.donViId,phieu.id,auth.taiKhoanId,data.ten_nguoi_nhan,data.chu_ky_nguoi_nhan,JSON.stringify(data.anh_bang_chung),data.ghi_chu],client);
            const returned = [];
            for (const item of data.chi_tiet) {
                const detail = chiTiet.find(x => Number(x.id) === Number(item.chi_tiet_muon_tra_id));
                if (!detail) throw v.loi(`Chi tiết ${item.chi_tiet_muon_tra_id} không thuộc phiếu`,409,'DETAIL_MISMATCH');
                if (!['DANG_MUON','QUA_HAN','DANG_GIAO'].includes(detail.trang_thai)) throw v.loi(`Cuốn ${detail.ma_cuon} không ở trạng thái có thể trả`,409,'DETAIL_STATUS_INVALID');
                const cuon = await repo.mot(`SELECT * FROM cuon_sach WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,detail.cuon_sach_id],client);
                await repo.mot(`INSERT INTO chi_tiet_ban_giao_sach(don_vi_id,ban_giao_id,chi_tiet_muon_tra_id,tinh_trang,mo_ta,anh_bang_chung) VALUES($1,$2,$3,$4,$5,$6)`,[auth.donViId,banGiao.id,detail.id,item.tinh_trang,item.mo_ta,JSON.stringify(item.anh_bang_chung)],client);
                const trangThaiCuon = item.tinh_trang === 'MAT' ? 'MAT' : ['HU_HONG_NHE','HU_HONG_NANG'].includes(item.tinh_trang) ? 'BAO_TRI' : 'SAN_SANG';
                const trangThaiDetail = item.tinh_trang === 'MAT' ? 'MAT' : ['HU_HONG_NHE','HU_HONG_NANG'].includes(item.tinh_trang) ? 'HU_HONG' : 'DA_TRA';
                await repo.mot(`UPDATE chi_tiet_muon_tra SET tinh_trang_luc_tra = $3,mo_ta_luc_tra = $4,ngay_tra = now(),trang_thai = $5 WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,detail.id,item.tinh_trang,item.mo_ta,trangThaiDetail],client);
                await repo.mot(`UPDATE cuon_sach SET trang_thai = $3,tinh_trang = $4,mo_ta_tinh_trang = $5,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,detail.cuon_sach_id,trangThaiCuon,item.tinh_trang,item.mo_ta],client);
                await this.taoPhiPhatChoTra(client,auth,phieu,detail,item,requestId);
                returned.push({ chi_tiet_muon_tra_id: detail.id,cuon_sach_id: detail.cuon_sach_id,trang_thai: trangThaiDetail });
            }
            const remain = await repo.mot(`SELECT count(*)::integer AS n FROM chi_tiet_muon_tra WHERE don_vi_id = $1 AND muon_tra_id = $2 AND trang_thai NOT IN ('DA_TRA','MAT','HU_HONG','DA_HUY')`,[auth.donViId,phieu.id],client);
            const hasOverdue = await repo.mot(`SELECT count(*)::integer AS n FROM chi_tiet_muon_tra WHERE don_vi_id = $1 AND muon_tra_id = $2 AND trang_thai = 'QUA_HAN'`,[auth.donViId,phieu.id],client);
            const status = Number(remain.n) === 0 ? 'DA_TRA' : Number(hasOverdue.n) > 0 ? 'QUA_HAN' : 'TRA_MOT_PHAN';
            const updated = await repo.mot(`UPDATE muon_tra SET trang_thai = $3,ngay_tra_het = CASE WHEN $3 = 'DA_TRA' THEN now() ELSE ngay_tra_het END,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,phieu.id,status],client);
            return { muon_tra: updated,ban_giao: banGiao,chi_tiet_tra: returned,request_id: requestId };
        });
    }
    async taoPhiPhatChoTra(client,auth,phieu,detail,item,requestId) {
        const now = new Date();
        const due = detail.ngay_hen_tra ? new Date(detail.ngay_hen_tra) : null;
        let ngayQuaHan = 0;
        if (due && now > due) ngayQuaHan = Math.ceil((now.getTime() - due.getTime()) / 86400000);
        if (ngayQuaHan > 0) await this.taoPhiPhat(client,auth,detail,'QUA_HAN',ngayQuaHan,requestId);
        if (item.tinh_trang === 'MAT') await this.taoPhiPhat(client,auth,detail,'MAT_SACH',0,requestId);
        if (['HU_HONG_NHE','HU_HONG_NANG'].includes(item.tinh_trang)) await this.taoPhiPhat(client,auth,detail,'HU_HONG',0,requestId);
    }
    async taoPhiPhat(client,auth,detail,loai,soNgay,requestId) {
        const context = await repo.mot(`SELECT c.*,m.khach_hang_id FROM chi_tiet_muon_tra c JOIN muon_tra m ON m.don_vi_id = c.don_vi_id AND m.id = c.muon_tra_id WHERE c.don_vi_id = $1 AND c.id = $2`,[auth.donViId,detail.id],client);
        const cuon = await repo.mot(`SELECT gia_tri_sach,phien_ban_sach_id FROM cuon_sach WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,detail.cuon_sach_id],client);
        if (!context || !cuon) return null;
        const policy = await repo.mot(`SELECT * FROM chinh_sach_phi_phat WHERE don_vi_id = $1 AND (chi_nhanh_id IS NULL OR chi_nhanh_id = $2) AND loai = $3 AND hoat_dong = true AND hieu_luc_tu <= now() AND (hieu_luc_den IS NULL OR hieu_luc_den > now()) ORDER BY CASE WHEN chi_nhanh_id = $2 THEN 0 ELSE 1 END,hieu_luc_tu DESC,id DESC LIMIT 1`,[auth.donViId,auth.chiNhanhId ?? null,loai],client);
        if (!policy) return null;
        const ngayTinhPhi = Math.max(0,soNgay - Number(policy.so_ngay_mien_phi));
        let soTien = '0';
        if (policy.cach_tinh === 'CO_DINH') soTien = String(policy.gia_tri);
        if (policy.cach_tinh === 'THEO_NGAY') soTien = nhanTien(String(policy.gia_tri),String(ngayTinhPhi));
        if (policy.cach_tinh === 'PHAN_TRAM_GIA_TRI') soTien = nhanTien(String(cuon.gia_tri_sach),String(Number(policy.gia_tri) / 100));
        if (policy.cach_tinh === 'THEO_THUC_TE') soTien = String(cuon.gia_tri_sach);
        if (policy.muc_toi_da != null && soSanhTien(soTien,String(policy.muc_toi_da)) > 0) soTien = String(policy.muc_toi_da);
        if (soSanhTien(soTien,'0') <= 0) return null;
        const ma = await taoMaChung(client,auth.donViId,TIEN_TO.PHI_PHAT);
        const phat = await repo.mot(`INSERT INTO phi_phat(don_vi_id,khach_hang_id,chi_tiet_muon_tra_id,chinh_sach_id,ma_phieu,loai,so_ngay_qua_han,gia_tri_sach,so_tien_goc,so_tien_mien_giam,so_tien_phai_thu,so_tien_da_thu,trang_thai,ly_do,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$9,0,'CHO_XAC_NHAN',$10,$11) RETURNING *`,[auth.donViId,context.khach_hang_id,detail.id,policy.id,ma,loai,soNgay,cuon.gia_tri_sach,soTien,`Phát sinh ${loai} cho cuốn ${detail.cuon_sach_id}; request ${requestId}`,auth.taiKhoanId],client);
        await repo.mot(`INSERT INTO lich_su_phi_phat(don_vi_id,phi_phat_id,hanh_dong,so_tien_truoc,so_tien_sau,ly_do,nguoi_thuc_hien_id) VALUES($1,$2,'TAO',0,$3,$4,$5)`,[auth.donViId,phat.id,soTien,`Phát sinh ${loai}`,auth.taiKhoanId],client);
        return phat;
    }
    async danhDauQuaHan(auth,requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,'loans.return');
            const rows = await repo.nhieu(`SELECT c.id,c.muon_tra_id,c.ngay_hen_tra FROM chi_tiet_muon_tra c WHERE c.don_vi_id = $1 AND c.trang_thai = 'DANG_MUON' AND c.ngay_hen_tra IS NOT NULL AND c.ngay_hen_tra < now() ORDER BY c.ngay_hen_tra FOR UPDATE SKIP LOCKED`,[auth.donViId],client);
            const result = [];
            for (const item of rows) {
                await repo.mot(`UPDATE chi_tiet_muon_tra SET trang_thai = 'QUA_HAN' WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,item.id],client);
                await repo.mot(`UPDATE muon_tra SET trang_thai = 'QUA_HAN',ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 AND trang_thai IN ('DANG_MUON','TRA_MOT_PHAN')`,[auth.donViId,item.muon_tra_id],client);
                result.push(item.id);
            }
            return { so_chi_tiet: result.length,chi_tiet_id: result,request_id: requestId };
        });
    }
    async taoYeuCauGiaHan(auth,id,body,requestId) {
        const data = v.giaHan(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const phieu = await repo.lay(auth.donViId,v.idHopLe(id,'Phiếu mượn trả'),client,true);
            if (!phieu) throw v.loi('Không tìm thấy phiếu',404,'LOAN_NOT_FOUND');
            if (['DA_TRA','DA_HUY'].includes(phieu.trang_thai)) throw v.loi('Phiếu đã kết thúc',409,'LOAN_CLOSED');
            const chiTiet = await repo.chiTiet(auth.donViId,phieu.id,client,true);
            const selected = [];
            for (const idChiTiet of data.chi_tiet) {
                const item = chiTiet.find(x => Number(x.id) === Number(idChiTiet));
                if (!item) throw v.loi('Chi tiết gia hạn không thuộc phiếu',409,'DETAIL_MISMATCH');
                if (!['DANG_MUON','QUA_HAN'].includes(item.trang_thai)) throw v.loi(`Cuốn ${item.ma_cuon} không thể gia hạn`,409,'EXTENSION_INVALID');
                const oldDate = item.ngay_hen_tra;
                if (!oldDate || new Date(data.ngay_hen_tra_moi) <= new Date(oldDate)) throw v.loi('Ngày gia hạn phải sau hạn hiện tại',409,'EXTENSION_DATE_INVALID');
                const existed = await repo.mot(`SELECT id FROM chi_tiet_gia_han cg JOIN yeu_cau_gia_han yg ON yg.don_vi_id = cg.don_vi_id AND yg.id = cg.yeu_cau_gia_han_id WHERE cg.don_vi_id = $1 AND cg.chi_tiet_muon_tra_id = $2 AND yg.trang_thai = 'CHO_DUYET' LIMIT 1`,[auth.donViId,item.id],client);
                if (existed) throw v.loi('Cuốn sách đã có yêu cầu gia hạn chờ duyệt',409,'EXTENSION_PENDING');
                selected.push(item);
            }
            const firstOld = selected[0].ngay_hen_tra;
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.GIA_HAN);
            const req = await repo.mot(`INSERT INTO yeu_cau_gia_han(don_vi_id,muon_tra_id,ma_yeu_cau,ngay_hen_tra_cu,ngay_hen_tra_moi,ly_do,nguoi_yeu_cau_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[auth.donViId,phieu.id,ma,firstOld,data.ngay_hen_tra_moi,data.ly_do,auth.taiKhoanId],client);
            for (const item of selected) {
                await repo.mot(`INSERT INTO chi_tiet_gia_han(don_vi_id,yeu_cau_gia_han_id,chi_tiet_muon_tra_id,ngay_hen_tra_cu,ngay_hen_tra_moi,phi_gia_han) VALUES($1,$2,$3,$4,$5,0)`,[auth.donViId,req.id,item.id,item.ngay_hen_tra,data.ngay_hen_tra_moi],client);
            }
            return { yeu_cau: req,request_id: requestId };
        });
    }
    async duyetGiaHan(auth,id,body,requestId) {
        const data = v.duyetGiaHan(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const req = await repo.mot(`SELECT * FROM yeu_cau_gia_han WHERE don_vi_id = $1 AND id = $2 FOR UPDATE`,[auth.donViId,v.idHopLe(id,'Yêu cầu gia hạn')],client);
            if (!req) throw v.loi('Không tìm thấy yêu cầu gia hạn',404,'EXTENSION_NOT_FOUND');
            if (req.trang_thai !== 'CHO_DUYET') throw v.loi('Yêu cầu đã được xử lý',409,'EXTENSION_CLOSED');
            const items = await repo.nhieu(`SELECT c.*,m.khach_hang_id FROM chi_tiet_gia_han c JOIN chi_tiet_muon_tra d ON d.don_vi_id = c.don_vi_id AND d.id = c.chi_tiet_muon_tra_id JOIN muon_tra m ON m.don_vi_id = d.don_vi_id AND m.id = d.muon_tra_id WHERE c.don_vi_id = $1 AND c.yeu_cau_gia_han_id = $2 FOR UPDATE`,[auth.donViId,req.id],client);
            if (!items.length) throw v.loi('Yêu cầu không có chi tiết',409,'EXTENSION_EMPTY');
            if (!data.duyet) {
                const updated = await repo.mot(`UPDATE yeu_cau_gia_han SET trang_thai = 'TU_CHOI',nguoi_duyet_id = $3,ly_do_tu_choi = $4,ngay_duyet = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,req.id,auth.taiKhoanId,data.ly_do],client);
                return { yeu_cau: updated,request_id: requestId };
            }
            const policy = await repo.mot(`SELECT * FROM chinh_sach_phi_phat WHERE don_vi_id = $1 AND (chi_nhanh_id IS NULL OR chi_nhanh_id = $2) AND loai = 'QUA_HAN' AND hoat_dong = true AND hieu_luc_tu <= now() AND (hieu_luc_den IS NULL OR hieu_luc_den > now()) ORDER BY CASE WHEN chi_nhanh_id = $2 THEN 0 ELSE 1 END,hieu_luc_tu DESC,id DESC LIMIT 1`,[auth.donViId,auth.chiNhanhId ?? null],client);
            for (const item of items) {
                let phi = '0';
                if (policy && policy.cach_tinh === 'CO_DINH') phi = String(policy.gia_tri);
                if (policy && policy.cach_tinh === 'THEO_NGAY') phi = String(policy.gia_tri);
                if (policy && policy.muc_toi_da != null && soSanhTien(phi,String(policy.muc_toi_da)) > 0) phi = String(policy.muc_toi_da);
                await repo.mot(`UPDATE chi_tiet_gia_han SET phi_gia_han = $3 WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,item.id,phi],client);
                await repo.mot(`UPDATE chi_tiet_muon_tra SET ngay_hen_tra = $3,so_lan_gia_han = so_lan_gia_han + 1,trang_thai = CASE WHEN trang_thai = 'QUA_HAN' THEN 'DANG_MUON' ELSE trang_thai END WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,item.chi_tiet_muon_tra_id,req.ngay_hen_tra_moi],client);
            }
            const updated = await repo.mot(`UPDATE yeu_cau_gia_han SET trang_thai = 'DA_DUYET',nguoi_duyet_id = $3,ngay_duyet = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[auth.donViId,req.id,auth.taiKhoanId],client);
            return { yeu_cau: updated,chi_tiet: items,request_id: requestId };
        });
    }
    async danhSachGiaHan(auth,muonTraId) {
        await this.quyen(auth,'books.read');
        const id = v.idHopLe(muonTraId,'Phiếu mượn trả');
        return repo.nhieu(`SELECT y.*,COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL),'[]'::jsonb) AS chi_tiet FROM yeu_cau_gia_han y LEFT JOIN chi_tiet_gia_han c ON c.don_vi_id = y.don_vi_id AND c.yeu_cau_gia_han_id = y.id WHERE y.don_vi_id = $1 AND y.muon_tra_id = $2 GROUP BY y.id ORDER BY y.ngay_tao DESC,y.id DESC`,[auth.donViId,id]);
    }
    async taoPhieuPhat(auth,id,body,requestId) {
        const { loai,chi_tiet_muon_tra_id,ly_do,so_tien } = body;
        if (!['QUA_HAN','MAT_SACH','HU_HONG','KHAC'].includes(loai)) throw v.loi('Loại phạt không hợp lệ');
        const detailId = v.idHopLe(chi_tiet_muon_tra_id,'Chi tiết mượn trả');
        return trongGiaoDich(async client => {
            await this.quyen(auth,'books.create');
            const detail = await repo.mot(`SELECT c.*,m.khach_hang_id FROM chi_tiet_muon_tra c JOIN muon_tra m ON m.don_vi_id = c.don_vi_id AND m.id = c.muon_tra_id WHERE c.don_vi_id = $1 AND c.id = $2 FOR UPDATE`,[auth.donViId,detailId],client);
            if (!detail) throw v.loi('Không tìm thấy chi tiết',404,'DETAIL_NOT_FOUND');
            const cuon = await repo.mot(`SELECT gia_tri_sach FROM cuon_sach WHERE don_vi_id = $1 AND id = $2`,[auth.donViId,detail.cuon_sach_id],client);
            const amount = so_tien == null ? String(cuon.gia_tri_sach) : String(v.tao({ khach_hang_id: detail.khach_hang_id,loai: 'MUON',chi_tiet: [{ cuon_sach_id: detail.cuon_sach_id,phi_thue: so_tien }] }).chi_tiet[0].phi_thue);
            const ma = await taoMaChung(client,auth.donViId,TIEN_TO.PHI_PHAT);
            const phat = await repo.mot(`INSERT INTO phi_phat(don_vi_id,khach_hang_id,chi_tiet_muon_tra_id,ma_phieu,loai,gia_tri_sach,so_tien_goc,so_tien_mien_giam,so_tien_phai_thu,so_tien_da_thu,trang_thai,ly_do,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,0,$7,0,'CHO_XAC_NHAN',$8,$9) RETURNING *`,[auth.donViId,detail.khach_hang_id,detail.id,ma,loai,cuon.gia_tri_sach,amount,ly_do ?? null,auth.taiKhoanId],client);
            await repo.mot(`INSERT INTO lich_su_phi_phat(don_vi_id,phi_phat_id,hanh_dong,so_tien_truoc,so_tien_sau,ly_do,nguoi_thuc_hien_id) VALUES($1,$2,'TAO',0,$3,$4,$5)`,[auth.donViId,phat.id,amount,ly_do ?? null,auth.taiKhoanId],client);
            return { phi_phat: phat,request_id: requestId };
        });
    }
}
module.exports = new MuonTraService();