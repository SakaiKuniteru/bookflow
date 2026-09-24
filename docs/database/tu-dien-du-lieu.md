# BOOKFLOW AI — TỪ ĐIỂN DỮ LIỆU VÀ THỨ TỰ TRIỂN KHAI

**Bản thiết kế:** v1.0 · **Cơ sở dữ liệu:** PostgreSQL · **Tên bảng/cột:** tiếng Việt không dấu, `snake_case` · **Phạm vi:** bán sách, mượn miễn phí, cho thuê có phí, hội viên, nhiều chi nhánh, AI và SaaS.

**Tình trạng:** TÀI LIỆU THIẾT KẾ, không phải SQL migration đã kiểm thử. Đây là thiết kế chi tiết cho phạm vi đã thống nhất; không có một bộ cột cố định nào bảo đảm bao trùm mọi yêu cầu tương lai. Trước production cần chốt quy định pháp lý, chính sách kế toán/thuế, đơn vị thanh toán, quy trình bảo vệ dữ liệu và trường hợp thực tế của khách hàng.

## Cách đọc và những quyết định bắt buộc

- Mỗi bảng được liệt kê theo **thứ tự ưu tiên triển khai nghiệp vụ**. Những FK trỏ đến bảng ở giai đoạn sau có thể tạo bằng migration bổ sung khi bảng đích đã sẵn sàng.
- `NN` = NOT NULL; `NULL` = cho phép để trống; `PK` = khóa chính; `FK` = khóa ngoại; `UNIQUE` = không trùng; `CHECK` = điều kiện dữ liệu; `DEFAULT` = giá trị mặc định. UUID cần `gen_random_uuid()`/extension phù hợp.
- Tất cả giá trị tiền sử dụng `NUMERIC(18,2)` trừ chi phí AI cần độ chính xác cao hơn. Mỗi khoản tiền có mã tiền tệ trong giao dịch cha hoặc bản ghi tương ứng. Không dùng FLOAT cho tiền.
- `TIMESTAMPTZ` lưu thời điểm chuẩn UTC; khi hiển thị dùng múi giờ của `don_vi`/chi nhánh. Không dùng `DATE` cho thời điểm bàn giao thực tế.
- `don_vi_id` là khóa phân vùng SaaS. Cần FK tổng hợp hoặc RLS ở PostgreSQL kết hợp kiểm tra quyền API để chống tham chiếu chéo tổ chức; không chỉ dựa vào sidebar FE.
- Các bảng `append-only` (lịch sử/so cái) chỉ thêm bản ghi, không sửa đè hoặc xóa; hủy/đảo bằng giao dịch bù có dấu vết.
- `ton_kho_ban`, tổng tiền đã thu và trạng thái thanh toán có thể là read-model tăng tốc; phải được đối chiếu với biến động/giao dịch gốc và cập nhật nhất quán trong transaction.
- `chinh_sach_ap_dung`, giá bán, quyền lợi hội viên, địa chỉ giao hàng và thông tin sản phẩm trên đơn cần chụp lại tại lúc xác nhận. Không dùng cấu hình hiện tại để tính lại lịch sử.
- Không lưu OTP, access token, API key, thông tin thẻ hay dữ liệu cá nhân không cần thiết ở dạng rõ. File private được trả qua URL có thời hạn sau khi xác minh quyền.
- Nội dung AI chỉ lập chỉ mục khi có quyền sử dụng; RAG lọc ACL trước khi truy vấn và kiểm tra dữ liệu nguồn. Không tự cho phép AI sửa tồn kho, thu tiền hay phê duyệt.

## Số lượng và phạm vi

| Chỉ tiêu | Giá trị |
|---|---:|
| Bảng đã thống nhất từ bản trước | 51 |
| Tổng bảng trong tài liệu chi tiết | 99 |
| Tổng trường đã mô tả (kể cả trường chung) | 1598 |
| Nhóm triển khai | 11 |

### Phạm vi chưa tự động được coi là hoàn chỉnh pháp lý

Các nghiệp vụ hóa đơn điện tử, thuế, bảo vệ thông tin cá nhân, nội dung sách điện tử có bản quyền, tích hợp vận chuyển và quy trình thanh toán ngoài hệ thống phải được xác minh theo sản phẩm và thị trường triển khai. Tài liệu giữ các trường tham chiếu cần thiết nhưng không tuyên bố mọi quy định đã được đáp ứng.

## Mục lục nhóm / thứ tự tạo bảng

- **01. Nen tang SaaS, tai khoan va phan quyen** — Giai doan 1 — tao to chuc, tai khoan, xac thuc va kiem soat truy cap (12 bảng)
- **02. Danh muc sach, phien ban va hinh thuc cung cap** — Giai doan 2 — co du danh muc de ban, muon, tim kiem va AI (12 bảng)
- **03. Nha cung cap, nhap sach va kho** — Giai doan 3 — nhap sach, ton kho ban, cuon sach muon va doi soat (14 bảng)
- **04. Khach hang, nhom khach va hoi vien** — Giai doan 4 — ho so nguoi mua/nguoi muon va cac quyen loi (9 bảng)
- **05. Gio hang, ban sach, giao hang va doi tra** — Giai doan 5 — POS, website va don ban co the thanh toan (12 bảng)
- **06. Chinh sach muon, dat truoc, muon/tra/gia han** — Giai doan 6 — ba mo hinh muon dung chung cung kho (12 bảng)
- **07. Tai chinh, thanh toan, cong no va tien coc** — Giai doan 7 — thong nhat so tien phai thu va giao dich thu/hoan (9 bảng)
- **08. Thong bao va kenh gui** — Giai doan 8 — email/thong bao m uon-tra-don-hang-hoi-vien (3 bảng)
- **09. AI va tim kiem ngu nghia** — Giai doan 9 — AI doc metadata duoc cap phep; khong tu sua nghiep vu (6 bảng)
- **10. Goi dich vu va thanh toan SaaS** — Giai doan 10 — thu phi don vi su dung BookFlow (5 bảng)
- **11. Tep dinh kem, cau hinh, job va kiem toan** — Giai doan xuyen suot — ha tang chung va giam sat an toan (5 bảng)

## Danh sách bảng theo thứ tự xử lý

| STT | Bảng | Nhóm | Ý nghĩa |
|---:|---|---|---|
| 1 | `don_vi` | 01 | Don vi thue phan mem BookFlow; khoi tao khong gian du lieu va cau hinh co ban |
| 2 | `chi_nhanh` | 01 | Dia diem kinh doanh/thu vien thuoc mot don vi |
| 3 | `tai_khoan` | 01 | Danh tinh dang nhap dung chung, co the thuoc nhieu don vi |
| 4 | `phien_dang_nhap` | 01 | Phien dang nhap, thu hoi token va quan ly thiet bi |
| 5 | `ma_xac_minh` | 01 | Ma xac minh email, dat lai mat khau, xac minh dien thoai |
| 6 | `thanh_vien_don_vi` | 01 | Tai khoan nhan vien tham gia mot don vi |
| 7 | `thanh_vien_chi_nhanh` | 01 | Pham vi chi nhanh cua nhan vien |
| 8 | `vai_tro` | 01 | Nhom quyen cau hinh theo tung don vi |
| 9 | `quyen` | 01 | Danh muc ma quyen dung chung toan nen tang |
| 10 | `vai_tro_quyen` | 01 | Bang noi vai tro va quyen |
| 11 | `thanh_vien_vai_tro` | 01 | Gan vai tro cho thanh vien; co the gioi han theo chi nhanh |
| 12 | `nhat_ky_dang_nhap` | 01 | Lich su bao mat va lan dang nhap khong thanh cong |
| 13 | `dau_sach` | 02 | Thong tin tac pham/de muc sach do don vi quan ly |
| 14 | `phien_ban_sach` | 02 | An ban co ISBN/ngon ngu/dinh dang va thong so rieng |
| 15 | `tac_gia` | 02 | Ho so tac gia/bien dich/bien soan |
| 16 | `dau_sach_tac_gia` | 02 | Gan tac gia va vai tro dong gop cho dau sach |
| 17 | `nha_xuat_ban` | 02 | Nha xuat ban cua tung phien ban sach |
| 18 | `the_loai_sach` | 02 | Cay the loai/danh muc hien thi |
| 19 | `dau_sach_the_loai` | 02 | Gan dau sach vao nhieu the loai |
| 20 | `tu_khoa_sach` | 02 | Tu khoa tim kiem va bo loc |
| 21 | `dau_sach_tu_khoa` | 02 | Lien ket dau sach va tu khoa |
| 22 | `tep_sach` | 02 | Anh bia, anh minh hoa va tep phu tro cho sach |
| 23 | `hinh_thuc_kinh_doanh_sach` | 02 | Mot phien ban tai chi nhanh co the ban, muon mien phi hoac cho thue |
| 24 | `bang_gia_sach` | 02 | Gia ban niêm yet theo offering va khoang thoi gian |
| 25 | `nha_cung_cap` | 03 | Doi tac ban/bang giao sach cho don vi |
| 26 | `kho` | 03 | Kho vat ly tai chi nhanh, co the la kho ban hoac kho muon |
| 27 | `vi_tri_kho` | 03 | Khu, ke, ngan trong mot kho |
| 28 | `phieu_nhap_sach` | 03 | Chung tu nhap sach tu nha cung cap, tang sach hoac dieu chinh |
| 29 | `chi_tiet_phieu_nhap` | 03 | Chi tiet tung phien ban va muc dich nhap tren phieu |
| 30 | `lo_nhap_sach` | 03 | Lo gia von nhap kho ban, ho tro FIFO/kiem ke |
| 31 | `ton_kho_ban` | 03 | So du ton ban theo phien ban va kho; la read-model duoc doi chieu bien dong |
| 32 | `ban_sao_sach` | 03 | Tung cuon sach vat ly co ma rieng, dung cho muon/thue va ban sach cu neu duoc chuyen |
| 33 | `lich_su_tinh_trang_sach` | 03 | Nhat ky kiem tra, hu hong, bao tri tung ban sach |
| 34 | `bien_dong_kho` | 03 | So cai nhap/xuat/chuyen/giu/tra kho co the doi soat |
| 35 | `phieu_chuyen_kho` | 03 | Chung tu dieu chuyen sach giua kho/chi nhanh |
| 36 | `chi_tiet_chuyen_kho` | 03 | Tung phien ban/ban sao tren phieu chuyen |
| 37 | `phieu_kiem_ke` | 03 | Dot kiem ke kho co chot so du truoc va sau |
| 38 | `chi_tiet_kiem_ke` | 03 | So sach tren so va so sach thuc te theo an ban/cu on |
| 39 | `khach_hang` | 04 | Ho so khach mua, doc gia va khach tai quay |
| 40 | `dia_chi_khach_hang` | 04 | Nhieu dia chi giao sach/lien he cua khach |
| 41 | `nhom_khach_hang` | 04 | Phan nhom khach de ap dung gia va chinh sach |
| 42 | `khach_hang_nhom` | 04 | Gan khach vao nhieu nhom theo thoi han |
| 43 | `goi_hoi_vien` | 04 | Goi doc gia do tung don vi ban/cap mien phi |
| 44 | `quyen_loi_hoi_vien` | 04 | Moi dong mot quyen loi/rang buoc cua goi |
| 45 | `hoi_vien_khach_hang` | 04 | Moi lan dang ky/mua goi cua khach |
| 46 | `lich_su_su_dung_quyen_loi` | 04 | Da tru va hoan lai quyen loi hoi vien theo giao dich |
| 47 | `lich_su_hoi_vien` | 04 | Lich su gia han, dong/m o, doi goi va huy hoi vien |
| 48 | `gio_hang` | 05 | Gio mua sach truc tuyen chua chot don |
| 49 | `chi_tiet_gio_hang` | 05 | Dong sach nguoi dung dua vao gio |
| 50 | `don_ban_sach` | 05 | Don ban tai quay/online, thong tin gia va giao nhan da chot |
| 51 | `chi_tiet_don_ban` | 05 | Snapshot tung phien ban, gia va thue tren don ban |
| 52 | `giu_hang_ban` | 05 | Dat tru ton kho cho don ban chua xuat |
| 53 | `lich_su_trang_thai_don` | 05 | Nhat ky thay doi trang thai don ban |
| 54 | `giao_hang` | 05 | Dot giao ban giao hang cho don online hoac tai quay |
| 55 | `chi_tiet_giao_hang` | 05 | So luong moi dong don duoc giao theo tung dot |
| 56 | `phieu_tra_hang` | 05 | Phieu khach tra sach da mua, co ly do va quy trinh duyet |
| 57 | `chi_tiet_tra_hang` | 05 | Tung an ban/so luong tra trong phieu |
| 58 | `ma_giam_gia` | 05 | Ma uu dai ap dung vao don ban/hoi vien theo quy tac |
| 59 | `su_dung_ma_giam_gia` | 05 | Nhat ky ma da giu, da dung va hoan luot |
| 60 | `chinh_sach_muon` | 06 | Quy tac muon mien phi/cho thue co phi theo chi nhanh va nhom khach |
| 61 | `chinh_sach_muon_pham_vi` | 06 | Nhom sach, chi nhanh/nhom khach duoc ap dung chinh sach |
| 62 | `yeu_cau_muon` | 06 | Dang ky muon/cho thue truoc khi nhan sach |
| 63 | `chi_tiet_yeu_cau_muon` | 06 | Moi dong phien ban va so luong khach muon |
| 64 | `dat_truoc_sach` | 06 | Hang doi/giu ban sao; chan cap trung cho khach khac |
| 65 | `phieu_muon_sach` | 06 | Phieu ban giao sach co the gom nhieu cuon va nhieu lan tra |
| 66 | `chi_tiet_phieu_muon` | 06 | Moi dong ban sao da ban giao va chinh sach chot |
| 67 | `lich_su_gia_han` | 06 | Moi yeu cau va lan gia han cuon sach |
| 68 | `phieu_tra_sach` | 06 | Moi dot nhan tra tren mot phieu muon |
| 69 | `chi_tiet_phieu_tra` | 06 | Ket qua kiem tra tung ban sao trong dot tra |
| 70 | `phi_phat_sinh_muon` | 06 | Dong phi gia han, qua han, hu hong hoac boi thuong |
| 71 | `lich_su_trang_thai_muon` | 06 | Nhat ky thay doi phieu muon hoac cuon sach |
| 72 | `khoan_phai_thu` | 07 | Khoan khach can tra, bao gom phi ban sach, thue, hoi vien, phi khac va coc |
| 73 | `thanh_toan` | 07 | Lan khach chuyen tien/tra tien mat; khong luu thong tin the nhay cam |
| 74 | `phan_bo_thanh_toan` | 07 | Phan bo mot giao dich thanh toan vao nhieu khoan phai thu |
| 75 | `giao_dich_tien_coc` | 07 | So cai tien coc thu/hoan/khau tru cho tung cuon/phieu |
| 76 | `hoan_tien` | 07 | Yeu cau/lenh hoan tien mua sach, phi thue, coc hoac hoi vien |
| 77 | `phan_bo_hoan_tien` | 07 | Phan bo tien hoan vao don/khoan phai thu cu the |
| 78 | `phieu_thu_chi` | 07 | Chung tu quy tien mat/thu chi noi bo cua chi nhanh |
| 79 | `doi_soat_thanh_toan` | 07 | Dot doi soat provider/ngan hang voi giao dich noi bo |
| 80 | `su_kien_thanh_toan` | 07 | Idempotent webhook/callback/doi soat tu provider |
| 81 | `mau_thong_bao` | 08 | Template thong bao theo su kien va ngon ngu |
| 82 | `thong_bao` | 08 | Thong bao da tao gui toi tai khoan/khach |
| 83 | `thong_bao_kenh` | 08 | Theo doi moi lan gui email/SMS/push thong bao |
| 84 | `cuoc_tro_chuyen_ai` | 09 | Phien hoi thoai tim sach/tu van/ho tro nhan vien |
| 85 | `tin_nhan_ai` | 09 | Tin nhan user, assistant va tham chieu nguon |
| 86 | `tai_lieu_ai` | 09 | Nguon du lieu duoc phep lap chi muc AI, khong tu dong lay toan bo sach ban quyen |
| 87 | `doan_noi_dung_ai` | 09 | Cac doan da cat va embedding phuc vu tim kiem RAG |
| 88 | `lich_su_su_dung_ai` | 09 | Ghi nhan token, latency, gia uoc tinh va trang thai moi yeu cau |
| 89 | `nhiem_vu_ai` | 09 | Tac vu nen OCR/index/tao mo ta/phan tich, co retry an toan |
| 90 | `goi_dich_vu_saas` | 10 | Goi phan mem BookFlow ban cho nha sach/thu vien |
| 91 | `gioi_han_goi_saas` | 10 | Han muc cho moi goi phan mem |
| 92 | `dang_ky_dich_vu_saas` | 10 | Lan dang ky goi BookFlow cua tung don vi |
| 93 | `hoa_don_saas` | 10 | Chung tu phi dich vu SaaS theo ky; hoa don dien tu phai tich hop phap ly rieng |
| 94 | `thanh_toan_saas` | 10 | Thanh toan don vi cho phi su dung phan mem |
| 95 | `tep_dinh_kem` | 11 | Metadata tep upload dung chung; file that o MinIO/S3, khong luu binary trong DB |
| 96 | `cau_hinh_don_vi` | 11 | Key-value cau hinh nghiep vu theo don vi/chi nhanh |
| 97 | `tac_vu_nen` | 11 | Quan ly cac job thong bao, nhac han, doi soat, cap nhat du lieu |
| 98 | `nhat_ky_he_thong` | 11 | Audit actor/action/object, bat buoc voi cap quyen va giao dich |
| 99 | `nhat_ky_tich_hop` | 11 | Log dong bo/yeu cau ben ngoai da che thong tin nhay cam |

---


# 01. Nen tang SaaS, tai khoan va phan quyen

**Thứ tự thực hiện:** Giai doan 1 — tao to chuc, tai khoan, xac thuc va kiem soat truy cap.


## 01. `don_vi`

**Mục đích:** Don vi thue phan mem BookFlow; khoi tao khong gian du lieu va cau hinh co ban  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `ma_don_vi` | `VARCHAR(40)` | NN; UNIQUE | Ma nhan dien don vi tren nen tang, khong doi sau khi kich hoat. |
| `ten_hien_thi` | `VARCHAR(200)` | NN | Ten nha sach/thu vien hien thi cho nguoi dung. |
| `ten_phap_ly` | `VARCHAR(255)` | NULL | Ten phap ly khi can ky hop dong/xuat chung tu. |
| `ma_so_thue` | `VARCHAR(30)` | NULL | Ma so thue, neu don vi cung cap va duoc xac minh. |
| `email_lien_he` | `VARCHAR(254)` | NN | Email lien he van hanh va hoa don SaaS. |
| `so_dien_thoai` | `VARCHAR(30)` | NULL | So lien he don vi, luu theo dang chuan hoa. |
| `website` | `TEXT` | NULL | Website chinh thuc, chi chap nhan URL hop le. |
| `logo_tep_id` | `UUID` | NULL; FK tep_dinh_kem.id | File logo cua don vi. |
| `mui_gio` | `VARCHAR(64)` | NN; DEFAULT 'Asia/Ho_Chi_Minh' | Mui gio dung khi hien thi han tra va bao cao. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Ma tien te mac dinh theo ISO 4217. |
| `ngon_ngu` | `VARCHAR(10)` | NN; DEFAULT 'vi' | Ngon ngu hien thi mac dinh. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, TAM_KHOA, NGUNG_DICH_VU. |
| `ngay_kich_hoat` | `TIMESTAMPTZ` | NULL | Thoi diem bat dau su dung. |
| `ngay_tam_khoa` | `TIMESTAMPTZ` | NULL | Thoi diem khoa gan nhat. |
| `ly_do_tam_khoa` | `TEXT` | NULL | Ly do khoa do quan tri nen tang ghi nhan. |

**Ràng buộc/index đề xuất:** UNIQUE(ma_don_vi); index(trang_thai). Khong luu mat khau hay khoa API cua don vi tai day.

**Quy tắc nghiệp vụ:** Du lieu da phat sinh giao dich khong xoa cung; dung trang_thai va chinh sach luu tru.


## 02. `chi_nhanh`

**Mục đích:** Dia diem kinh doanh/thu vien thuoc mot don vi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_chi_nhanh` | `VARCHAR(40)` | NN | Ma chi nhanh duy nhat trong don vi. |
| `ten_chi_nhanh` | `VARCHAR(200)` | NN | Ten hien thi va ten tren chung tu noi bo. |
| `loai_chi_nhanh` | `VARCHAR(24)` | NN; DEFAULT 'KET_HOP' | NHA_SACH, THU_VIEN, KET_HOP. |
| `dia_chi_chi_tiet` | `VARCHAR(300)` | NULL | So nha, duong, toa nha. |
| `ma_tinh_thanh` | `VARCHAR(20)` | NULL | Ma hanh chinh tinh/thanh neu ap dung. |
| `ten_tinh_thanh` | `VARCHAR(100)` | NULL | Ten tinh/thanh tai thoi diem luu. |
| `ma_phuong_xa` | `VARCHAR(20)` | NULL | Ma phuong/xa neu ap dung. |
| `ten_phuong_xa` | `VARCHAR(100)` | NULL | Ten phuong/xa de hien thi. |
| `quoc_gia` | `CHAR(2)` | NN; DEFAULT 'VN' | Ma quoc gia ISO 3166-1 alpha-2. |
| `vi_do` | `NUMERIC(10,7)` | NULL | Vi do vi tri, chi luu neu can hien thi ban do. |
| `kinh_do` | `NUMERIC(10,7)` | NULL | Kinh do vi tri. |
| `so_dien_thoai` | `VARCHAR(30)` | NULL | So dien thoai chi nhanh. |
| `email` | `VARCHAR(254)` | NULL | Email chi nhanh. |
| `quan_ly_thanh_vien_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi quan ly chi nhanh. |
| `cho_nhan_tai_quay` | `BOOLEAN` | NN; DEFAULT TRUE | Co cho nhan sach tai quay hay khong. |
| `cho_ban_truc_tuyen` | `BOOLEAN` | NN; DEFAULT TRUE | Chi nhanh co nhan don online hay khong. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Hoat dong, tam dong, ngung dung. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_chi_nhanh); index(don_vi_id,trang_thai).


## 03. `tai_khoan`

**Mục đích:** Danh tinh dang nhap dung chung, co the thuoc nhieu don vi  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `email` | `VARCHAR(254)` | NN; UNIQUE sau chuan hoa | Email dang nhap, luu dang da chuan hoa. |
| `so_dien_thoai` | `VARCHAR(30)` | NULL | So dien thoai da chuan hoa; unique neu su dung de dang nhap. |
| `mat_khau_bam` | `TEXT` | NULL | Hash Argon2id/bcrypt, khong bao gio luu mat khau thuan. |
| `ho_ten` | `VARCHAR(200)` | NN | Ten hien thi cua chu tai khoan. |
| `anh_dai_dien_tep_id` | `UUID` | NULL; FK tep_dinh_kem.id | Anh dai dien duoc phep truy cap. |
| `email_da_xac_minh` | `BOOLEAN` | NN; DEFAULT FALSE | Da chung minh quyen so huu email. |
| `so_dien_thoai_da_xac_minh` | `BOOLEAN` | NN; DEFAULT FALSE | Da xac minh so dien thoai. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_XAC_MINH' | CHO_XAC_MINH, DANG_DUNG, TAM_KHOA, DA_DONG. |
| `ngay_dang_nhap_cuoi` | `TIMESTAMPTZ` | NULL | Lan dang nhap thanh cong gan nhat. |
| `so_lan_dang_nhap_sai` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | Dem loi dang nhap theo chinh sach chong brute force. |
| `khoa_den` | `TIMESTAMPTZ` | NULL | Thoi diem het khoa tam thoi. |
| `phien_ban_xac_thuc` | `INTEGER` | NN; DEFAULT 1 | Tang de vo hieu cac session/token cu khi can. |
| `ngay_dong_tai_khoan` | `TIMESTAMPTZ` | NULL | Thoi diem dong tai khoan theo yeu cau. |

**Ràng buộc/index đề xuất:** UNIQUE(lower(email)); khong su dung email/so dien thoai la PK.

**Quy tắc nghiệp vụ:** Khong luu access token, OTP hay reset token o dang ro; hash va dat han su dung.


## 04. `phien_dang_nhap`

**Mục đích:** Phien dang nhap, thu hoi token va quan ly thiet bi  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `tai_khoan_id` | `UUID` | NN; FK tai_khoan.id | Tai khoan dang nhap. |
| `ma_phien_bam` | `CHAR(64)` | NN; UNIQUE | Hash cua refresh/session token. |
| `thiet_bi` | `VARCHAR(255)` | NULL | Ten thiet bi hoac user-agent rut gon. |
| `nen_tang` | `VARCHAR(30)` | NULL | WEB, IOS, ANDROID hoac khac. |
| `dia_chi_ip` | `INET` | NULL | IP theo muc dich bao mat va thoi han luu. |
| `user_agent` | `TEXT` | NULL | User-Agent goc neu can dieu tra su co. |
| `ngay_het_han` | `TIMESTAMPTZ` | NN | Thoi diem session vo hieu. |
| `ngay_thu_hoi` | `TIMESTAMPTZ` | NULL | Thoi diem dang xuat/thu hoi. |
| `ly_do_thu_hoi` | `VARCHAR(100)` | NULL | Dang xuat, doi mat khau, khoa tai khoan. |
| `lan_su_dung_cuoi` | `TIMESTAMPTZ` | NULL | Lan refresh/hoat dong cuoi. |

**Ràng buộc/index đề xuất:** UNIQUE(ma_phien_bam); index(tai_khoan_id,ngay_het_han).


## 05. `ma_xac_minh`

**Mục đích:** Ma xac minh email, dat lai mat khau, xac minh dien thoai  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `tai_khoan_id` | `UUID` | NULL; FK tai_khoan.id | Tai khoan dich, co the NULL khi dang ky. |
| `dia_chi_dich` | `VARCHAR(254)` | NN | Dia chi email hoac so dien thoai se nhan ma. |
| `muc_dich` | `VARCHAR(30)` | NN | DANG_KY, DAT_LAI_MAT_KHAU, DOI_EMAIL, XAC_MINH_SDT. |
| `ma_bam` | `CHAR(64)` | NN | Hash OTP/token, khong luu ban ro. |
| `ngay_het_han` | `TIMESTAMPTZ` | NN | Thoi diem ma khong con hieu luc. |
| `ngay_su_dung` | `TIMESTAMPTZ` | NULL | Thoi diem da xac nhan thanh cong. |
| `so_lan_thu` | `SMALLINT` | NN; DEFAULT 0 | So lan nhap sai. |
| `so_lan_gui` | `SMALLINT` | NN; DEFAULT 1 | So lan da gui lai. |
| `ngay_gui_cuoi` | `TIMESTAMPTZ` | NN | Dung tinh thoi gian cho gui lai. |

**Ràng buộc/index đề xuất:** index(dia_chi_dich,muc_dich,ngay_het_han).


## 06. `thanh_vien_don_vi`

**Mục đích:** Tai khoan nhan vien tham gia mot don vi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `tai_khoan_id` | `UUID` | NN; FK tai_khoan.id | Danh tinh toan nen tang. |
| `ma_nhan_vien` | `VARCHAR(40)` | NULL | Ma nhan vien trong don vi. |
| `chuc_danh` | `VARCHAR(120)` | NULL | Chuc danh hien thi. |
| `email_cong_viec` | `VARCHAR(254)` | NULL | Email cong viec tai don vi. |
| `so_dien_thoai_cong_viec` | `VARCHAR(30)` | NULL | So lien he cong viec. |
| `ngay_moi` | `TIMESTAMPTZ` | NULL | Ngay gui loi moi. |
| `ngay_gia_nhap` | `TIMESTAMPTZ` | NULL | Ngay chap nhan gia nhap. |
| `ngay_nghi_viec` | `TIMESTAMPTZ` | NULL | Ngay cham dut quyen truy cap. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_MOI' | CHO_MOI, DANG_LAM, TAM_KHOA, DA_ROI. |
| `nguoi_moi_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi moi. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,tai_khoan_id); UNIQUE(don_vi_id,ma_nhan_vien) WHERE ma_nhan_vien IS NOT NULL.


## 07. `thanh_vien_chi_nhanh`

**Mục đích:** Pham vi chi nhanh cua nhan vien  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `thanh_vien_don_vi_id` | `UUID` | NN; FK thanh_vien_don_vi.id | Nhan vien trong don vi. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh duoc phep. |
| `la_chi_nhanh_chinh` | `BOOLEAN` | NN; DEFAULT FALSE | Chi nhanh cong tac chinh. |
| `ngay_bat_dau` | `DATE` | NN | Ngay phan cong. |
| `ngay_ket_thuc` | `DATE` | NULL | Het hieu luc phan cong. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'HIEU_LUC' | HIEU_LUC, KET_THUC, TAM_DUNG. |

**Ràng buộc/index đề xuất:** index(don_vi_id,thanh_vien_don_vi_id,chi_nhanh_id); kiem tra cung don_vi_id o cap DB/API.


## 08. `vai_tro`

**Mục đích:** Nhom quyen cau hinh theo tung don vi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_vai_tro` | `VARCHAR(60)` | NN | Ma vai tro phuc vu backend. |
| `ten_vai_tro` | `VARCHAR(120)` | NN | Ten vai tro hien thi. |
| `mo_ta` | `TEXT` | NULL | Mo ta pham vi trach nhiem. |
| `la_vai_tro_he_thong` | `BOOLEAN` | NN; DEFAULT FALSE | Vai tro mac dinh khong cho xoa. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Co the gan cho nhan vien. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_vai_tro).


## 09. `quyen`

**Mục đích:** Danh muc ma quyen dung chung toan nen tang  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `ma_quyen` | `VARCHAR(120)` | NN; UNIQUE | VD books.create, loans.return, payments.refund. |
| `ten_quyen` | `VARCHAR(160)` | NN | Ten quyen tieng Viet. |
| `nhom_quyen` | `VARCHAR(80)` | NN | Module: sach, kho, ban_hang, muon_tra. |
| `mo_ta` | `TEXT` | NN | Dinh nghia hanh vi duoc phep. |
| `la_quyen_nhay_cam` | `BOOLEAN` | NN; DEFAULT FALSE | Quyen can audit/kiem tra bo sung. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Dang cap hoac ngung su dung. |

**Ràng buộc/index đề xuất:** UNIQUE(ma_quyen); ma quyen khong doi tuy tien vi co lien quan source code.


## 10. `vai_tro_quyen`

**Mục đích:** Bang noi vai tro va quyen  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `vai_tro_id` | `UUID` | NN; FK vai_tro.id | Vai tro duoc cap quyen. |
| `quyen_id` | `UUID` | NN; FK quyen.id | Quyen cu the. |
| `pham_vi` | `VARCHAR(24)` | NN; DEFAULT 'DON_VI' | DON_VI, CHI_NHANH, CA_NHAN. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,vai_tro_id,quyen_id,pham_vi).


## 11. `thanh_vien_vai_tro`

**Mục đích:** Gan vai tro cho thanh vien; co the gioi han theo chi nhanh  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `thanh_vien_don_vi_id` | `UUID` | NN; FK thanh_vien_don_vi.id | Nhan vien duoc gan. |
| `vai_tro_id` | `UUID` | NN; FK vai_tro.id | Vai tro duoc gan. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | NULL neu ap dung tren ca don vi. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN; DEFAULT now() | Bat dau co hieu luc. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Thoi diem het quyen. |
| `nguoi_cap_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi cap quyen. |
| `ly_do` | `TEXT` | NULL | Ly do cap hoac thu hoi quyen nhay cam. |

**Ràng buộc/index đề xuất:** index(don_vi_id,thanh_vien_don_vi_id,ngay_ket_thuc).


## 12. `nhat_ky_dang_nhap`

**Mục đích:** Lich su bao mat va lan dang nhap khong thanh cong  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `tai_khoan_id` | `UUID` | NULL; FK tai_khoan.id | NULL neu email khong ton tai. |
| `email_da_nhap` | `VARCHAR(254)` | NULL | Dia chi nhap, can che thong tin theo chinh sach. |
| `ket_qua` | `VARCHAR(24)` | NN | THANH_CONG, SAI_MAT_KHAU, KHOA, MFA_THAT_BAI. |
| `dia_chi_ip` | `INET` | NULL | IP truy cap. |
| `user_agent` | `TEXT` | NULL | Thiet bi trinh duyet. |
| `ma_ly_do` | `VARCHAR(60)` | NULL | Ma loi phuc vu giam sat. |
| `phien_dang_nhap_id` | `UUID` | NULL; FK phien_dang_nhap.id | Phien duoc tao neu thanh cong. |

**Ràng buộc/index đề xuất:** index(tai_khoan_id,ngay_tao); dat chinh sach xoa/ẩn du lieu bao mat theo thoi han.


# 02. Danh muc sach, phien ban va hinh thuc cung cap

**Thứ tự thực hiện:** Giai doan 2 — co du danh muc de ban, muon, tim kiem va AI.


## 13. `dau_sach`

**Mục đích:** Thong tin tac pham/de muc sach do don vi quan ly  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_dau_sach` | `VARCHAR(50)` | NN | Ma noi bo duoc duy tri on dinh. |
| `ten_sach` | `VARCHAR(300)` | NN | Nhan de chinh. |
| `ten_goc` | `VARCHAR(300)` | NULL | Nhan de goc neu la sach dich. |
| `ten_phu` | `VARCHAR(300)` | NULL | Phu de hoac nhan de phu. |
| `mo_ta_ngan` | `TEXT` | NULL | Gioi thieu ngan phuc vu ket qua tim kiem. |
| `mo_ta_day_du` | `TEXT` | NULL | Mo ta duoc phep hien thi. |
| `tom_tat_noi_dung` | `TEXT` | NULL | Ban tom tat do bien tap/AI duyet, khong sao chep trai phep. |
| `doi_tuong_doc` | `VARCHAR(120)` | NULL | Doi tuong duoc gioi thieu, khong lam can cu loai tru. |
| `do_tuoi_goi_y` | `SMALLINT` | NULL; CHECK >=0 | Do tuoi goi y theo nhan thong tin. |
| `anh_bia_chinh_id` | `UUID` | NULL; FK tep_dinh_kem.id | Anh bia su dung co quyen. |
| `nguon_du_lieu` | `VARCHAR(80)` | NULL | Tu nhap, nha cung cap, ISBN API. |
| `url_nguon` | `TEXT` | NULL | URL doi chieu thong tin thu muc. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DANG_HIEN_THI, TAM_AN, NGUNG_KINH_DOANH. |
| `ngay_xuat_ban_hien_thi` | `DATE` | NULL | Ngay xuat ban tham khao neu duoc cung cap. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_dau_sach); index(don_vi_id,ten_sach).

**Quy tắc nghiệp vụ:** Khong dat ma ISBN o dau_sach vi moi phien ban co the co ISBN khac nhau.


## 14. `phien_ban_sach`

**Mục đích:** An ban co ISBN/ngon ngu/dinh dang va thong so rieng  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `dau_sach_id` | `UUID` | NN; FK dau_sach.id | Tac pham cha. |
| `ma_phien_ban` | `VARCHAR(60)` | NN | Ma phien ban do don vi dat. |
| `ma_isbn` | `VARCHAR(20)` | NULL | ISBN-10/ISBN-13 sau chuan hoa; co the khong co. |
| `nha_xuat_ban_id` | `UUID` | NULL; FK nha_xuat_ban.id | Don vi xuat ban an ban nay. |
| `ngay_xuat_ban` | `DATE` | NULL | Ngay xuat ban ban in. |
| `nam_xuat_ban` | `SMALLINT` | NULL; CHECK 1000..9999 | Nam xuat ban neu khong co ngay day du. |
| `lan_xuat_ban` | `SMALLINT` | NULL; CHECK >=1 | Lan xuat ban/tai ban. |
| `ngon_ngu` | `VARCHAR(15)` | NN; DEFAULT 'vi' | Ma ngon ngu chuan hoa. |
| `loai_bia` | `VARCHAR(24)` | NULL | BIA_MEM, BIA_CUNG, KHAC. |
| `so_trang` | `INTEGER` | NULL; CHECK >0 | So trang tren an ban. |
| `kich_thuoc_cm` | `VARCHAR(50)` | NULL | Kich thuoc thu muc, VD 13 x 20.5. |
| `trong_luong_gram` | `INTEGER` | NULL; CHECK >0 | Phuc vu tinh cuoc giao hang. |
| `ma_vach_nha_xuat_ban` | `VARCHAR(60)` | NULL | Ma vach EAN neu khac ISBN. |
| `gia_bia` | `NUMERIC(18,2)` | NULL; CHECK >=0 | Gia bia tham khao, khong phai gia ban giao dich. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Tinh trang phien ban. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phien_ban); UNIQUE(don_vi_id,ma_isbn) WHERE ma_isbn IS NOT NULL AND ma_isbn <> ''.


## 15. `tac_gia`

**Mục đích:** Ho so tac gia/bien dich/bien soan  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ho_ten` | `VARCHAR(200)` | NN | Ten hien thi. |
| `ten_khac` | `VARCHAR(200)` | NULL | But danh/ten goi khac. |
| `ten_sap_xep` | `VARCHAR(200)` | NULL | Ten chuan hoa phuc vu sap xep. |
| `nam_sinh` | `SMALLINT` | NULL | Nam sinh neu cong khai va can thiet. |
| `nam_mat` | `SMALLINT` | NULL | Nam mat neu co. |
| `quoc_tich` | `VARCHAR(100)` | NULL | Thong tin thu muc cong khai. |
| `tieu_su` | `TEXT` | NULL | Tieu su duoc phep hien thi. |
| `anh_dai_dien_tep_id` | `UUID` | NULL; FK tep_dinh_kem.id | Anh tac gia neu duoc cap quyen. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | An/hien ho so. |

**Ràng buộc/index đề xuất:** index(don_vi_id,ten_sap_xep); khong UNIQUE theo ho_ten vi co the trung ten.


## 16. `dau_sach_tac_gia`

**Mục đích:** Gan tac gia va vai tro dong gop cho dau sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `dau_sach_id` | `UUID` | NN; FK dau_sach.id | Dau sach. |
| `tac_gia_id` | `UUID` | NN; FK tac_gia.id | Nguoi dong gop. |
| `vai_tro_dong_gop` | `VARCHAR(30)` | NN; DEFAULT 'TAC_GIA' | TAC_GIA, DICH_GIA, BIEN_SOAN, MINH_HOA. |
| `thu_tu_hien_thi` | `SMALLINT` | NN; DEFAULT 1 | Thu tu hien thi tren trang sach. |
| `ghi_chu` | `VARCHAR(200)` | NULL | Ghi chu ve dong gop. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,dau_sach_id,tac_gia_id,vai_tro_dong_gop).


## 17. `nha_xuat_ban`

**Mục đích:** Nha xuat ban cua tung phien ban sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_nha_xuat_ban` | `VARCHAR(40)` | NULL | Ma noi bo neu co. |
| `ten_nha_xuat_ban` | `VARCHAR(255)` | NN | Ten day du. |
| `ten_viet_tat` | `VARCHAR(100)` | NULL | Ten viet tat/thuong hieu. |
| `email` | `VARCHAR(254)` | NULL | Email lien he cong khai. |
| `so_dien_thoai` | `VARCHAR(30)` | NULL | Lien he cong khai. |
| `website` | `TEXT` | NULL | URL chinh thuc. |
| `dia_chi` | `TEXT` | NULL | Dia chi giao dich. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Co su dung du lieu. |

**Ràng buộc/index đề xuất:** index(don_vi_id,ten_nha_xuat_ban).


## 18. `the_loai_sach`

**Mục đích:** Cay the loai/danh muc hien thi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_the_loai` | `VARCHAR(50)` | NN | Ma danh muc. |
| `ten_the_loai` | `VARCHAR(200)` | NN | Ten danh muc. |
| `the_loai_cha_id` | `UUID` | NULL; FK the_loai_sach.id | Danh muc cha. |
| `mo_ta` | `TEXT` | NULL | Gioi thieu the loai. |
| `duong_dan` | `VARCHAR(240)` | NULL | Slug URL trong don vi. |
| `thu_tu` | `INTEGER` | NN; DEFAULT 0 | Thu tu hien thi. |
| `anh_dai_dien_tep_id` | `UUID` | NULL; FK tep_dinh_kem.id | Anh dai dien. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Hien/an. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_the_loai); khong cho tao chu trinh cha-con.


## 19. `dau_sach_the_loai`

**Mục đích:** Gan dau sach vao nhieu the loai  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `dau_sach_id` | `UUID` | NN; FK dau_sach.id | Dau sach. |
| `the_loai_id` | `UUID` | NN; FK the_loai_sach.id | The loai. |
| `la_the_loai_chinh` | `BOOLEAN` | NN; DEFAULT FALSE | The loai chinh de hien thi. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,dau_sach_id,the_loai_id); toi da mot the loai chinh neu nghiep vu can.


## 20. `tu_khoa_sach`

**Mục đích:** Tu khoa tim kiem va bo loc  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_tu_khoa` | `VARCHAR(60)` | NULL | Ma tu khoa noi bo. |
| `ten_tu_khoa` | `VARCHAR(120)` | NN | Tu khoa chuan hoa. |
| `loai_tu_khoa` | `VARCHAR(30)` | NN; DEFAULT 'CHU_DE' | CHU_DE, KY_NANG, CHUONG_TRINH, KHAC. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Co hien thi/tim kiem. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ten_tu_khoa,loai_tu_khoa).


## 21. `dau_sach_tu_khoa`

**Mục đích:** Lien ket dau sach va tu khoa  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `dau_sach_id` | `UUID` | NN; FK dau_sach.id | Dau sach. |
| `tu_khoa_id` | `UUID` | NN; FK tu_khoa_sach.id | Tu khoa. |
| `nguon_gan` | `VARCHAR(20)` | NN; DEFAULT 'THU_CONG' | THU_CONG, NHAP_LIEU, AI_GOI_Y. |
| `da_duyet` | `BOOLEAN` | NN; DEFAULT TRUE | Xac nhan tu khoa AI de xuat. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,dau_sach_id,tu_khoa_id).


## 22. `tep_sach`

**Mục đích:** Anh bia, anh minh hoa va tep phu tro cho sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `dau_sach_id` | `UUID` | NULL; FK dau_sach.id | Dau sach neu anh chung. |
| `phien_ban_sach_id` | `UUID` | NULL; FK phien_ban_sach.id | An ban neu tep rieng. |
| `tep_dinh_kem_id` | `UUID` | NN; FK tep_dinh_kem.id | Tep thuc te duoc luu trong kho file. |
| `loai_tep_sach` | `VARCHAR(24)` | NN | ANH_BIA, ANH_PHU, TRICH_DOAN, MUC_LUC, KHAC. |
| `thu_tu` | `INTEGER` | NN; DEFAULT 0 | Thu tu hien thi. |
| `mo_ta` | `VARCHAR(300)` | NULL | Chu thich tep. |
| `duoc_phep_cong_khai` | `BOOLEAN` | NN; DEFAULT FALSE | Kiem tra quyen hien thi. |

**Ràng buộc/index đề xuất:** CHECK(dau_sach_id IS NOT NULL OR phien_ban_sach_id IS NOT NULL); khong tu dong mo tep sach ban quyen.


## 23. `hinh_thuc_kinh_doanh_sach`

**Mục đích:** Mot phien ban tai chi nhanh co the ban, muon mien phi hoac cho thue  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban duoc cung cap. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh cung cap. |
| `hinh_thuc` | `VARCHAR(24)` | NN | BAN, MUON_MIEN_PHI, THUE_CO_PHI. |
| `ma_hinh_thuc` | `VARCHAR(50)` | NN | Ma offering noi bo cua chi nhanh. |
| `chinh_sach_muon_id` | `UUID` | NULL; FK chinh_sach_muon.id | Bat buoc cho MUON_MIEN_PHI/THUE_CO_PHI. |
| `cho_dat_truoc` | `BOOLEAN` | NN; DEFAULT TRUE | Cho phep giu cho. |
| `cho_giao_tan_noi` | `BOOLEAN` | NN; DEFAULT FALSE | Cho giao tan noi neu quy trinh ho tro. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NULL | Bat dau kinh doanh hinh thuc nay. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Ket thuc hieu luc. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, TAM_NGUNG, NGUNG_DUNG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,chi_nhanh_id,ma_hinh_thuc); index(don_vi_id,phien_ban_sach_id,hinh_thuc).

**Quy tắc nghiệp vụ:** Gia ban duoc quan ly theo bang_gia_sach; phi thue tinh theo chinh_sach_muon va quyen loi, khong dat cot gia ban co nghia kep.


## 24. `bang_gia_sach`

**Mục đích:** Gia ban niêm yet theo offering va khoang thoi gian  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `hinh_thuc_kinh_doanh_sach_id` | `UUID` | NN; FK hinh_thuc_kinh_doanh_sach.id | Chi ap dung cho offering BAN. |
| `ma_bang_gia` | `VARCHAR(50)` | NN | Ma dong gia/chuong trinh gia. |
| `gia_niem_yet` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia ban truoc khuyen mai. |
| `gia_ban` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia ban thuc te tren kenh da chon. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Ma tien te. |
| `kenh_ban` | `VARCHAR(20)` | NN; DEFAULT 'TAT_CA' | TAT_CA, TAI_QUAY, TRUC_TUYEN. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN | Hieu luc tu luc. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Het hieu luc. |
| `ly_do_dieu_chinh` | `TEXT` | NULL | Ly do thay doi gia. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'HIEU_LUC' | CHO_AP_DUNG, HIEU_LUC, HET_HAN, HUY. |

**Ràng buộc/index đề xuất:** index(don_vi_id,hinh_thuc_kinh_doanh_sach_id,kenh_ban,ngay_bat_dau).

**Quy tắc nghiệp vụ:** Khong cho hai gia cung kenh trung khoang hieu luc neu khong co quy tac uu tien.


# 03. Nha cung cap, nhap sach va kho

**Thứ tự thực hiện:** Giai doan 3 — nhap sach, ton kho ban, cuon sach muon va doi soat.


## 25. `nha_cung_cap`

**Mục đích:** Doi tac ban/bang giao sach cho don vi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_nha_cung_cap` | `VARCHAR(50)` | NN | Ma nha cung cap. |
| `ten_nha_cung_cap` | `VARCHAR(255)` | NN | Ten giao dich. |
| `ten_phap_ly` | `VARCHAR(255)` | NULL | Ten tren chung tu neu khac. |
| `ma_so_thue` | `VARCHAR(30)` | NULL | Ma so thue neu co. |
| `nguoi_lien_he` | `VARCHAR(160)` | NULL | Dau moi lien he. |
| `so_dien_thoai` | `VARCHAR(30)` | NULL | So lien he. |
| `email` | `VARCHAR(254)` | NULL | Email giao dich. |
| `dia_chi` | `TEXT` | NULL | Dia chi nhap hang/chung tu. |
| `so_tai_khoan` | `VARCHAR(70)` | NULL | So tai khoan thanh toan neu nghiep vu can, phan quyen han che. |
| `ten_ngan_hang` | `VARCHAR(160)` | NULL | Ngan hang tuong ung. |
| `ghi_chu` | `TEXT` | NULL | Ghi chu ve hop tac. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, TAM_NGUNG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_nha_cung_cap); ma so thue co the NULL/khong duy nhat tren du lieu cu.


## 26. `kho`

**Mục đích:** Kho vat ly tai chi nhanh, co the la kho ban hoac kho muon  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh quan ly. |
| `ma_kho` | `VARCHAR(40)` | NN | Ma kho trong chi nhanh. |
| `ten_kho` | `VARCHAR(160)` | NN | Ten kho hien thi. |
| `loai_kho` | `VARCHAR(24)` | NN | KHO_BAN, KHO_MUON, KHO_TONG, KHO_CHO_XU_LY. |
| `dia_diem` | `VARCHAR(255)` | NULL | Vi tri vat ly. |
| `nguoi_phu_trach_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nhan vien phu trach. |
| `cho_xuat_ban` | `BOOLEAN` | NN; DEFAULT TRUE | Co duoc xuat ban sach tu kho nay. |
| `cho_xuat_muon` | `BOOLEAN` | NN; DEFAULT TRUE | Co duoc ban giao sach muon tu kho nay. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, TAM_NGUNG, DONG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,chi_nhanh_id,ma_kho).


## 27. `vi_tri_kho`

**Mục đích:** Khu, ke, ngan trong mot kho  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho cha. |
| `vi_tri_cha_id` | `UUID` | NULL; FK vi_tri_kho.id | Vi tri cha neu co cay ke. |
| `ma_vi_tri` | `VARCHAR(60)` | NN | Ma vi tri de quet/kiem ke. |
| `ten_vi_tri` | `VARCHAR(160)` | NN | Ten hien thi. |
| `loai_vi_tri` | `VARCHAR(24)` | NN; DEFAULT 'KE' | KHU, DAY, KE, NGAN, HOP, KHAC. |
| `suc_chua_goi_y` | `INTEGER` | NULL; CHECK >=0 | Suc chua tham khao. |
| `thu_tu` | `INTEGER` | NN; DEFAULT 0 | Thu tu sap xep. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | Co the chua sach. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,kho_id,ma_vi_tri); chan quan he cha-con tao chu trinh.


## 28. `phieu_nhap_sach`

**Mục đích:** Chung tu nhap sach tu nha cung cap, tang sach hoac dieu chinh  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh nhan. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho nhan. |
| `ma_phieu_nhap` | `VARCHAR(50)` | NN | So phieu nhap. |
| `nha_cung_cap_id` | `UUID` | NULL; FK nha_cung_cap.id | Co the NULL neu sach duoc tang. |
| `loai_nhap` | `VARCHAR(24)` | NN | MUA, TANG, CHUYEN_NOI_BO, DIEU_CHINH. |
| `so_chung_tu_nguon` | `VARCHAR(100)` | NULL | So hoa don/phieu giao cua ben giao. |
| `ngay_chung_tu` | `DATE` | NULL | Ngay tren chung tu nguon. |
| `ngay_du_kien_nhan` | `DATE` | NULL | Ngay du kien. |
| `ngay_nhan_thuc_te` | `TIMESTAMPTZ` | NULL | Luc nhan hang. |
| `tong_so_luong` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | Tong so luong ghi tren phieu. |
| `tong_gia_tri_nhap` | `NUMERIC(18,2)` | NN; DEFAULT 0; CHECK >=0 | Tong gia tri nhap. |
| `chi_phi_van_chuyen` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Chi phi van chuyen phan bo neu co. |
| `ghi_chu` | `TEXT` | NULL | Dien giai nhap. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, CHO_DUYET, DA_DUYET, DA_NHAP, HUY. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet. |
| `ngay_duyet` | `TIMESTAMPTZ` | NULL | Luc duyet. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phieu_nhap); chi cho tao ton khi phieu duoc ghi nhan DA_NHAP.


## 29. `chi_tiet_phieu_nhap`

**Mục đích:** Chi tiet tung phien ban va muc dich nhap tren phieu  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phieu_nhap_sach_id` | `UUID` | NN; FK phieu_nhap_sach.id | Phieu cha. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban sach. |
| `loai_phan_bo` | `VARCHAR(20)` | NN | BAN, MUON; khong nhap chung mot dong hai muc dich. |
| `so_luong_du_kien` | `INTEGER` | NN; CHECK >0 | So luong dat/du kien. |
| `so_luong_thuc_nhan` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | So luong nhan. |
| `don_gia_nhap` | `NUMERIC(18,2)` | NN; DEFAULT 0; CHECK >=0 | Gia von mot cuon truoc phan bo. |
| `thue_suat` | `NUMERIC(6,3)` | NULL; CHECK >=0 | Thue suat ghi tren chung tu neu can. |
| `tien_chiet_khau` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Chiet khau dong nhap. |
| `thanh_tien` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Gia tri dong sau chiet khau. |
| `tinh_trang_nhan` | `VARCHAR(24)` | NN; DEFAULT 'TOT' | TOT, MO_HOP, HU_HONG, KHAC. |
| `ghi_chu` | `TEXT` | NULL | Ghi chu chenh lech, hu hong. |

**Ràng buộc/index đề xuất:** index(don_vi_id,phieu_nhap_sach_id); kiem tra so luong duoc phan bo khong vuot thuc nhan.


## 30. `lo_nhap_sach`

**Mục đích:** Lo gia von nhap kho ban, ho tro FIFO/kiem ke  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `chi_tiet_phieu_nhap_id` | `UUID` | NN; FK chi_tiet_phieu_nhap.id | Dong nhap phat sinh lo. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho dang giu lo. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban. |
| `ma_lo` | `VARCHAR(70)` | NN | Ma lo theo don vi. |
| `so_luong_nhap` | `INTEGER` | NN; CHECK >0 | So cuon ban dau. |
| `so_luong_con` | `INTEGER` | NN; CHECK >=0 | So cuon con tren lo. |
| `don_gia_von` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia von 1 cuon sau phan bo chi phi. |
| `ngay_nhap` | `TIMESTAMPTZ` | NN | Thoi diem nhap kho. |
| `ngay_het_han_phan_phoi` | `DATE` | NULL | Chi dung neu hang co gioi han phan phoi. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, DA_HET, TAM_GIU. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_lo); CHECK(so_luong_con<=so_luong_nhap).


## 31. `ton_kho_ban`

**Mục đích:** So du ton ban theo phien ban va kho; la read-model duoc doi chieu bien dong  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho ban. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | Phien ban. |
| `so_luong_ton` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | So luong so huu tai kho, chua tru giu cho. |
| `so_luong_giu_cho` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | Luong giu cho don ban chua giao. |
| `so_luong_khong_kha_dung` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | Hu hong/kiem tra/tam khoa ban. |
| `so_luong_dang_chuyen` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | Hang dang chuyen chua nhan. |
| `phien_ban_du_lieu` | `INTEGER` | NN; DEFAULT 1 | Optimistic locking chong ban vuot ton. |
| `ngay_doi_soat_cuoi` | `TIMESTAMPTZ` | NULL | Lan doi soat voi so cai bien dong. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,kho_id,phien_ban_sach_id); CHECK(sum cac khoan loai tru <= so_luong_ton).

**Quy tắc nghiệp vụ:** So luong ban duoc = ton - giu cho - khong kha dung - dang chuyen; tinh trong transaction va DB lock.


## 32. `ban_sao_sach`

**Mục đích:** Tung cuon sach vat ly co ma rieng, dung cho muon/thue va ban sach cu neu duoc chuyen  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban cua cuon. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh chu quan. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho dang quan ly. |
| `vi_tri_kho_id` | `UUID` | NULL; FK vi_tri_kho.id | Ke/ngan sach. |
| `ma_ban_sao` | `VARCHAR(70)` | NN | Ma tai san/cuon sac rieng. |
| `ma_vach` | `VARCHAR(100)` | NULL | Barcode/QR duoc in. |
| `loai_so_huu` | `VARCHAR(24)` | NN; DEFAULT 'SO_HUU' | SO_HUU, KY_GUI, TANG. |
| `nguon_nhap_chi_tiet_id` | `UUID` | NULL; FK chi_tiet_phieu_nhap.id | Nguon hinh thanh ban sao. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'SAN_SANG' | SAN_SANG, GIU_CHO, DANG_MUON, BAO_TRI, THAT_LAC, DA_BAN, THANH_LY. |
| `tinh_trang_vat_ly` | `VARCHAR(24)` | NN; DEFAULT 'TOT' | MOI, TOT, CU, HU_HONG, KHONG_SU_DUNG. |
| `gia_von` | `NUMERIC(18,2)` | NULL; CHECK >=0 | Gia tri von tai thoi diem nhap. |
| `ngay_nhap` | `TIMESTAMPTZ` | NULL | Thoi diem nhan ban sao. |
| `ngay_kiem_ke_cuoi` | `TIMESTAMPTZ` | NULL | Lan kiem ke gan nhat. |
| `phien_ban_du_lieu` | `INTEGER` | NN; DEFAULT 1 | Optimistic locking khi phan bo muon. |
| `ghi_chu` | `TEXT` | NULL | Dau vet phan biet cuon. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_ban_sao); UNIQUE(don_vi_id,ma_vach) WHERE ma_vach IS NOT NULL.

**Quy tắc nghiệp vụ:** Khong cho cap 2 phieu muon/don ban chua tat toan cung chiem dung 1 ban sao; dung transaction va rang buoc unique mot phan.


## 33. `lich_su_tinh_trang_sach`

**Mục đích:** Nhat ky kiem tra, hu hong, bao tri tung ban sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ban_sao_sach_id` | `UUID` | NN; FK ban_sao_sach.id | Cuon sach duoc ghi nhan. |
| `tinh_trang_truoc` | `VARCHAR(24)` | NULL | Tinh trang truoc kiem tra. |
| `tinh_trang_sau` | `VARCHAR(24)` | NN | Tinh trang sau kiem tra. |
| `loai_su_kien` | `VARCHAR(24)` | NN | NHAP, MUON, TRA, KIEM_KE, SUA_CHUA, THANH_LY. |
| `mo_ta_hu_hong` | `TEXT` | NULL | Mo ta khach quan tinh trang. |
| `chi_phi_xu_ly` | `NUMERIC(18,2)` | NULL; CHECK >=0 | Chi phi sua chua neu co. |
| `anh_minh_chung_id` | `UUID` | NULL; FK tep_dinh_kem.id | Anh minh chung tinh trang. |
| `nguoi_kiem_tra_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi ghi nhan. |
| `tham_chieu_loai` | `VARCHAR(40)` | NULL | Loai giao dich phat sinh. |
| `tham_chieu_id` | `UUID` | NULL | Id giao dich tham chieu co rang buoc ung dung. |

**Ràng buộc/index đề xuất:** index(don_vi_id,ban_sao_sach_id,ngay_tao); chi them, khong sua lich su.


## 34. `bien_dong_kho`

**Mục đích:** So cai nhap/xuat/chuyen/giu/tra kho co the doi soat  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho phat sinh. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban. |
| `ban_sao_sach_id` | `UUID` | NULL; FK ban_sao_sach.id | Cuon rieng neu bien dong cua kho muon. |
| `loai_bien_dong` | `VARCHAR(30)` | NN | NHAP, XUAT_BAN, CHUYEN_DI, CHUYEN_DEN, TRA_LAI, DIEU_CHINH, GIU_CHO, GIAI_PHONG. |
| `so_luong_thay_doi` | `INTEGER` | NN; CHECK <>0 | Dau am/duong theo chieu bien dong. |
| `loai_ton` | `VARCHAR(24)` | NN | BAN, MUON, GIU_CHO, KHONG_KHA_DUNG. |
| `ma_tham_chieu` | `VARCHAR(100)` | NN | Ma chung tu sinh bien dong. |
| `tham_chieu_loai` | `VARCHAR(40)` | NN | PHIEU_NHAP, DON_BAN, PHIEU_MUON, CHUYEN_KHO, KIEM_KE. |
| `tham_chieu_id` | `UUID` | NN | Khoa nghiep vu co nguon goc. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong ghi trung khi retry. |
| `so_luong_truoc` | `INTEGER` | NULL | So luong truoc theo snapshot giao dich. |
| `so_luong_sau` | `INTEGER` | NULL | So luong sau theo snapshot giao dich. |
| `nguoi_thuc_hien_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi thao tac. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); khong cho update/delete dong so cai.


## 35. `phieu_chuyen_kho`

**Mục đích:** Chung tu dieu chuyen sach giua kho/chi nhanh  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `kho_xuat_id` | `UUID` | NN; FK kho.id | Kho di. |
| `kho_nhan_id` | `UUID` | NN; FK kho.id | Kho den. |
| `ma_phieu_chuyen` | `VARCHAR(60)` | NN | Ma chung tu. |
| `ly_do` | `VARCHAR(200)` | NN | Ly do dieu chuyen. |
| `ngay_du_kien` | `TIMESTAMPTZ` | NULL | Du kien nhan. |
| `ngay_xuat` | `TIMESTAMPTZ` | NULL | Thuc te xuat. |
| `ngay_nhan` | `TIMESTAMPTZ` | NULL | Thuc te nhan. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, CHO_DUYET, DANG_CHUYEN, DA_NHAN, HUY. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet. |
| `nguoi_giao_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi ban giao. |
| `nguoi_nhan_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi nhan. |
| `ghi_chu` | `TEXT` | NULL | Ghi chu chenh lech/hong hoc. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phieu_chuyen); CHECK(kho_xuat_id <> kho_nhan_id).


## 36. `chi_tiet_chuyen_kho`

**Mục đích:** Tung phien ban/ban sao tren phieu chuyen  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phieu_chuyen_kho_id` | `UUID` | NN; FK phieu_chuyen_kho.id | Phieu cha. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | Phien ban. |
| `ban_sao_sach_id` | `UUID` | NULL; FK ban_sao_sach.id | Co gia tri neu chuyen tung ban sao. |
| `so_luong_yeu_cau` | `INTEGER` | NN; CHECK >0 | So luong can chuyen. |
| `so_luong_xuat` | `INTEGER` | NN; DEFAULT 0 | So luong da xuat. |
| `so_luong_nhan` | `INTEGER` | NN; DEFAULT 0 | So luong da nhan. |
| `so_luong_hu_hong` | `INTEGER` | NN; DEFAULT 0 | So luong hu hong khi giao. |
| `ghi_chu` | `TEXT` | NULL | Ly do chenh lech. |

**Ràng buộc/index đề xuất:** index(don_vi_id,phieu_chuyen_kho_id); neu ban_sao_sach_id NOT NULL thi so luong <=1.


## 37. `phieu_kiem_ke`

**Mục đích:** Dot kiem ke kho co chot so du truoc va sau  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho duoc kiem. |
| `ma_phieu_kiem_ke` | `VARCHAR(60)` | NN | Ma dot kiem ke. |
| `thoi_diem_chot` | `TIMESTAMPTZ` | NN | Moc chot so sach. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NULL | Thuc te bat dau. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Thuc te ket thuc. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DANG_KIEM, CHO_DUYET, DA_CHOT, HUY. |
| `nguoi_kiem_ke_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Truong nhom kiem ke. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet chenh lech. |
| `ly_do_chot` | `TEXT` | NULL | Dien giai chenh lech. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phieu_kiem_ke); thay doi ton chi khi DA_CHOT.


## 38. `chi_tiet_kiem_ke`

**Mục đích:** So sach tren so va so sach thuc te theo an ban/cu on  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phieu_kiem_ke_id` | `UUID` | NN; FK phieu_kiem_ke.id | Phieu cha. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban. |
| `ban_sao_sach_id` | `UUID` | NULL; FK ban_sao_sach.id | Cuon rieng neu kiem kho muon. |
| `so_luong_so_sach` | `INTEGER` | NN; CHECK >=0 | So luong tai thoi diem chot. |
| `so_luong_thuc_te` | `INTEGER` | NN; CHECK >=0 | So luong kiem duoc. |
| `so_luong_chenh_lech` | `INTEGER` | NN | Thuc te tru so sach, duoc kiem tra. |
| `tinh_trang_kiem_ke` | `VARCHAR(24)` | NULL | TOT, HU_HONG, THAT_LAC, KHAC. |
| `nguyen_nhan` | `TEXT` | NULL | Giai trinh chenh lech. |
| `nguoi_dem_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi kiem. |

**Ràng buộc/index đề xuất:** index(don_vi_id,phieu_kiem_ke_id); luu bien dong dieu chinh sau duyet.


# 04. Khach hang, nhom khach va hoi vien

**Thứ tự thực hiện:** Giai doan 4 — ho so nguoi mua/nguoi muon va cac quyen loi.


## 39. `khach_hang`

**Mục đích:** Ho so khach mua, doc gia va khach tai quay  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_khach_hang` | `VARCHAR(50)` | NN | Ma khach trong don vi. |
| `tai_khoan_id` | `UUID` | NULL; FK tai_khoan.id | NULL neu khach tai quay chua dang ky. |
| `ho_ten` | `VARCHAR(200)` | NN | Ten khach/nguoi muon. |
| `email` | `VARCHAR(254)` | NULL | Email lien he da duoc khach dong y cung cap. |
| `so_dien_thoai` | `VARCHAR(30)` | NULL | So dien thoai chuan hoa. |
| `ngay_sinh` | `DATE` | NULL | Chi thu thap neu thuc su can va co co so xu ly. |
| `gioi_tinh_tu_khai` | `VARCHAR(40)` | NULL | Tuy chon, khong bat buoc. |
| `loai_khach_hang` | `VARCHAR(24)` | NN; DEFAULT 'CA_NHAN' | CA_NHAN, TO_CHUC. |
| `ten_to_chuc` | `VARCHAR(255)` | NULL | Ten co quan neu khach to chuc. |
| `ma_the_doc_gia` | `VARCHAR(80)` | NULL | Ma the doc gia in/quet. |
| `ngay_cap_the` | `DATE` | NULL | Ngay phat hanh the. |
| `ngay_het_han_the` | `DATE` | NULL | Het hieu luc the neu co. |
| `nguon_tao` | `VARCHAR(24)` | NN; DEFAULT 'TAI_QUAY' | TAI_QUAY, WEBSITE, NHAP_DU_LIEU. |
| `dong_y_nhan_tin_quang_cao` | `BOOLEAN` | NN; DEFAULT FALSE | Chi gui tin marketing neu duoc cho phep. |
| `ngay_dong_y` | `TIMESTAMPTZ` | NULL | Thoi diem ghi nhan dong y. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, TAM_KHOA_MUON, NGUNG_DUNG. |
| `ly_do_han_che_muon` | `TEXT` | NULL | Ly do nghiep vu can kiem soat va phan quyen. |
| `ghi_chu_noi_bo` | `TEXT` | NULL | Ghi chu chi nhan vien duoc cap quyen xem. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_khach_hang); UNIQUE(don_vi_id,ma_the_doc_gia) WHERE ma_the_doc_gia IS NOT NULL.

**Quy tắc nghiệp vụ:** Khong thu thap giay to tuy than neu khong thuc su can; thong tin nhay cam phai ma hoa/han che va co thoi han luu.


## 40. `dia_chi_khach_hang`

**Mục đích:** Nhieu dia chi giao sach/lien he cua khach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `khach_hang_id` | `UUID` | NN; FK khach_hang.id | Khach so huu. |
| `ten_nguoi_nhan` | `VARCHAR(200)` | NN | Nguoi nhan tai dia chi. |
| `so_dien_thoai_nhan` | `VARCHAR(30)` | NN | So de giao hang. |
| `loai_dia_chi` | `VARCHAR(24)` | NN; DEFAULT 'GIAO_HANG' | GIAO_HANG, LIEN_HE, HOA_DON. |
| `dia_chi_chi_tiet` | `VARCHAR(300)` | NN | Duong, so nha, can ho. |
| `ma_tinh_thanh` | `VARCHAR(20)` | NULL | Ma tinh/thanh. |
| `ten_tinh_thanh` | `VARCHAR(100)` | NULL | Ten tinh/thanh khi dat don. |
| `ma_phuong_xa` | `VARCHAR(20)` | NULL | Ma phuong/xa. |
| `ten_phuong_xa` | `VARCHAR(100)` | NULL | Ten phuong/xa. |
| `quoc_gia` | `CHAR(2)` | NN; DEFAULT 'VN' | Quoc gia. |
| `ghi_chu_giao_hang` | `VARCHAR(400)` | NULL | Huong dan giao hang. |
| `la_mac_dinh` | `BOOLEAN` | NN; DEFAULT FALSE | Dia chi mac dinh cua loai. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | An dia chi cu. |

**Ràng buộc/index đề xuất:** index(don_vi_id,khach_hang_id); chi mot mac dinh moi loai neu nghiep vu can.


## 41. `nhom_khach_hang`

**Mục đích:** Phan nhom khach de ap dung gia va chinh sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_nhom` | `VARCHAR(50)` | NN | Ma nhom. |
| `ten_nhom` | `VARCHAR(150)` | NN | Ten nhom. |
| `mo_ta` | `TEXT` | NULL | Dieu kien nhom. |
| `la_nhom_mac_dinh` | `BOOLEAN` | NN; DEFAULT FALSE | Nhom duoc gan tu dong. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, TAM_NGUNG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_nhom).


## 42. `khach_hang_nhom`

**Mục đích:** Gan khach vao nhieu nhom theo thoi han  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `khach_hang_id` | `UUID` | NN; FK khach_hang.id | Khach. |
| `nhom_khach_hang_id` | `UUID` | NN; FK nhom_khach_hang.id | Nhom. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN; DEFAULT now() | Hieu luc. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Het hieu luc. |
| `nguon_gan` | `VARCHAR(24)` | NN; DEFAULT 'THU_CONG' | THU_CONG, QUY_TAC, NHAP. |

**Ràng buộc/index đề xuất:** index(don_vi_id,khach_hang_id,ngay_ket_thuc).


## 43. `goi_hoi_vien`

**Mục đích:** Goi doc gia do tung don vi ban/cap mien phi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_goi` | `VARCHAR(50)` | NN | Ma goi trong don vi. |
| `ten_goi` | `VARCHAR(200)` | NN | Ten hien thi cho khach. |
| `mo_ta` | `TEXT` | NULL | Dien giai loi ich va dieu kien. |
| `gia_goi` | `NUMERIC(18,2)` | NN; DEFAULT 0; CHECK >=0 | Phi dang ky theo ky. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te phi goi. |
| `thoi_han_ngay` | `INTEGER` | NN; CHECK >0 | So ngay hieu luc tu khi kich hoat. |
| `so_luong_dang_ky_toi_da` | `INTEGER` | NULL; CHECK >=1 | Gioi han so hoi vien su dung. |
| `co_tu_dong_gia_han` | `BOOLEAN` | NN; DEFAULT FALSE | Chi gia han tu dong khi khach dong y. |
| `ngay_bat_dau_ban` | `TIMESTAMPTZ` | NULL | Bat dau mo ban goi. |
| `ngay_ket_thuc_ban` | `TIMESTAMPTZ` | NULL | Dung ban goi. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DANG_BAN, NGUNG_BAN. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_goi); khong sua gia/loi ich da xac nhan cua hoi vien cu.


## 44. `quyen_loi_hoi_vien`

**Mục đích:** Moi dong mot quyen loi/rang buoc cua goi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `goi_hoi_vien_id` | `UUID` | NN; FK goi_hoi_vien.id | Goi cha. |
| `ma_quyen_loi` | `VARCHAR(60)` | NN | Ma quyen loi trong goi. |
| `loai_quyen_loi` | `VARCHAR(40)` | NN | MIEN_PHI_MUON, HAN_MUC_MUON, TANG_NGAY, GIAM_GIA_BAN, GIAM_PHI_THUE, MIEN_COC. |
| `gia_tri_so` | `NUMERIC(18,4)` | NULL | Gia tri so/cu on/ngay/phan tram. |
| `gia_tri_chuoi` | `VARCHAR(200)` | NULL | Gia tri ky hieu neu khong phai so. |
| `don_vi_gia_tri` | `VARCHAR(24)` | NULL | CUON, NGAY, VND, PHAN_TRAM, LUOT. |
| `gioi_han_moi_ky` | `INTEGER` | NULL; CHECK >=0 | So luot duoc dung moi ky. |
| `pham_vi_ap_dung` | `JSONB` | NN; DEFAULT '{}' | Gioi han the loai, chi nhanh, offering (schema JSON ro rang). |
| `co_cong_don` | `BOOLEAN` | NN; DEFAULT FALSE | Co duoc cong voi uu dai khac. |
| `thu_tu_uu_tien` | `INTEGER` | NN; DEFAULT 0 | Thu tu neu nhieu loi ich phu hop. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_DUNG' | DANG_DUNG, TAM_NGUNG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,goi_hoi_vien_id,ma_quyen_loi); CHECK gia tri theo loai va don vi.


## 45. `hoi_vien_khach_hang`

**Mục đích:** Moi lan dang ky/mua goi cua khach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `khach_hang_id` | `UUID` | NN; FK khach_hang.id | Chu the su dung. |
| `goi_hoi_vien_id` | `UUID` | NN; FK goi_hoi_vien.id | Goi tai thoi diem dang ky. |
| `ma_dang_ky` | `VARCHAR(60)` | NN | Ma hoi vien/lan dang ky. |
| `ngay_dang_ky` | `TIMESTAMPTZ` | NN | Ngay xac nhan dang ky. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN | Bat dau quyen loi. |
| `ngay_het_han` | `TIMESTAMPTZ` | NN | Het quyen loi theo goi. |
| `gia_da_thoa_thuan` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia thuc te sau uu dai. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te thanh toan. |
| `quyen_loi_chot` | `JSONB` | NN; DEFAULT '{}' | Snapshot quyen loi da ban. |
| `so_lan_gia_han` | `INTEGER` | NN; DEFAULT 0 | So ky gia han da thuc hien. |
| `dong_y_tu_dong_gia_han` | `BOOLEAN` | NN; DEFAULT FALSE | Chap thuan cua khach. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_THANH_TOAN' | CHO_THANH_TOAN, HIEU_LUC, HET_HAN, TAM_DUNG, HUY. |
| `ngay_huy` | `TIMESTAMPTZ` | NULL | Thoi diem huy. |
| `ly_do_huy` | `TEXT` | NULL | Ly do huy/hoan. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_dang_ky); index(don_vi_id,khach_hang_id,ngay_het_han).


## 46. `lich_su_su_dung_quyen_loi`

**Mục đích:** Da tru va hoan lai quyen loi hoi vien theo giao dich  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `hoi_vien_khach_hang_id` | `UUID` | NN; FK hoi_vien_khach_hang.id | Goi dang su dung. |
| `quyen_loi_hoi_vien_id` | `UUID` | NN; FK quyen_loi_hoi_vien.id | Loai quyen loi. |
| `loai_giao_dich` | `VARCHAR(30)` | NN | SU_DUNG, HOAN_TRA, DIEU_CHINH. |
| `gia_tri_su_dung` | `NUMERIC(18,4)` | NN | Gia tri tru/cong co dau theo quy uoc. |
| `don_vi_gia_tri` | `VARCHAR(24)` | NN | CUON, LUOT, NGAY, VND, PHAN_TRAM. |
| `ky_ap_dung_tu` | `TIMESTAMPTZ` | NN | Dau ky theo doi han muc. |
| `ky_ap_dung_den` | `TIMESTAMPTZ` | NN | Cuoi ky. |
| `tham_chieu_loai` | `VARCHAR(30)` | NN | DON_BAN, CHI_TIET_PHIEU_MUON, PHIEU_THUE. |
| `tham_chieu_id` | `UUID` | NN | Id dong nghiep vu. |
| `idempotency_key` | `VARCHAR(120)` | NN | Khong tru loi ich 2 lan khi retry. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); cap nhat han muc bang transaction.


## 47. `lich_su_hoi_vien`

**Mục đích:** Lich su gia han, dong/m o, doi goi va huy hoi vien  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `hoi_vien_khach_hang_id` | `UUID` | NN; FK hoi_vien_khach_hang.id | Lan dang ky bi anh huong. |
| `loai_su_kien` | `VARCHAR(30)` | NN | KICH_HOAT, GIA_HAN, TAM_DUNG, TIEP_TUC, DOI_GOI, HUY, HET_HAN. |
| `trang_thai_truoc` | `VARCHAR(24)` | NULL | Trang thai cu. |
| `trang_thai_sau` | `VARCHAR(24)` | NN | Trang thai moi. |
| `ngay_het_han_truoc` | `TIMESTAMPTZ` | NULL | Han cu. |
| `ngay_het_han_sau` | `TIMESTAMPTZ` | NULL | Han moi. |
| `ly_do` | `TEXT` | NULL | Giai trinh/su kien. |
| `nguoi_thuc_hien_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nhan vien/tac vu. |
| `tham_chieu_thanh_toan_id` | `UUID` | NULL; FK thanh_toan.id | Giao dich phi goi neu co. |

**Ràng buộc/index đề xuất:** index(don_vi_id,hoi_vien_khach_hang_id,ngay_tao).


# 05. Gio hang, ban sach, giao hang va doi tra

**Thứ tự thực hiện:** Giai doan 5 — POS, website va don ban co the thanh toan.


## 48. `gio_hang`

**Mục đích:** Gio mua sach truc tuyen chua chot don  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | NULL voi khach an danh truoc dang nhap. |
| `ma_phien_khach` | `VARCHAR(120)` | NULL | Dinh danh ngau nhien da hash cua khach an danh. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Noi xuat sach du kien. |
| `kenh_ban` | `VARCHAR(24)` | NN; DEFAULT 'WEBSITE' | WEBSITE, UNG_DUNG, TAI_QUAY. |
| `ma_giam_gia_id` | `UUID` | NULL; FK ma_giam_gia.id | Ma uu dai dang tam ap dung. |
| `ngay_het_han` | `TIMESTAMPTZ` | NULL | TTL gio hang an danh. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_MO' | DANG_MO, DA_CHOT_DON, HET_HAN, DA_HUY. |

**Ràng buộc/index đề xuất:** index(don_vi_id,khach_hang_id,trang_thai); gio hang khong giu ton neu chua checkout.


## 49. `chi_tiet_gio_hang`

**Mục đích:** Dong sach nguoi dung dua vao gio  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `gio_hang_id` | `UUID` | NN; FK gio_hang.id | Gio cha. |
| `hinh_thuc_kinh_doanh_sach_id` | `UUID` | NN; FK hinh_thuc_kinh_doanh_sach.id | Phai la BAN. |
| `so_luong` | `INTEGER` | NN; CHECK >0 | So luong dat. |
| `gia_hien_thi` | `NUMERIC(18,2)` | NULL | Gia hien thi khi them; kiem tra lai khi checkout. |
| `ghi_chu` | `VARCHAR(300)` | NULL | Ghi chu dong gio. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,gio_hang_id,hinh_thuc_kinh_doanh_sach_id).


## 50. `don_ban_sach`

**Mục đích:** Don ban tai quay/online, thong tin gia va giao nhan da chot  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_don_hang` | `VARCHAR(60)` | NN | So don de tra cuu. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh xuat sach. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Cho phep khach le tai quay. |
| `gio_hang_id` | `UUID` | NULL; FK gio_hang.id | Nguon tu gio hang neu co. |
| `kenh_ban` | `VARCHAR(24)` | NN | TAI_QUAY, WEBSITE, UNG_DUNG, DOI_TAC. |
| `loai_nhan_hang` | `VARCHAR(24)` | NN | TAI_QUAY, GIAO_HANG. |
| `ten_nguoi_nhan` | `VARCHAR(200)` | NULL | Snapshot nguoi nhan thuc te. |
| `so_dien_thoai_nhan` | `VARCHAR(30)` | NULL | Snapshot so lien he giao hang. |
| `dia_chi_giao` | `JSONB` | NULL | Snapshot dia chi (cac truong da xac nhan). |
| `ghi_chu_khach` | `TEXT` | NULL | Yeu cau cua khach. |
| `ghi_chu_noi_bo` | `TEXT` | NULL | Ghi chu nhan vien. |
| `tong_tien_hang` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong truoc uu dai. |
| `tong_giam_gia` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong giam gia theo don va dong. |
| `phi_van_chuyen` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi giao hang da chot. |
| `tong_tien_phai_thu` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong khach can tra. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Ma tien te. |
| `trang_thai_don` | `VARCHAR(30)` | NN; DEFAULT 'CHO_XAC_NHAN' | CHO_XAC_NHAN, CHO_TT, DANG_XU_LY, DANG_GIAO, HOAN_TAT, HUY. |
| `trang_thai_thanh_toan` | `VARCHAR(30)` | NN; DEFAULT 'CHUA_THANH_TOAN' | CHUA_THANH_TOAN, MOT_PHAN, DA_THANH_TOAN, DA_HOAN. |
| `ngay_xac_nhan` | `TIMESTAMPTZ` | NULL | Thoi diem chot don. |
| `ngay_hoan_tat` | `TIMESTAMPTZ` | NULL | Hoan tat giao sach. |
| `ngay_huy` | `TIMESTAMPTZ` | NULL | Huy don. |
| `ly_do_huy` | `TEXT` | NULL | Ly do huy. |
| `nhan_vien_ban_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Thu ngan/nhan vien tao. |
| `nhan_vien_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet neu can. |
| `phien_ban_du_lieu` | `INTEGER` | NN; DEFAULT 1 | Chot trang thai chong cap nhat trung. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_don_hang); index(don_vi_id,chi_nhanh_id,ngay_tao).

**Quy tắc nghiệp vụ:** Trang thai thanh toan la read-model cua khoan phai thu/thanh toan; phai doi soat, khong cho sua tay tuy y.


## 51. `chi_tiet_don_ban`

**Mục đích:** Snapshot tung phien ban, gia va thue tren don ban  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `don_ban_sach_id` | `UUID` | NN; FK don_ban_sach.id | Don ban cha. |
| `hinh_thuc_kinh_doanh_sach_id` | `UUID` | NN; FK hinh_thuc_kinh_doanh_sach.id | Offering BAN tai luc chot. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | Phien ban da ban. |
| `ma_sach_chot` | `VARCHAR(60)` | NN | Ma phien ban tren chung tu. |
| `ten_sach_chot` | `VARCHAR(300)` | NN | Ten hien thi tai thoi diem ban. |
| `isbn_chot` | `VARCHAR(20)` | NULL | Ma ISBN tai thoi diem ban. |
| `so_luong` | `INTEGER` | NN; CHECK >0 | So cuon da dat. |
| `so_luong_da_giao` | `INTEGER` | NN; DEFAULT 0 | So cuon da giao. |
| `don_gia_niem_yet` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia goc. |
| `don_gia_ban` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia truoc giam dong. |
| `tien_giam_gia` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong giam dong. |
| `thue_suat` | `NUMERIC(6,3)` | NULL | Thue suat tren chung tu neu ap dung. |
| `tien_thue` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tien thue theo quy tac chot. |
| `thanh_tien` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia tri dong thuc te. |
| `gia_von_chot` | `NUMERIC(18,2)` | NULL | Gia von da xac dinh cho bao cao lai gop. |
| `ma_giam_gia_id` | `UUID` | NULL; FK ma_giam_gia.id | Uu dai dong neu co. |
| `ghi_chu` | `TEXT` | NULL | Dien giai thanh phan don. |

**Ràng buộc/index đề xuất:** index(don_vi_id,don_ban_sach_id); CHECK(so_luong_da_giao<=so_luong).


## 52. `giu_hang_ban`

**Mục đích:** Dat tru ton kho cho don ban chua xuat  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `don_ban_sach_id` | `UUID` | NN; FK don_ban_sach.id | Don dat hang. |
| `chi_tiet_don_ban_id` | `UUID` | NN; FK chi_tiet_don_ban.id | Dong dat hang. |
| `kho_id` | `UUID` | NN; FK kho.id | Kho giu cho. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban. |
| `so_luong_giu` | `INTEGER` | NN; CHECK >0 | Luong khong duoc ban cho don khac. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN | Bat dau giu cho. |
| `ngay_het_han` | `TIMESTAMPTZ` | NN | Thoi diem tu dong giai phong neu khong chot. |
| `ngay_giai_phong` | `TIMESTAMPTZ` | NULL | Giai phong khi huy/het han/giao. |
| `ly_do_giai_phong` | `VARCHAR(30)` | NULL | DA_GIAO, DA_HUY, HET_HAN. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_GIU' | DANG_GIU, DA_XUAT, DA_GIAI_PHONG. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong giu lap. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); reserve va tang ton giu cho trong cung transaction.


## 53. `lich_su_trang_thai_don`

**Mục đích:** Nhat ky thay doi trang thai don ban  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `don_ban_sach_id` | `UUID` | NN; FK don_ban_sach.id | Don bi tac dong. |
| `trang_thai_truoc` | `VARCHAR(30)` | NULL | Trang thai truoc. |
| `trang_thai_sau` | `VARCHAR(30)` | NN | Trang thai sau. |
| `ly_do` | `TEXT` | NULL | Ly do/ghi chu thao tac. |
| `nguoi_thuc_hien_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nhan vien, hoac NULL neu tac vu. |
| `nguon_thay_doi` | `VARCHAR(24)` | NN | TAI_QUAY, WEBSITE, HE_THONG, TICH_HOP. |

**Ràng buộc/index đề xuất:** index(don_vi_id,don_ban_sach_id,ngay_tao).


## 54. `giao_hang`

**Mục đích:** Dot giao ban giao hang cho don online hoac tai quay  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `don_ban_sach_id` | `UUID` | NN; FK don_ban_sach.id | Don ban. |
| `ma_giao_hang` | `VARCHAR(70)` | NN | Ma van don/bien ban. |
| `loai_giao` | `VARCHAR(24)` | NN | TAI_QUAY, NOI_BO, DON_VI_VAN_CHUYEN. |
| `don_vi_van_chuyen` | `VARCHAR(120)` | NULL | Ten ben van chuyen. |
| `ma_van_don_ben_ngoai` | `VARCHAR(120)` | NULL | Ma tracking neu co. |
| `nguoi_giao_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nhan vien ban giao. |
| `ten_nguoi_nhan` | `VARCHAR(200)` | NN | Snapshot nguoi nhan. |
| `so_dien_thoai_nhan` | `VARCHAR(30)` | NULL | Snapshot so nhan. |
| `dia_chi_giao` | `JSONB` | NULL | Snapshot dia chi da xac nhan. |
| `ngay_du_kien` | `TIMESTAMPTZ` | NULL | Thoi gian du kien. |
| `ngay_ban_giao` | `TIMESTAMPTZ` | NULL | Ban giao cho ben giao. |
| `ngay_giao_thanh_cong` | `TIMESTAMPTZ` | NULL | Khach nhan thanh cong. |
| `ngay_giao_that_bai` | `TIMESTAMPTZ` | NULL | Lan giao that bai gan nhat. |
| `so_lan_giao` | `SMALLINT` | NN; DEFAULT 0 | So lan da thu giao. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_GIAO' | CHO_GIAO, DANG_GIAO, THANH_CONG, THAT_BAI, HOAN. |
| `ghi_chu` | `TEXT` | NULL | Dien giai. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_giao_hang).


## 55. `chi_tiet_giao_hang`

**Mục đích:** So luong moi dong don duoc giao theo tung dot  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `giao_hang_id` | `UUID` | NN; FK giao_hang.id | Dot giao. |
| `chi_tiet_don_ban_id` | `UUID` | NN; FK chi_tiet_don_ban.id | Dong don ban. |
| `so_luong_giao` | `INTEGER` | NN; CHECK >0 | So cuon thuoc dot giao. |
| `so_luong_xac_nhan_nhan` | `INTEGER` | NN; DEFAULT 0 | So luong khach xac nhan. |
| `so_luong_hoan_ve` | `INTEGER` | NN; DEFAULT 0 | So luong giao khong thanh cong. |
| `ghi_chu` | `TEXT` | NULL | Tinh trang va chenh lech. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,giao_hang_id,chi_tiet_don_ban_id); tong giao khong vuot so luong dat.


## 56. `phieu_tra_hang`

**Mục đích:** Phieu khach tra sach da mua, co ly do va quy trinh duyet  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `don_ban_sach_id` | `UUID` | NN; FK don_ban_sach.id | Don goc. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh nhan tra. |
| `ma_phieu_tra` | `VARCHAR(60)` | NN | Ma phieu tra. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Khach mua/nguoi tra. |
| `ly_do_tra` | `VARCHAR(50)` | NN | LOI_SAN_PHAM, GIAO_SAI, KHACH_DOI_Y, KHAC. |
| `mo_ta_ly_do` | `TEXT` | NULL | Dien giai chi tiet. |
| `phuong_an_xu_ly` | `VARCHAR(30)` | NN | HOAN_TIEN, DOI_HANG, DOI_DIEM, TU_CHOI. |
| `tong_tien_du_kien_hoan` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tien hoan de xuat. |
| `tong_tien_da_hoan` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tien da hoan thuc te. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'CHO_KIEM_TRA' | CHO_KIEM_TRA, CHO_DUYET, DUYET, TU_CHOI, DA_NHAN, HOAN_TAT. |
| `nguoi_nhan_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nhan vien nhan hang. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet. |
| `ngay_nhan` | `TIMESTAMPTZ` | NULL | Luc nhan tra. |
| `ngay_hoan_tat` | `TIMESTAMPTZ` | NULL | Ket thuc nghiep vu. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phieu_tra); thong qua nhan thuc te moi nhap lai kho.


## 57. `chi_tiet_tra_hang`

**Mục đích:** Tung an ban/so luong tra trong phieu  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phieu_tra_hang_id` | `UUID` | NN; FK phieu_tra_hang.id | Phieu tra. |
| `chi_tiet_don_ban_id` | `UUID` | NN; FK chi_tiet_don_ban.id | Dong ban goc. |
| `so_luong_yeu_cau` | `INTEGER` | NN; CHECK >0 | Khach xin tra. |
| `so_luong_chap_nhan` | `INTEGER` | NN; DEFAULT 0 | So luong duoc duyet. |
| `so_luong_thuc_nhan` | `INTEGER` | NN; DEFAULT 0 | Da nhan thuc te. |
| `tinh_trang_nhan` | `VARCHAR(24)` | NULL | MOI, TOT, HU_HONG, KHAC. |
| `so_tien_hoan` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tien hoan cua dong. |
| `nhap_lai_kho` | `BOOLEAN` | NN; DEFAULT FALSE | Du dieu kien ban tiep. |
| `ly_do_tu_choi` | `TEXT` | NULL | Ly do khong nhan lai. |

**Ràng buộc/index đề xuất:** index(don_vi_id,phieu_tra_hang_id); tong tra qua cac phieu khong vuot so luong da ban.


## 58. `ma_giam_gia`

**Mục đích:** Ma uu dai ap dung vao don ban/hoi vien theo quy tac  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_giam_gia` | `VARCHAR(60)` | NN | Ma khach nhap hoac nhan tu dong. |
| `ten_chuong_trinh` | `VARCHAR(200)` | NN | Ten uu dai. |
| `loai_giam` | `VARCHAR(24)` | NN | SO_TIEN, PHAN_TRAM, MIEN_PHI_VAN_CHUYEN. |
| `gia_tri_giam` | `NUMERIC(18,2)` | NN; CHECK >=0 | So tien/phan tram. |
| `giam_toi_da` | `NUMERIC(18,2)` | NULL; CHECK >=0 | Tran neu giam theo phan tram. |
| `don_toi_thieu` | `NUMERIC(18,2)` | NULL; CHECK >=0 | Tong don toi thieu. |
| `so_luot_toi_da` | `INTEGER` | NULL; CHECK >0 | Tong so lan duoc su dung. |
| `so_luot_moi_khach` | `INTEGER` | NULL; CHECK >0 | Gioi han theo khach. |
| `pham_vi_ap_dung` | `JSONB` | NN; DEFAULT '{}' | Chi nhanh, the loai, sach, kenh, nhom khach. |
| `cho_cong_don` | `BOOLEAN` | NN; DEFAULT FALSE | Co cong voi uu dai khac. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN | Bat dau. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NN | Ket thuc. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, HOAT_DONG, TAM_DUNG, HET_HAN. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_giam_gia); CHECK(ngay_ket_thuc>ngay_bat_dau).


## 59. `su_dung_ma_giam_gia`

**Mục đích:** Nhat ky ma da giu, da dung va hoan luot  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ma_giam_gia_id` | `UUID` | NN; FK ma_giam_gia.id | Ma da su dung. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Nguoi su dung. |
| `don_ban_sach_id` | `UUID` | NULL; FK don_ban_sach.id | Don huong uu dai. |
| `loai_su_kien` | `VARCHAR(24)` | NN | GIU_LUOT, SU_DUNG, HOAN_LUOT. |
| `so_tien_giam` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Gia tri giam thuc te. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong su dung trung. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); su dung trong transaction chot don.


# 06. Chinh sach muon, dat truoc, muon/tra/gia han

**Thứ tự thực hiện:** Giai doan 6 — ba mo hinh muon dung chung cung kho.


## 60. `chinh_sach_muon`

**Mục đích:** Quy tac muon mien phi/cho thue co phi theo chi nhanh va nhom khach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_chinh_sach` | `VARCHAR(60)` | NN | Ma chinh sach. |
| `ten_chinh_sach` | `VARCHAR(200)` | NN | Ten hien thi. |
| `loai_chinh_sach` | `VARCHAR(24)` | NN | MUON_MIEN_PHI, THUE_CO_PHI. |
| `so_ngay_muon` | `INTEGER` | NN; CHECK >0 | Thoi han muon mac dinh. |
| `so_cuon_toi_da` | `INTEGER` | NN; CHECK >0 | Gioi han cuon dang muon theo chinh sach. |
| `so_lan_gia_han_toi_da` | `SMALLINT` | NN; DEFAULT 0 | So lan gia han mac dinh. |
| `so_ngay_moi_lan_gia_han` | `INTEGER` | NN; DEFAULT 0 | So ngay tang khi gia han. |
| `cho_gia_han_khi_co_nguoi_cho` | `BOOLEAN` | NN; DEFAULT FALSE | Co cho gia han neu co dat truoc khac. |
| `phi_thue_co_ban` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi co dinh moi cuon/giao dich. |
| `phi_thue_moi_ngay` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi theo ngay neu ap dung. |
| `phi_qua_han_moi_ngay` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi qua han theo ngay theo chinh sach. |
| `phi_qua_han_toi_da` | `NUMERIC(18,2)` | NULL | Tran phi qua han neu co. |
| `tien_coc_mac_dinh` | `NUMERIC(18,2)` | NN; DEFAULT 0 | C oc cho moi cuon. |
| `co_cho_tra_tung_phan` | `BOOLEAN` | NN; DEFAULT TRUE | Cho tra nhieu lan tren mot phieu. |
| `so_ngay_giu_sach` | `INTEGER` | NN; DEFAULT 2; CHECK >0 | Thoi han khach den nhan sau giu cho. |
| `so_ngay_nhac_truoc_han` | `INTEGER` | NN; DEFAULT 2; CHECK >=0 | So ngay nhac truoc han tra. |
| `co_yeu_cau_duyet` | `BOOLEAN` | NN; DEFAULT FALSE | Thu thu can duyet truoc khi giu. |
| `quy_tac_lam_tron_phi` | `VARCHAR(24)` | NN; DEFAULT 'THEO_NGAY' | THEO_NGAY, THEO_GIO, KY_CO_DINH. |
| `ngay_hieu_luc_tu` | `TIMESTAMPTZ` | NN | Bat dau hieu luc. |
| `ngay_hieu_luc_den` | `TIMESTAMPTZ` | NULL | Het hieu luc. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, HIEU_LUC, NGUNG_DUNG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_chinh_sach); CHECK(phi_...>=0) va khong cho sua giao dich da chot.


## 61. `chinh_sach_muon_pham_vi`

**Mục đích:** Nhom sach, chi nhanh/nhom khach duoc ap dung chinh sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `chinh_sach_muon_id` | `UUID` | NN; FK chinh_sach_muon.id | Chinh sach. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | NULL neu tat ca chi nhanh. |
| `the_loai_id` | `UUID` | NULL; FK the_loai_sach.id | NULL neu tat ca the loai. |
| `phien_ban_sach_id` | `UUID` | NULL; FK phien_ban_sach.id | An ban cu the uu tien. |
| `nhom_khach_hang_id` | `UUID` | NULL; FK nhom_khach_hang.id | Nhom khach. |
| `thu_tu_uu_tien` | `INTEGER` | NN; DEFAULT 0 | Xu ly trung pham vi. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NULL | Bat dau neu khac chinh sach. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Het ap dung. |

**Ràng buộc/index đề xuất:** index(don_vi_id,chinh_sach_muon_id); dinh nghia thu tu uu tien khi nhieu quy tac trung.


## 62. `yeu_cau_muon`

**Mục đích:** Dang ky muon/cho thue truoc khi nhan sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_yeu_cau` | `VARCHAR(60)` | NN | Ma yeu cau. |
| `khach_hang_id` | `UUID` | NN; FK khach_hang.id | Nguoi dang ky. |
| `chi_nhanh_nhan_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh du kien nhan. |
| `hinh_thuc_muon` | `VARCHAR(24)` | NN | MUON_MIEN_PHI, THUE_CO_PHI, QUYEN_LOI_HOI_VIEN. |
| `hoi_vien_khach_hang_id` | `UUID` | NULL; FK hoi_vien_khach_hang.id | Goi su dung neu co. |
| `ngay_muon_du_kien` | `DATE` | NULL | Ngay den nhan du kien. |
| `ngay_tra_du_kien` | `DATE` | NULL | Han khach de nghi. |
| `ghi_chu_khach` | `TEXT` | NULL | Yeu cau them. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'CHO_DUYET' | CHO_DUYET, CHO_SACH, DA_GIU, SAN_SANG_NHAN, DA_CHUYEN_PHIEU, TU_CHOI, HUY. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Thu thu duyet. |
| `ngay_duyet` | `TIMESTAMPTZ` | NULL | Thoi diem duyet. |
| `ly_do_tu_choi` | `TEXT` | NULL | Giai trinh tu choi. |
| `ngay_het_han_nhan` | `TIMESTAMPTZ` | NULL | Han khach den nhan. |
| `phieu_muon_sach_id` | `UUID` | NULL; FK phieu_muon_sach.id | Phieu da ban giao. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_yeu_cau); index(don_vi_id,khach_hang_id,trang_thai).


## 63. `chi_tiet_yeu_cau_muon`

**Mục đích:** Moi dong phien ban va so luong khach muon  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `yeu_cau_muon_id` | `UUID` | NN; FK yeu_cau_muon.id | Yeu cau. |
| `hinh_thuc_kinh_doanh_sach_id` | `UUID` | NN; FK hinh_thuc_kinh_doanh_sach.id | Offering da chon. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | Phien ban yeu cau. |
| `so_luong` | `INTEGER` | NN; CHECK >0 | So cuon muon. |
| `so_luong_da_phan_bo` | `INTEGER` | NN; DEFAULT 0 | So cuon da giu duoc. |
| `phi_du_kien` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi uoc tinh chua chot. |
| `coc_du_kien` | `NUMERIC(18,2)` | NN; DEFAULT 0 | C oc du kien. |
| `ghi_chu` | `TEXT` | NULL | Can cu lua chon. |

**Ràng buộc/index đề xuất:** index(don_vi_id,yeu_cau_muon_id); tong so luong phan bo<=so_luong.


## 64. `dat_truoc_sach`

**Mục đích:** Hang doi/giu ban sao; chan cap trung cho khach khac  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `yeu_cau_muon_id` | `UUID` | NULL; FK yeu_cau_muon.id | Nguon yeu cau. |
| `chi_tiet_yeu_cau_muon_id` | `UUID` | NULL; FK chi_tiet_yeu_cau_muon.id | Dong yeu cau. |
| `khach_hang_id` | `UUID` | NN; FK khach_hang.id | Nguoi cho. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Noi nhan. |
| `phien_ban_sach_id` | `UUID` | NN; FK phien_ban_sach.id | An ban duoc giu. |
| `ban_sao_sach_id` | `UUID` | NULL; FK ban_sao_sach.id | NULL neu xep hang theo dau sach. |
| `thu_tu_hang_cho` | `INTEGER` | NULL | Thu tu khi chua co ban sao. |
| `loai_dat_truoc` | `VARCHAR(24)` | NN | HANG_CHO, GIU_SACH. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN | Bat dau cho/giu. |
| `ngay_het_han` | `TIMESTAMPTZ` | NULL | Het thoi gian giu sau khi co sach. |
| `ngay_thong_bao_co_sach` | `TIMESTAMPTZ` | NULL | Lan dau thong bao co sach. |
| `ngay_nhan_sach` | `TIMESTAMPTZ` | NULL | Khach nhan sach. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_CHO' | DANG_CHO, DANG_GIU, DA_NHAN, HET_HAN, HUY. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong dat trung khi retry. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); unique mot dat_truoc DANG_GIU tren moi ban_sao_sach_id.


## 65. `phieu_muon_sach`

**Mục đích:** Phieu ban giao sach co the gom nhieu cuon va nhieu lan tra  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_phieu_muon` | `VARCHAR(60)` | NN | So phieu. |
| `khach_hang_id` | `UUID` | NN; FK khach_hang.id | Khach chiu trach nhiem. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh ban giao. |
| `yeu_cau_muon_id` | `UUID` | NULL; FK yeu_cau_muon.id | Nguon dang ky neu co. |
| `hoi_vien_khach_hang_id` | `UUID` | NULL; FK hoi_vien_khach_hang.id | Goi duoc ap dung. |
| `loai_phieu` | `VARCHAR(24)` | NN | MUON_MIEN_PHI, THUE_CO_PHI, HON_HOP. |
| `tong_so_cuon` | `INTEGER` | NN; DEFAULT 0 | Tong so cuon trong phieu. |
| `tong_phi_thue` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong phi thue chot. |
| `tong_tien_coc` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong coc phai thu. |
| `tong_phi_phat_sinh` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Khoan phat sinh da chot. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'CHO_BAN_GIAO' | CHO_BAN_GIAO, DANG_MUON, TRA_MOT_PHAN, DA_TRA_HET, CHO_QUYET_TOAN, HOAN_TAT, HUY. |
| `nhan_vien_ban_giao_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Thu thu ban giao. |
| `ngay_ban_giao` | `TIMESTAMPTZ` | NULL | Thoi diem ban giao. |
| `ngay_hoan_tat` | `TIMESTAMPTZ` | NULL | Thoi diem da tra va quyet toan. |
| `ngay_huy` | `TIMESTAMPTZ` | NULL | Huy truoc khi giao. |
| `ly_do_huy` | `TEXT` | NULL | Ly do huy. |
| `ghi_chu` | `TEXT` | NULL | Ghi chu giao nhan. |
| `phien_ban_du_lieu` | `INTEGER` | NN; DEFAULT 1 | Lock logic khi tra tung phan. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phieu_muon); khong cho HOAN_TAT khi con cuon chua tra/chua xu ly.


## 66. `chi_tiet_phieu_muon`

**Mục đích:** Moi dong ban sao da ban giao va chinh sach chot  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phieu_muon_sach_id` | `UUID` | NN; FK phieu_muon_sach.id | Phieu cha. |
| `ban_sao_sach_id` | `UUID` | NN; FK ban_sao_sach.id | Cuon duoc ban giao. |
| `hinh_thuc_kinh_doanh_sach_id` | `UUID` | NN; FK hinh_thuc_kinh_doanh_sach.id | Offering ap dung. |
| `chinh_sach_muon_id` | `UUID` | NN; FK chinh_sach_muon.id | Chinh sach goc. |
| `hoi_vien_khach_hang_id` | `UUID` | NULL; FK hoi_vien_khach_hang.id | Hoi vien thuc su su dung. |
| `ngay_muon` | `TIMESTAMPTZ` | NN | Thoi diem bat dau tinh han. |
| `han_tra` | `TIMESTAMPTZ` | NN | Han tra da xac nhan. |
| `ngay_tra_thuc_te` | `TIMESTAMPTZ` | NULL | Lan cuoi tra cuon. |
| `so_lan_gia_han` | `SMALLINT` | NN; DEFAULT 0 | So lan da gia han. |
| `phi_thue_chot` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi thue cuon nay. |
| `tien_coc_chot` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Coc cho cuon nay. |
| `phi_qua_han_da_chot` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi qua han tai lan doi soat. |
| `tinh_trang_khi_giao` | `VARCHAR(24)` | NN | Snapshot tinh trang khi giao. |
| `tinh_trang_khi_tra` | `VARCHAR(24)` | NULL | Snapshot khi nhan lai. |
| `chinh_sach_ap_dung` | `JSONB` | NN; DEFAULT '{}' | Snapshot so ngay, phi, c oc, gia han, chiet khau. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_MUON' | DANG_MUON, DA_TRA, THAT_LAC, XU_LY_BOI_THUONG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,phieu_muon_sach_id,ban_sao_sach_id); partial unique ban_sao_sach_id khi status DANG_MUON.

**Quy tắc nghiệp vụ:** Han tra ngay giao da chot khong tu dong doi theo chinh sach/g oi hoi vien moi.


## 67. `lich_su_gia_han`

**Mục đích:** Moi yeu cau va lan gia han cuon sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `chi_tiet_phieu_muon_id` | `UUID` | NN; FK chi_tiet_phieu_muon.id | Cuon muon. |
| `nguoi_yeu_cau` | `VARCHAR(24)` | NN | KHACH_HANG, THU_THU, HE_THONG. |
| `han_tra_cu` | `TIMESTAMPTZ` | NN | Han truoc gia han. |
| `han_tra_moi` | `TIMESTAMPTZ` | NN | Han sau neu duoc duy et. |
| `phi_gia_han` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi phat sinh neu co. |
| `trang_thai` | `VARCHAR(24)` | NN | CHO_DUYET, DUYET, TU_CHOI. |
| `ly_do_yeu_cau` | `TEXT` | NULL | Ly do gia han. |
| `ly_do_tu_choi` | `TEXT` | NULL | Ly do khong cho gia han. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet. |
| `ngay_duyet` | `TIMESTAMPTZ` | NULL | Luc phan hoi. |

**Ràng buộc/index đề xuất:** index(don_vi_id,chi_tiet_phieu_muon_id,ngay_tao); CHECK(han_tra_moi>han_tra_cu) khi duyet.


## 68. `phieu_tra_sach`

**Mục đích:** Moi dot nhan tra tren mot phieu muon  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_phieu_tra` | `VARCHAR(60)` | NN | Ma giao dich tra. |
| `phieu_muon_sach_id` | `UUID` | NN; FK phieu_muon_sach.id | Phieu muon goc. |
| `chi_nhanh_nhan_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh nhan sach. |
| `ngay_nhan` | `TIMESTAMPTZ` | NN | Thoi diem nhan thuc te. |
| `nhan_vien_nhan_id` | `UUID` | NN; FK thanh_vien_don_vi.id | Thu thu tiep nhan. |
| `tong_so_cuon_nhan` | `INTEGER` | NN; DEFAULT 0 | So cuon thuoc dot tra. |
| `tong_phi_phat_sinh` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi dot tra. |
| `tong_coc_du_kien_hoan` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Du kien hoan sau kiem tra. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'DANG_KIEM_TRA' | DANG_KIEM_TRA, CHO_QUYET_TOAN, DA_QUYET_TOAN, HUY. |
| `ghi_chu` | `TEXT` | NULL | Bien ban tiep nhan. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phieu_tra); mot dot tra co the chi mot phan phieu muon.


## 69. `chi_tiet_phieu_tra`

**Mục đích:** Ket qua kiem tra tung ban sao trong dot tra  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phieu_tra_sach_id` | `UUID` | NN; FK phieu_tra_sach.id | Dot nhan tra. |
| `chi_tiet_phieu_muon_id` | `UUID` | NN; FK chi_tiet_phieu_muon.id | Cuon thuoc phieu muon. |
| `ban_sao_sach_id` | `UUID` | NN; FK ban_sao_sach.id | Cuon da kiem tra. |
| `ngay_tra_thuc_te` | `TIMESTAMPTZ` | NN | Moc tinh qua han. |
| `so_ngay_qua_han` | `INTEGER` | NN; DEFAULT 0; CHECK >=0 | So ngay tre theo quy tac da chot. |
| `tinh_trang_khi_nhan` | `VARCHAR(24)` | NN | TOT, CU, HU_HONG, THAT_LAC. |
| `mo_ta_hu_hong` | `TEXT` | NULL | Ghi nhan thay doi tinh trang. |
| `anh_minh_chung_id` | `UUID` | NULL; FK tep_dinh_kem.id | Bang chung neu can. |
| `phi_qua_han` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi qua han cuon nay. |
| `phi_hu_hong` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi hu hong duoc xac nhan. |
| `phi_khac` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Khoan khac hop le. |
| `tien_coc_duoc_hoan` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Khoan duoc hoan cho cuon nay. |
| `trang_thai_xu_ly` | `VARCHAR(24)` | NN; DEFAULT 'CHO_XU_LY' | CHO_XU_LY, DA_XU_LY, CHO_KHI_EU_NAI. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,chi_tiet_phieu_muon_id) WHERE trang_thai_xu_ly='DA_XU_LY'; khong nhan tra hai lan 1 cuon.


## 70. `phi_phat_sinh_muon`

**Mục đích:** Dong phi gia han, qua han, hu hong hoac boi thuong  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `chi_tiet_phieu_muon_id` | `UUID` | NN; FK chi_tiet_phieu_muon.id | Cuon phat sinh. |
| `chi_tiet_phieu_tra_id` | `UUID` | NULL; FK chi_tiet_phieu_tra.id | Dot tra neu co. |
| `loai_phi` | `VARCHAR(30)` | NN | GIA_HAN, QUA_HAN, HU_HONG, THAT_LAC, KHAC. |
| `so_tien_de_xuat` | `NUMERIC(18,2)` | NN; CHECK >=0 | Tien truoc khi duyet. |
| `so_tien_duyet` | `NUMERIC(18,2)` | NULL; CHECK >=0 | Tien chinh thuc phai thu. |
| `ly_do` | `TEXT` | NN | Co so tinh phi/boi thuong. |
| `nguoi_de_xuat_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi de xuat. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet. |
| `ngay_duyet` | `TIMESTAMPTZ` | NULL | Luc duyet. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_DUYET' | CHO_DUYET, DA_DUYET, TU_CHOI, DA_HUY. |
| `khoan_phai_thu_id` | `UUID` | NULL; FK khoan_phai_thu.id | Khoan phai thu duoc tao sau duyet. |

**Ràng buộc/index đề xuất:** index(don_vi_id,chi_tiet_phieu_muon_id,trang_thai); khong ghi nhan doanh thu truoc khi duyet.


## 71. `lich_su_trang_thai_muon`

**Mục đích:** Nhat ky thay doi phieu muon hoac cuon sach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `phieu_muon_sach_id` | `UUID` | NN; FK phieu_muon_sach.id | Phieu muon. |
| `chi_tiet_phieu_muon_id` | `UUID` | NULL; FK chi_tiet_phieu_muon.id | Cuon neu thay doi rieng. |
| `trang_thai_truoc` | `VARCHAR(30)` | NULL | Trang thai cu. |
| `trang_thai_sau` | `VARCHAR(30)` | NN | Trang thai moi. |
| `nguon_thay_doi` | `VARCHAR(24)` | NN | NHAN_VIEN, KHACH_HANG, HE_THONG. |
| `nguoi_thuc_hien_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi thao tac. |
| `ly_do` | `TEXT` | NULL | Ly do/chung tu. |

**Ràng buộc/index đề xuất:** index(don_vi_id,phieu_muon_sach_id,ngay_tao).


# 07. Tai chinh, thanh toan, cong no va tien coc

**Thứ tự thực hiện:** Giai doan 7 — thong nhat so tien phai thu va giao dich thu/hoan.


## 72. `khoan_phai_thu`

**Mục đích:** Khoan khach can tra, bao gom phi ban sach, thue, hoi vien, phi khac va coc  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_khoan` | `VARCHAR(70)` | NN | Ma khoan phai thu de doi soat. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Khach phai tra; co the NULL neu khach le. |
| `loai_khoan` | `VARCHAR(30)` | NN | BAN_SACH, PHI_THUE, PHI_HOI_VIEN, PHI_QUA_HAN, BOI_THUONG, TIEN_COC, VAN_CHUYEN, KHAC. |
| `tham_chieu_loai` | `VARCHAR(50)` | NN | DON_BAN, CHI_TIET_PHIEU_MUON, HOI_VIEN, PHI_PHAT_SINH. |
| `tham_chieu_id` | `UUID` | NN | Id nghiep vu tao khoan, co the la dong chi tiet. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | Chi nhanh phat sinh. |
| `so_tien_goc` | `NUMERIC(18,2)` | NN; CHECK >=0 | So tien duoc chot luc tao. |
| `so_tien_dieu_chinh` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tang/giam hop le, co dau. |
| `so_tien_da_thu` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong tien da phan bo vao khoan. |
| `so_tien_da_hoan` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong tien da hoan thuoc khoan. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Ma tien te. |
| `han_thanh_toan` | `TIMESTAMPTZ` | NULL | Han can thu. |
| `ngay_ghi_nhan` | `TIMESTAMPTZ` | NN | Moc phat sinh nghia vu. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHUA_THU' | CHUA_THU, THU_MOT_PHAN, DA_THU, MIEN_GIAM, HUY. |
| `ly_do_dieu_chinh` | `TEXT` | NULL | Bat buoc neu sua so tien da chot. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_khoan); index(don_vi_id,khach_hang_id,trang_thai).

**Quy tắc nghiệp vụ:** TIEN_COC la nghia vu hoan tra, khong phai doanh thu; doi soat voi giao_dich_tien_coc.


## 73. `thanh_toan`

**Mục đích:** Lan khach chuyen tien/tra tien mat; khong luu thong tin the nhay cam  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_thanh_toan` | `VARCHAR(70)` | NN | Ma giao dich noi bo. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Khach tra tien. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | Noi thu tien. |
| `phuong_thuc` | `VARCHAR(30)` | NN | TIEN_MAT, CHUYEN_KHOAN, QR, THE, VI_DIEN_TU, KHAC. |
| `kenh_thanh_toan` | `VARCHAR(24)` | NN | TAI_QUAY, TRUC_TUYEN, CHUYEN_KHOAN, DOI_TAC. |
| `cong_thanh_toan` | `VARCHAR(80)` | NULL | Provider neu thanh toan dien tu. |
| `ma_giao_dich_ben_ngoai` | `VARCHAR(160)` | NULL | Ma tu provider cho doi soat. |
| `ma_yeu_cau_ben_ngoai` | `VARCHAR(160)` | NULL | Merchant request/order id neu co. |
| `so_tien` | `NUMERIC(18,2)` | NN; CHECK >0 | Tong so tien khach thuc thanh toan. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Ma tien te. |
| `so_tien_phi_provider` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi provider chi tiet cho bao cao. |
| `thoi_diem_khach_tra` | `TIMESTAMPTZ` | NULL | Luc khach thuc hien. |
| `thoi_diem_xac_nhan` | `TIMESTAMPTZ` | NULL | Luc xac nhan da nhan duoc tien. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'CHO_XAC_NHAN' | CHO_XAC_NHAN, DANG_XU_LY, THANH_CONG, THAT_BAI, DA_HUY, DA_HOAN_MOT_PHAN, DA_HOAN. |
| `noi_dung_chuyen_khoan` | `VARCHAR(300)` | NULL | Noi dung doi soat, khong dat bi mat. |
| `anh_bien_nhan_tep_id` | `UUID` | NULL; FK tep_dinh_kem.id | Anh chung tu neu khach tai len. |
| `nhan_vien_thu_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nhan vien xac nhan tai quay. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong thu/ghi nhan thanh toan trung. |
| `ly_do_that_bai` | `TEXT` | NULL | Ma/ly do that bai da loc du lieu nhay cam. |
| `phien_ban_du_lieu` | `INTEGER` | NN; DEFAULT 1 | Chot trang thai dong thoi. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_thanh_toan); UNIQUE(don_vi_id,idempotency_key); UNIQUE(cong_thanh_toan,ma_giao_dich_ben_ngoai) WHERE ma_giao_dich_ben_ngoai IS NOT NULL.

**Quy tắc nghiệp vụ:** Ket qua provider phai xac minh chu ky/idempotency, khong tin redirect callback client.


## 74. `phan_bo_thanh_toan`

**Mục đích:** Phan bo mot giao dich thanh toan vao nhieu khoan phai thu  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `thanh_toan_id` | `UUID` | NN; FK thanh_toan.id | Lan nhan tien. |
| `khoan_phai_thu_id` | `UUID` | NN; FK khoan_phai_thu.id | Khoan duoc tra. |
| `so_tien_phan_bo` | `NUMERIC(18,2)` | NN; CHECK >0 | So tien cua lan thanh toan vao khoan. |
| `loai_phan_bo` | `VARCHAR(24)` | NN; DEFAULT 'THU_TIEN' | THU_TIEN, DIEU_CHINH_DAO. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong phan bo trung. |
| `nguoi_phan_bo_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi thuc hien neu thu cong. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); tong phan bo <= so tien thanh_toan da thanh cong.


## 75. `giao_dich_tien_coc`

**Mục đích:** So cai tien coc thu/hoan/khau tru cho tung cuon/phieu  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ma_giao_dich_coc` | `VARCHAR(70)` | NN | Ma dong tien coc. |
| `khach_hang_id` | `UUID` | NN; FK khach_hang.id | Chu so huu tien coc. |
| `phieu_muon_sach_id` | `UUID` | NN; FK phieu_muon_sach.id | Phieu lien quan. |
| `chi_tiet_phieu_muon_id` | `UUID` | NULL; FK chi_tiet_phieu_muon.id | Cuon lien quan neu c oc theo cuon. |
| `khoan_phai_thu_id` | `UUID` | NULL; FK khoan_phai_thu.id | Khoan c oc goc. |
| `thanh_toan_id` | `UUID` | NULL; FK thanh_toan.id | Lan thu coc. |
| `hoan_tien_id` | `UUID` | NULL; FK hoan_tien.id | Lan hoan coc. |
| `loai_giao_dich` | `VARCHAR(24)` | NN | THU_COC, HOAN_COC, KHAU_TRU, DIEU_CHINH. |
| `so_tien` | `NUMERIC(18,2)` | NN; CHECK >0 | Gia tri dong. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Ma tien te. |
| `ly_do` | `TEXT` | NULL | Bat buoc neu khau tru/dieu chinh. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi phe duyet khau tru. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong hoan/thu trung. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_giao_dich_coc); UNIQUE(don_vi_id,idempotency_key).

**Quy tắc nghiệp vụ:** So du coc = thu coc - hoan coc - khau tru + dieu chinh; tinh tu so cai, khong luu so du tuy tien.


## 76. `hoan_tien`

**Mục đích:** Yeu cau/lenh hoan tien mua sach, phi thue, coc hoac hoi vien  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_hoan_tien` | `VARCHAR(70)` | NN | Ma hoan tien. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Nguoi nhan hoan. |
| `thanh_toan_goc_id` | `UUID` | NULL; FK thanh_toan.id | Thanh toan goc neu hoan qua provider. |
| `phuong_thuc_hoan` | `VARCHAR(30)` | NN | TIEN_MAT, CHUYEN_KHOAN, VE_NGUON, DOI_DIEM. |
| `cong_thanh_toan` | `VARCHAR(80)` | NULL | Provider hoan. |
| `ma_hoan_ben_ngoai` | `VARCHAR(160)` | NULL | Ma provider hoan. |
| `so_tien_hoan` | `NUMERIC(18,2)` | NN; CHECK >0 | Tong tien duoc hoan. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Ma tien te. |
| `ly_do_hoan` | `TEXT` | NN | Ly do hop le. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'CHO_DUYET' | CHO_DUYET, DA_DUYET, DANG_HOAN, THANH_CONG, THAT_BAI, TU_CHOI, HUY. |
| `nguoi_de_xuat_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi de xuat. |
| `nguoi_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet. |
| `ngay_duyet` | `TIMESTAMPTZ` | NULL | Luc phe duyet. |
| `ngay_hoan_thanh_cong` | `TIMESTAMPTZ` | NULL | Luc tien duoc hoan xac nhan. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong lenh hoan trung. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_hoan_tien); UNIQUE(don_vi_id,idempotency_key).


## 77. `phan_bo_hoan_tien`

**Mục đích:** Phan bo tien hoan vao don/khoan phai thu cu the  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `hoan_tien_id` | `UUID` | NN; FK hoan_tien.id | Lenh hoan. |
| `khoan_phai_thu_id` | `UUID` | NN; FK khoan_phai_thu.id | Khoan goc. |
| `so_tien` | `NUMERIC(18,2)` | NN; CHECK >0 | So tien hoan cho khoan. |
| `loai_phan_bo` | `VARCHAR(24)` | NN | HOAN_TIEN, HOAN_COC, DIEU_CHINH. |
| `idempotency_key` | `VARCHAR(120)` | NN | Khong phan bo lap. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); tong phan bo <= so_tien_hoan.


## 78. `phieu_thu_chi`

**Mục đích:** Chung tu quy tien mat/thu chi noi bo cua chi nhanh  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_phieu` | `VARCHAR(70)` | NN | Ma phieu. |
| `chi_nhanh_id` | `UUID` | NN; FK chi_nhanh.id | Chi nhanh phat sinh. |
| `loai_phieu` | `VARCHAR(20)` | NN | THU, CHI. |
| `loai_nghiep_vu` | `VARCHAR(30)` | NN | BAN_HANG, THUE, COC, HOAN_TIEN, DIEU_CHINH, KHAC. |
| `thanh_toan_id` | `UUID` | NULL; FK thanh_toan.id | Giao dich thu lien quan. |
| `hoan_tien_id` | `UUID` | NULL; FK hoan_tien.id | Hoan tien lien quan. |
| `so_tien` | `NUMERIC(18,2)` | NN; CHECK >0 | So tien tren phieu. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te. |
| `ten_nguoi_nop_nhan` | `VARCHAR(200)` | NULL | Snapshot nguoi nop/nhan. |
| `ly_do` | `TEXT` | NN | Dien giai. |
| `nhan_vien_lap_id` | `UUID` | NN; FK thanh_vien_don_vi.id | Nguoi lap. |
| `nhan_vien_duyet_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi duyet. |
| `ngay_duyet` | `TIMESTAMPTZ` | NULL | Luc duyet. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DA_DUYET, DA_GHI_SO, HUY. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_phieu); khong sua so tien cua phieu da ghi so, tao chung tu dao neu can.


## 79. `doi_soat_thanh_toan`

**Mục đích:** Dot doi soat provider/ngan hang voi giao dich noi bo  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | Chi nhanh neu doi soat rieng. |
| `ma_dot_doi_soat` | `VARCHAR(70)` | NN | Ma dot. |
| `nguon_doi_soat` | `VARCHAR(40)` | NN | NGAN_HANG, CONG_TT, QUY_TIEN_MAT. |
| `ten_doi_tac` | `VARCHAR(120)` | NULL | Ngan hang/provider. |
| `ky_tu` | `TIMESTAMPTZ` | NN | Bat dau ky. |
| `ky_den` | `TIMESTAMPTZ` | NN | Ket thuc ky. |
| `tong_so_giao_dich` | `INTEGER` | NN; DEFAULT 0 | Tong ban ghi nguon. |
| `tong_so_tien` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tong tien nguon. |
| `so_giao_dich_khop` | `INTEGER` | NN; DEFAULT 0 | So giao dich khop. |
| `so_giao_dich_lech` | `INTEGER` | NN; DEFAULT 0 | So giao dich lech. |
| `chenh_lech_tien` | `NUMERIC(18,2)` | NN; DEFAULT 0 | So chenh lech thu chi. |
| `tep_doi_soat_id` | `UUID` | NULL; FK tep_dinh_kem.id | File doi soat luu an toan. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DANG_DOI_SOAT, CHO_XU_LY, DA_CHOT. |
| `nguoi_chot_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Nguoi chot dot. |
| `ngay_chot` | `TIMESTAMPTZ` | NULL | Luc chot. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_dot_doi_soat); CHECK(ky_den>ky_tu).


## 80. `su_kien_thanh_toan`

**Mục đích:** Idempotent webhook/callback/doi soat tu provider  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `cong_thanh_toan` | `VARCHAR(80)` | NN | Ten provider. |
| `ma_su_kien_ben_ngoai` | `VARCHAR(160)` | NN | Event id do provider cung cap. |
| `loai_su_kien` | `VARCHAR(80)` | NN | Payment success, failure, refund, chargeback. |
| `ma_giao_dich_ben_ngoai` | `VARCHAR(160)` | NULL | Ma lien ket thanh_toan neu co. |
| `thanh_toan_id` | `UUID` | NULL; FK thanh_toan.id | Thanh toan noi bo da tim duoc. |
| `hoan_tien_id` | `UUID` | NULL; FK hoan_tien.id | Hoan tien noi bo neu co. |
| `chu_ky_hop_le` | `BOOLEAN` | NN; DEFAULT FALSE | Ket qua xac thuc chu ky duoc ghi nhan. |
| `hash_noi_dung` | `CHAR(64)` | NN | SHA-256 payload de doi chieu. |
| `noi_dung_da_loc` | `JSONB` | NULL | Payload da bo secret/PII khong can thiet. |
| `ngay_provider_gui` | `TIMESTAMPTZ` | NULL | Moc thoi gian tu provider. |
| `ngay_xu_ly` | `TIMESTAMPTZ` | NULL | Luc xu ly thanh cong. |
| `trang_thai_xu_ly` | `VARCHAR(24)` | NN; DEFAULT 'MOI' | MOI, DA_XU_LY, LOI, BO_QUA. |
| `ma_loi` | `VARCHAR(100)` | NULL | Ma loi xu ly. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,cong_thanh_toan,ma_su_kien_ben_ngoai); khong tin payload chua xac thuc.


# 08. Thong bao va kenh gui

**Thứ tự thực hiện:** Giai doan 8 — email/thong bao m uon-tra-don-hang-hoi-vien.


## 81. `mau_thong_bao`

**Mục đích:** Template thong bao theo su kien va ngon ngu  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_mau` | `VARCHAR(80)` | NN | VD LOAN_DUE_SOON, ORDER_PAID. |
| `ten_mau` | `VARCHAR(160)` | NN | Ten de quan tri. |
| `loai_su_kien` | `VARCHAR(60)` | NN | Ma su kien nghiep vu kich hoat. |
| `kenh_mac_dinh` | `VARCHAR(24)` | NN | IN_APP, EMAIL, SMS, PUSH. |
| `ngon_ngu` | `VARCHAR(10)` | NN; DEFAULT 'vi' | Ngon ngu template. |
| `tieu_de_mau` | `TEXT` | NN | Template tieu de. |
| `noi_dung_mau` | `TEXT` | NN | Template noi dung voi bien duoc phep. |
| `mo_ta_bien` | `JSONB` | NN; DEFAULT '{}' | Danh sach bien da khai bao/hop le. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DANG_DUNG, NGUNG_DUNG. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_mau,kenh_mac_dinh,ngon_ngu); template engine khong duoc chay code tu do.


## 82. `thong_bao`

**Mục đích:** Thong bao da tao gui toi tai khoan/khach  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_su_kien` | `VARCHAR(60)` | NN | Su kien nguon. |
| `mau_thong_bao_id` | `UUID` | NULL; FK mau_thong_bao.id | Template duoc dung. |
| `tai_khoan_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi nhan co tai khoan. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Khach nhan, co the chua co account. |
| `tieu_de` | `VARCHAR(300)` | NN | Tieu de da render, khong chua HTML nguy hiem. |
| `noi_dung` | `TEXT` | NN | Noi dung da render. |
| `duong_dan_dich` | `TEXT` | NULL | Duong dan noi bo duoc kiem tra whitelist. |
| `tham_chieu_loai` | `VARCHAR(50)` | NULL | DON_BAN, PHIEU_MUON, HOI_VIEN. |
| `tham_chieu_id` | `UUID` | NULL | Id doi tuong can mo. |
| `ngay_du_kien_gui` | `TIMESTAMPTZ` | NULL | Lich gui. |
| `ngay_da_doc` | `TIMESTAMPTZ` | NULL | Luc nguoi nhan doc trong app. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'MOI' | MOI, DA_GUI, DA_DOC, LOI, HUY. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong gui thong bao lap. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); index(tai_khoan_id,ngay_tao).


## 83. `thong_bao_kenh`

**Mục đích:** Theo doi moi lan gui email/SMS/push thong bao  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `thong_bao_id` | `UUID` | NN; FK thong_bao.id | Thong bao goc. |
| `kenh` | `VARCHAR(24)` | NN | EMAIL, SMS, PUSH, IN_APP. |
| `dia_chi_nhan_da_che` | `VARCHAR(254)` | NULL | Email/SDT da che cho log. |
| `provider` | `VARCHAR(100)` | NULL | Ben cung cap gui. |
| `ma_tin_ben_ngoai` | `VARCHAR(160)` | NULL | Ma message provider. |
| `lan_gui` | `SMALLINT` | NN; DEFAULT 1 | So lan retry. |
| `ngay_gui` | `TIMESTAMPTZ` | NULL | Luc gui thuc te. |
| `ngay_provider_xac_nhan` | `TIMESTAMPTZ` | NULL | Provider xac nhan giao. |
| `trang_thai` | `VARCHAR(24)` | NN | CHO_GUI, DA_GUI, DA_NHAN, LOI, HUY. |
| `ma_loi` | `VARCHAR(100)` | NULL | Ma loi khong chua token. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,thong_bao_id,kenh,lan_gui); cho phep retry gioi han.


# 09. AI va tim kiem ngu nghia

**Thứ tự thực hiện:** Giai doan 9 — AI doc metadata duoc cap phep; khong tu sua nghiep vu.


## 84. `cuoc_tro_chuyen_ai`

**Mục đích:** Phien hoi thoai tim sach/tu van/ho tro nhan vien  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_cuoc_tro_chuyen` | `VARCHAR(80)` | NN | Ma phien AI. |
| `tai_khoan_id` | `UUID` | NULL; FK tai_khoan.id | Account dung AI neu da dang nhap. |
| `khach_hang_id` | `UUID` | NULL; FK khach_hang.id | Ho so khach neu co. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | Pham vi chi nhanh tim sach. |
| `loai_tro_ly` | `VARCHAR(30)` | NN | TU_VAN_SACH, NHAP_SACH, BAO_CAO, HO_TRO_NHAN_VIEN. |
| `tieu_de` | `VARCHAR(300)` | NULL | Ten cuoc tro chuyen. |
| `ngon_ngu` | `VARCHAR(10)` | NN; DEFAULT 'vi' | Ngon ngu. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'DANG_MO' | DANG_MO, LUU_TRU, DA_XOA. |
| `ngay_tin_nhan_cuoi` | `TIMESTAMPTZ` | NULL | Dung sap xep. |
| `ngay_het_han_luu` | `TIMESTAMPTZ` | NULL | Thoi han luu du lieu. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_cuoc_tro_chuyen); ACL nguoi dung va don vi phai kiem tra moi lan doc.


## 85. `tin_nhan_ai`

**Mục đích:** Tin nhan user, assistant va tham chieu nguon  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `cuoc_tro_chuyen_ai_id` | `UUID` | NN; FK cuoc_tro_chuyen_ai.id | Cuoc tro chuyen. |
| `thu_tu_tin` | `INTEGER` | NN | Vi tri trong cuoc tro chuyen. |
| `vai_tro` | `VARCHAR(24)` | NN | USER, ASSISTANT, SYSTEM_TOOL; khong cho client gia vai tro. |
| `noi_dung` | `TEXT` | NULL | Noi dung da qua quy tac luu tru. |
| `noi_dung_co_cau_truc` | `JSONB` | NULL | Thong tin sach/de xuat/ket qua tool. |
| `trich_dan_nguon` | `JSONB` | NULL | Nguon metadata/tep va doan duoc phep trich dan. |
| `mo_hinh_ai` | `VARCHAR(120)` | NULL | Model da tao phan hoi. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'HOAN_TAT' | DANG_TAO, HOAN_TAT, LOI, BI_CHAN. |
| `ma_loi` | `VARCHAR(100)` | NULL | Ma loi an toan. |
| `ngay_hoan_tat` | `TIMESTAMPTZ` | NULL | Thoi diem tao xong. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,cuoc_tro_chuyen_ai_id,thu_tu_tin); khong luu prompt secrets o client.


## 86. `tai_lieu_ai`

**Mục đích:** Nguon du lieu duoc phep lap chi muc AI, khong tu dong lay toan bo sach ban quyen  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `phien_ban_sach_id` | `UUID` | NULL; FK phien_ban_sach.id | Nguon sach neu metadata/muc luc. |
| `tep_dinh_kem_id` | `UUID` | NULL; FK tep_dinh_kem.id | Tai lieu duoc phep su dung. |
| `loai_nguon` | `VARCHAR(30)` | NN | METADATA_SACH, MO_TA_DUOC_PHEP, TAI_LIEU_NOI_BO, MUC_LUC. |
| `ten_tai_lieu` | `VARCHAR(300)` | NN | Ten nguon. |
| `nguon_du_lieu` | `TEXT` | NULL | URL/ghi nhan nguon cung cap. |
| `can_cu_su_dung` | `VARCHAR(100)` | NN | NOI_BO, DUOC_CAP_PHEP, CONG_KHAI, KHAC. |
| `pham_vi_truy_cap` | `VARCHAR(30)` | NN | CONG_KHAI, NOI_BO, CHI_NHANH, PHAN_QUYEN. |
| `hash_noi_dung` | `CHAR(64)` | NN | Phat hien thay doi tai lieu. |
| `phien_ban_noi_dung` | `INTEGER` | NN; DEFAULT 1 | So phien ban index. |
| `ngay_het_quyen_su_dung` | `DATE` | NULL | Thoi diem can dung lap chi muc. |
| `trang_thai_lap_chi_muc` | `VARCHAR(24)` | NN; DEFAULT 'CHO_XU_LY' | CHO_XU_LY, DANG_XU_LY, SAN_SANG, LOI, DA_GO. |
| `ngay_lap_chi_muc_cuoi` | `TIMESTAMPTZ` | NULL | Moc indexing gan nhat. |

**Ràng buộc/index đề xuất:** index(don_vi_id,pham_vi_truy_cap,trang_thai_lap_chi_muc).

**Quy tắc nghiệp vụ:** Khong dung nguyen van sach co ban quyen neu khong co quyen tai lap/truy xuat.


## 87. `doan_noi_dung_ai`

**Mục đích:** Cac doan da cat va embedding phuc vu tim kiem RAG  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `tai_lieu_ai_id` | `UUID` | NN; FK tai_lieu_ai.id | Tai lieu nguon. |
| `thu_tu_doan` | `INTEGER` | NN | So thu tu trong tai lieu. |
| `noi_dung` | `TEXT` | NN | Doan van ban trong pham vi duoc phep. |
| `so_token` | `INTEGER` | NULL | So token cua doan. |
| `so_trang_nguon` | `INTEGER` | NULL | Trang goc neu co. |
| `vi_tri_nguon` | `JSONB` | NULL | Offset/headings phuc vu dan nguon. |
| `vector_bieu_dien` | `VECTOR(1536)` | NULL; pgvector; chieu vector la cau hinh vi du | Embedding theo model hien tai; can migration neu doi dimension. |
| `mo_hinh_embedding` | `VARCHAR(120)` | NULL | Ten model tao vector. |
| `phien_ban_embedding` | `VARCHAR(60)` | NULL | Version tien xu ly/model. |
| `hash_doan` | `CHAR(64)` | NN | Phat hien thay doi va chong lap. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'SAN_SANG' | SAN_SANG, CAN_CAP_NHAT, DA_GO. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,tai_lieu_ai_id,thu_tu_doan); vector index co loc pham vi ACL.


## 88. `lich_su_su_dung_ai`

**Mục đích:** Ghi nhan token, latency, gia uoc tinh va trang thai moi yeu cau  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `cuoc_tro_chuyen_ai_id` | `UUID` | NULL; FK cuoc_tro_chuyen_ai.id | Phien nguon neu co. |
| `tai_khoan_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi su dung. |
| `loai_tac_vu` | `VARCHAR(40)` | NN | CHAT, EMBEDDING, TOM_TAT, PHAN_LOAI, DE_XUAT. |
| `provider` | `VARCHAR(80)` | NN | Nha cung cap AI. |
| `mo_hinh` | `VARCHAR(120)` | NN | Model duoc goi. |
| `ma_yeu_cau_ben_ngoai` | `VARCHAR(160)` | NULL | Id provider de doi soat. |
| `so_token_dau_vao` | `INTEGER` | NN; DEFAULT 0 | Token input. |
| `so_token_dau_ra` | `INTEGER` | NN; DEFAULT 0 | Token output. |
| `so_token_cache` | `INTEGER` | NN; DEFAULT 0 | Token cache neu co. |
| `so_lan_goi` | `SMALLINT` | NN; DEFAULT 1 | So lan provider duoc goi. |
| `thoi_gian_ms` | `INTEGER` | NULL | Do tre thuc te. |
| `chi_phi_uoc_tinh` | `NUMERIC(18,6)` | NN; DEFAULT 0 | Chi phi uoc tinh theo bang gia model. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'USD' | Tien te chi phi provider. |
| `trang_thai` | `VARCHAR(24)` | NN | THANH_CONG, LOI, HUY, BI_GIOI_HAN. |
| `ma_loi` | `VARCHAR(100)` | NULL | Ma loi da loc. |
| `ngay_hoan_tat` | `TIMESTAMPTZ` | NULL | Moc hoan tat. |

**Ràng buộc/index đề xuất:** index(don_vi_id,ngay_tao,mo_hinh); khong luu API key trong log.


## 89. `nhiem_vu_ai`

**Mục đích:** Tac vu nen OCR/index/tao mo ta/phan tich, co retry an toan  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_nhiem_vu` | `VARCHAR(100)` | NN | Ma tac vu noi bo. |
| `loai_nhiem_vu` | `VARCHAR(40)` | NN | LAP_CHI_MUC, OCR, TAO_MO_TA, GOI_Y_THE_LOAI, BAO_CAO. |
| `tham_chieu_loai` | `VARCHAR(40)` | NULL | TAI_LIEU_AI, DAU_SACH, PHIEU_NHAP. |
| `tham_chieu_id` | `UUID` | NULL | Doi tuong xu ly. |
| `tai_khoan_yeu_cau_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi yeu cau. |
| `nhom_hang_doi` | `VARCHAR(80)` | NN | Ten queue worker. |
| `so_lan_thu` | `SMALLINT` | NN; DEFAULT 0 | Retry count. |
| `so_lan_toi_da` | `SMALLINT` | NN; DEFAULT 3 | Gioi han retry. |
| `ngay_du_kien` | `TIMESTAMPTZ` | NULL | Lap lich. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NULL | Bat dau thuc te. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Ket thuc. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_XU_LY' | CHO_XU_LY, DANG_XU_LY, THANH_CONG, LOI, HUY. |
| `ket_qua_tom_tat` | `JSONB` | NULL | Ket qua an toan de hien thi, khong chua secret. |
| `ma_loi` | `VARCHAR(100)` | NULL | Ma loi. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong xu ly lap. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_nhiem_vu); UNIQUE(don_vi_id,idempotency_key).


# 10. Goi dich vu va thanh toan SaaS

**Thứ tự thực hiện:** Giai doan 10 — thu phi don vi su dung BookFlow.


## 90. `goi_dich_vu_saas`

**Mục đích:** Goi phan mem BookFlow ban cho nha sach/thu vien  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `ma_goi` | `VARCHAR(50)` | NN; UNIQUE | Ma goi toan nen tang. |
| `ten_goi` | `VARCHAR(160)` | NN | Ten thuong mai. |
| `mo_ta` | `TEXT` | NULL | Pham vi goi. |
| `gia_thang` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi theo thang. |
| `gia_nam` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Phi theo nam. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te thu phi. |
| `cho_dung_thu_ngay` | `INTEGER` | NN; DEFAULT 0 | So ngay trial. |
| `co_ho_tro_ai` | `BOOLEAN` | NN; DEFAULT FALSE | Co AI trong goi. |
| `co_ho_tro_da_chi_nhanh` | `BOOLEAN` | NN; DEFAULT FALSE | Co cho them chi nhanh. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DANG_BAN, NGUNG_BAN. |
| `thu_tu_hien_thi` | `INTEGER` | NN; DEFAULT 0 | Sap xep bang gia. |

**Ràng buộc/index đề xuất:** UNIQUE(ma_goi); gia/thanh phan quyen loi da dang ky phai luu snapshot.


## 91. `gioi_han_goi_saas`

**Mục đích:** Han muc cho moi goi phan mem  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `goi_dich_vu_saas_id` | `UUID` | NN; FK goi_dich_vu_saas.id | Goi cha. |
| `ma_gioi_han` | `VARCHAR(70)` | NN | SO_CHI_NHANH, SO_NHAN_VIEN, SO_DAU_SACH, DUNG_LUONG_GB, TOKEN_AI_THANG. |
| `loai_gia_tri` | `VARCHAR(24)` | NN | SO_NGUYEN, THAP_PHAN, BOOLEAN. |
| `gia_tri_so` | `NUMERIC(18,4)` | NULL | Gia tri han muc neu so. |
| `gia_tri_boolean` | `BOOLEAN` | NULL | Gia tri bat/tat neu boolean. |
| `don_vi_tinh` | `VARCHAR(24)` | NULL | NGUOI, CUON, GB, TOKEN, LUOT. |
| `chu_ky` | `VARCHAR(24)` | NULL | THANG, NAM, VONG_DOI; voi han muc theo ky. |
| `ghi_chu` | `VARCHAR(300)` | NULL | Giai thich han muc. |

**Ràng buộc/index đề xuất:** UNIQUE(goi_dich_vu_saas_id,ma_gioi_han,chu_ky); xac dinh reset han muc theo mui gio.


## 92. `dang_ky_dich_vu_saas`

**Mục đích:** Lan dang ky goi BookFlow cua tung don vi  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `goi_dich_vu_saas_id` | `UUID` | NN; FK goi_dich_vu_saas.id | Goi dang dang ky. |
| `ma_dang_ky` | `VARCHAR(70)` | NN | Ma subscription. |
| `chu_ky_thanh_toan` | `VARCHAR(24)` | NN | THANG, NAM, DUNG_THU. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NN | Bat dau cung cap. |
| `ngay_het_han` | `TIMESTAMPTZ` | NN | Han ky hien tai. |
| `ngay_dung_thu_ket_thuc` | `TIMESTAMPTZ` | NULL | Han trial. |
| `gia_da_chot` | `NUMERIC(18,2)` | NN; CHECK >=0 | Gia sau uu dai neu co. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te. |
| `gioi_han_da_chot` | `JSONB` | NN; DEFAULT '{}' | Snapshot han muc va quyen loi. |
| `dong_y_gia_han_tu_dong` | `BOOLEAN` | NN; DEFAULT FALSE | Chap thuan gia han neu duoc ho tro. |
| `trang_thai` | `VARCHAR(30)` | NN; DEFAULT 'DUNG_THU' | DUNG_THU, HIEU_LUC, QUA_HAN, TAM_DUNG, HUY, HET_HAN. |
| `ngay_huy` | `TIMESTAMPTZ` | NULL | Thoi diem huy. |
| `ly_do_huy` | `TEXT` | NULL | Ly do don vi huy. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_dang_ky); khong sua snapshot goi dang hieu luc.


## 93. `hoa_don_saas`

**Mục đích:** Chung tu phi dich vu SaaS theo ky; hoa don dien tu phai tich hop phap ly rieng  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `dang_ky_dich_vu_saas_id` | `UUID` | NN; FK dang_ky_dich_vu_saas.id | Subscription. |
| `ma_chung_tu` | `VARCHAR(70)` | NN | Ma chung tu noi bo. |
| `ky_tu` | `DATE` | NN | Dau ky tinh phi. |
| `ky_den` | `DATE` | NN | Cuoi ky. |
| `ten_don_vi_chot` | `VARCHAR(255)` | NN | Ten don vi tren chung tu. |
| `ma_so_thue_chot` | `VARCHAR(30)` | NULL | Snapshot ma so thue. |
| `dia_chi_chot` | `TEXT` | NULL | Snapshot dia chi xuat chung tu. |
| `tien_truoc_thue` | `NUMERIC(18,2)` | NN | Tong truoc thue. |
| `thue_suat` | `NUMERIC(6,3)` | NULL | Thue suat neu ap dung va da xac minh. |
| `tien_thue` | `NUMERIC(18,2)` | NN; DEFAULT 0 | Tien thue tren chung tu. |
| `tong_phai_thu` | `NUMERIC(18,2)` | NN | Tong can thanh toan. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te. |
| `han_thanh_toan` | `DATE` | NULL | Han thanh toan. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'NHAP' | NHAP, DA_PHAT_HANH, DA_THANH_TOAN, HUY. |
| `ma_hoa_don_dien_tu` | `VARCHAR(100)` | NULL | Tham chieu hoa don dien tu neu tich hop. |
| `tep_hoa_don_id` | `UUID` | NULL; FK tep_dinh_kem.id | Tep chung tu da phat hanh. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_chung_tu); ky_den>=ky_tu.

**Quy tắc nghiệp vụ:** Tai lieu thiet ke khong tu nhan tuan thu quy dinh hoa don/thue; can doi chieu quy dinh khi trien khai.


## 94. `thanh_toan_saas`

**Mục đích:** Thanh toan don vi cho phi su dung phan mem  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `hoa_don_saas_id` | `UUID` | NN; FK hoa_don_saas.id | Chung tu can thu. |
| `ma_thanh_toan` | `VARCHAR(80)` | NN | Ma giao dich SaaS. |
| `phuong_thuc` | `VARCHAR(30)` | NN | CHUYEN_KHOAN, THE, CONG_TT. |
| `cong_thanh_toan` | `VARCHAR(80)` | NULL | Provider thu phi. |
| `ma_giao_dich_ben_ngoai` | `VARCHAR(160)` | NULL | Ma doi soat ben ngoai. |
| `so_tien` | `NUMERIC(18,2)` | NN; CHECK >0 | Tien nhan. |
| `don_vi_tien_te` | `CHAR(3)` | NN; DEFAULT 'VND' | Tien te. |
| `ngay_thanh_toan` | `TIMESTAMPTZ` | NULL | Luc thanh toan. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_XAC_NHAN' | CHO_XAC_NHAN, THANH_CONG, THAT_BAI, DA_HOAN. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong thanh toan trung. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,ma_thanh_toan); UNIQUE(don_vi_id,idempotency_key).


# 11. Tep dinh kem, cau hinh, job va kiem toan

**Thứ tự thực hiện:** Giai doan xuyen suot — ha tang chung va giam sat an toan.


## 95. `tep_dinh_kem`

**Mục đích:** Metadata tep upload dung chung; file that o MinIO/S3, khong luu binary trong DB  
**Phạm vi:** Toan nen tang (global) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `don_vi_so_huu_id` | `UUID` | NULL; FK don_vi.id | NULL voi avatar toan nen tang; khac NULL voi file don vi. |
| `tai_khoan_so_huu_id` | `UUID` | NULL; FK tai_khoan.id | Chu file ca nhan neu co. |
| `ma_tep` | `VARCHAR(100)` | NN; UNIQUE | ID file khong doan duoc. |
| `ten_tep_goc` | `VARCHAR(300)` | NN | Ten file luc tai len, can lam sach khi hien thi. |
| `ten_tep_luu` | `VARCHAR(300)` | NN | Ten file storage an toan. |
| `duong_dan_luu_tru` | `TEXT` | NN | Object key trong kho luu tru, khong phai public URL. |
| `bucket` | `VARCHAR(120)` | NN | Ten bucket. |
| `mime_type_khai_bao` | `VARCHAR(160)` | NULL | MIME client khai bao, khong dang tin. |
| `mime_type_xac_minh` | `VARCHAR(160)` | NN | MIME server kiem tra. |
| `duoi_tep` | `VARCHAR(30)` | NULL | Phan mo rong da chuan hoa. |
| `kich_thuoc_byte` | `BIGINT` | NN; CHECK >=0 | Dung luong tep. |
| `ma_bam_sha256` | `CHAR(64)` | NN | Checksum phat hien trung/thay doi. |
| `loai_tep` | `VARCHAR(30)` | NN | ANH_BIA, ANH_DAI_DIEN, CHUNG_TU, TAI_LIEU_AI, MINH_CHUNG, KHAC. |
| `pham_vi_truy_cap` | `VARCHAR(24)` | NN; DEFAULT 'RIENG_TU' | RIENG_TU, NOI_BO_DON_VI, CONG_KHAI. |
| `trang_thai_quet_virus` | `VARCHAR(24)` | NN; DEFAULT 'CHO_QUET' | CHO_QUET, SACH, NGHI_NGO, BI_CHAN. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'TAM' | TAM, SAN_SANG, CACH_LY, DA_XOA. |
| `ngay_het_han` | `TIMESTAMPTZ` | NULL | Dung cho file tam. |
| `ngay_xoa` | `TIMESTAMPTZ` | NULL | Xoa logic co kiem soat. |

**Ràng buộc/index đề xuất:** UNIQUE(ma_tep); khong bao gio public file rieng tu chi dua vao object key.


## 96. `cau_hinh_don_vi`

**Mục đích:** Key-value cau hinh nghiep vu theo don vi/chi nhanh  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | NULL neu cau hinh don vi. |
| `nhom_cau_hinh` | `VARCHAR(60)` | NN | MUON_TRA, POS, HOI_VIEN, THONG_BAO, GIAO_DIEN, BAO_MAT. |
| `ma_cau_hinh` | `VARCHAR(100)` | NN | Ma cau hinh co whitelist. |
| `gia_tri_json` | `JSONB` | NN | Gia tri co JSON Schema xac minh. |
| `loai_du_lieu` | `VARCHAR(24)` | NN | BOOLEAN, NUMBER, STRING, JSON. |
| `mo_ta` | `TEXT` | NULL | Y nghia va gia tri hop le. |
| `co_cho_phep_chi_nhanh_ghi_de` | `BOOLEAN` | NN; DEFAULT TRUE | Chi nhanh duoc override. |
| `la_thong_tin_nhay_cam` | `BOOLEAN` | NN; DEFAULT FALSE | Khong tra ve client neu nhay cam. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,chi_nhanh_id,nhom_cau_hinh,ma_cau_hinh) NULLS NOT DISTINCT neu PostgreSQL ho tro.

**Quy tắc nghiệp vụ:** Khong luu API key/secret thuan trong JSONB; su dung secret manager hoac khoa duoc ma hoa rieng.


## 97. `tac_vu_nen`

**Mục đích:** Quan ly cac job thong bao, nhac han, doi soat, cap nhat du lieu  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Cho phép cập nhật có kiểm soát

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `ngay_cap_nhat` | `TIMESTAMPTZ` | NN; DEFAULT now(); trigger khi UPDATE | Thoi diem cap nhat cuoi, luu UTC. |
| `nguoi_tao_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi tao neu co, NULL khi khoi tao boi he thong. |
| `nguoi_cap_nhat_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi cap nhat cuoi neu co, theo ngu canh quyen. |
| `ma_tac_vu` | `VARCHAR(100)` | NN | Ma job nghiep vu. |
| `loai_tac_vu` | `VARCHAR(60)` | NN | GUI_THONG_BAO, NHAC_HAN, HET_HAN_GIU_CHO, DOI_SOAT, KHAC. |
| `hang_doi` | `VARCHAR(80)` | NN | Queue chay job. |
| `tham_chieu_loai` | `VARCHAR(50)` | NULL | Loai doi tuong. |
| `tham_chieu_id` | `UUID` | NULL | Id doi tuong. |
| `tham_so_da_loc` | `JSONB` | NULL | Du lieu can thiet, khong chua mat khau. |
| `ngay_du_kien` | `TIMESTAMPTZ` | NN | Lich thuc hien. |
| `ngay_bat_dau` | `TIMESTAMPTZ` | NULL | Luc bat dau. |
| `ngay_ket_thuc` | `TIMESTAMPTZ` | NULL | Luc hoan tat. |
| `so_lan_thu` | `SMALLINT` | NN; DEFAULT 0 | Dem retry. |
| `so_lan_toi_da` | `SMALLINT` | NN; DEFAULT 3 | So lan retry. |
| `trang_thai` | `VARCHAR(24)` | NN; DEFAULT 'CHO_XU_LY' | CHO_XU_LY, DANG_XU_LY, HOAN_TAT, LOI, HUY. |
| `ma_loi` | `VARCHAR(100)` | NULL | Ma loi. |
| `idempotency_key` | `VARCHAR(120)` | NN | Chong chay trung. |

**Ràng buộc/index đề xuất:** UNIQUE(don_vi_id,idempotency_key); job quan trong can transactional outbox hoac co che tuong duong.


## 98. `nhat_ky_he_thong`

**Mục đích:** Audit actor/action/object, bat buoc voi cap quyen va giao dich  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `tai_khoan_id` | `UUID` | NULL; FK tai_khoan.id | Nguoi thao tac, NULL voi worker. |
| `thanh_vien_don_vi_id` | `UUID` | NULL; FK thanh_vien_don_vi.id | Vai tro tai don vi khi thao tac. |
| `chi_nhanh_id` | `UUID` | NULL; FK chi_nhanh.id | Pham vi thao tac. |
| `hanh_dong` | `VARCHAR(120)` | NN | permission.grant, loan.return, payment.refund... |
| `doi_tuong_loai` | `VARCHAR(80)` | NN | Bang/module bi tac dong. |
| `doi_tuong_id` | `UUID` | NULL | Id doi tuong. |
| `ket_qua` | `VARCHAR(24)` | NN | THANH_CONG, THAT_BAI, TU_CHOI. |
| `du_lieu_truoc_da_loc` | `JSONB` | NULL | Snapshot chi cac truong khong nhay cam. |
| `du_lieu_sau_da_loc` | `JSONB` | NULL | Snapshot chi cac truong khong nhay cam. |
| `ly_do` | `TEXT` | NULL | Ly do nguoi thuc hien hoac he thong. |
| `dia_chi_ip` | `INET` | NULL | IP theo thoi han luu. |
| `request_id` | `VARCHAR(100)` | NULL | Correlation id API. |
| `trace_id` | `VARCHAR(100)` | NULL | Distributed trace id. |
| `nguon` | `VARCHAR(24)` | NN | WEB, API, WORKER, TICH_HOP. |

**Ràng buộc/index đề xuất:** index(don_vi_id,ngay_tao,hanh_dong); append-only, phan quyen xem log va co retention.


## 99. `nhat_ky_tich_hop`

**Mục đích:** Log dong bo/yeu cau ben ngoai da che thong tin nhay cam  
**Phạm vi:** Theo don_vi (tenant) · **Lịch sử:** Chỉ thêm (append-only)

| Cột | Kiểu PostgreSQL | Ràng buộc / mặc định | Ý nghĩa chi tiết |
|---|---|---|---|
| `id` | `UUID` | NN; PK; DEFAULT gen_random_uuid() | Khoa chinh, dinh danh bat bien cua ban ghi. |
| `don_vi_id` | `UUID` | NN; FK don_vi.id; tenant scope | Ranh gioi du lieu SaaS, bat buoc kiem tra tren moi truy van. |
| `ngay_tao` | `TIMESTAMPTZ` | NN; DEFAULT now() | Thoi diem he thong tao ban ghi, luu UTC. |
| `he_thong_dich` | `VARCHAR(100)` | NN | Provider/phan mem ket noi. |
| `loai_tich_hop` | `VARCHAR(40)` | NN | ISBN, THANH_TOAN, GIAO_HANG, EMAIL, AI. |
| `hanh_dong` | `VARCHAR(100)` | NN | API/operation thuc hien. |
| `request_id` | `VARCHAR(120)` | NULL | Id tuong quan. |
| `ma_giao_dich_ben_ngoai` | `VARCHAR(160)` | NULL | Provider id. |
| `http_status` | `SMALLINT` | NULL | HTTP status neu co. |
| `ket_qua` | `VARCHAR(24)` | NN | THANH_CONG, LOI, TIMEOUT, RETRY. |
| `thoi_gian_ms` | `INTEGER` | NULL | Do tre. |
| `so_lan_thu` | `SMALLINT` | NN; DEFAULT 1 | Lan goi. |
| `ma_loi` | `VARCHAR(100)` | NULL | Ma loi. |
| `thong_diep_loi_da_loc` | `TEXT` | NULL | Thong diep da loai du lieu nhay cam. |

**Ràng buộc/index đề xuất:** index(don_vi_id,he_thong_dich,ngay_tao); khong luu raw header/token/payload PII.


---
## Checklist triển khai theo thứ tự

1. Xác thực, quyền, tách dữ liệu tenant, quyền chi nhánh và audit.
2. Danh mục đầu sách → phiên bản → tác giả/thể loại → offering và bảng giá.
3. Nhập hàng → sổ cái kho → tồn bán/bản sao → chuyển/kiểm kê.
4. Hồ sơ khách, gói hội viên, quyền lợi và snapshot.
5. POS/giỏ hàng, giữ tồn, đơn bán, giao hàng và đổi trả.
6. Đặt trước, phê duyệt, bàn giao, gia hạn, trả từng phần và tình trạng bản sao.
7. Khoản phải thu, thanh toán, phân bổ, tiền cọc, hoàn tiền và đối soát.
8. Thông báo theo sự kiện, job nhắc hạn và nhật ký giao nhận.
9. AI chỉ dùng dữ liệu được phép; lập chỉ mục, ACL, log token và giới hạn phí.
10. Gói SaaS, hóa đơn/dịch vụ, giám sát và thử nghiệm đa chi nhánh.

**Tiêu chí kiểm thử tối thiểu:** không bán quá tồn; không cho mượn trùng một bản sao; không đọc chéo tổ chức; trả một phần đúng; hoàn cọc không vượt đã thu; webhook/worker retry không nhân đôi giao dịch; thay đổi giá/chính sách không làm thay đổi đơn đã chốt.

