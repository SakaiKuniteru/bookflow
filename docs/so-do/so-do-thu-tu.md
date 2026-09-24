# BOOKFLOW AI — QUY TRÌNH THỰC HIỆN DỰ ÁN

**Tên file:** `quy-trinh-thuc-hien.md`  
**Phiên bản tài liệu:** 1.0 — kế hoạch thực hiện để duyệt, chưa phải kết quả triển khai  
**Tài liệu đi cùng:** `cau-truc-bookflow-ai-chuan-ky-thuat-va-nghiep-vu.md` và bộ từ điển dữ liệu BookFlow AI  
**Mục tiêu:** xây dựng nền tảng BookFlow AI hỗ trợ bán sách, mượn miễn phí, thuê sách có phí, hội viên, nhiều đơn vị/chi nhánh, AI và SaaS; từng ứng dụng có thể build riêng hoặc build chung.

> **Quy ước tên:** các lớp kỹ thuật giữ tiếng Anh (`frontend`, `backend`, `ai-service`, `database`, `routes`, `controllers`, `services`, `Dockerfile`...). Tên nghiệp vụ tự đặt dùng **tiếng Việt không dấu**: JavaScript/Handlebars/CSS/SVG theo `kebab-case`, Python theo `snake_case`, bảng/cột PostgreSQL theo `snake_case`. Tên service Docker thống nhất: `nginx`, `frontend`, `backend`, `backend-worker`, `ai-api`, `ai-worker`, `postgres`, `redis`, `minio`.

**Nguyên tắc thực hiện:** không tạo cả 99 bảng và mọi màn hình ngay từ đầu. Triển khai theo *lát cắt nghiệp vụ hoàn chỉnh*: chốt yêu cầu → hợp đồng API → migration → backend → giao diện → kiểm thử → tài liệu → tích hợp. Các phân hệ nền tảng hoàn thành trước, sau đó phát triển từng luồng nghiệp vụ từ đầu đến cuối.

---

# PHẦN I. SƠ ĐỒ NHÁNH VÀ THỨ TỰ THỰC HIỆN

## 1. Cây tổng thể các nhánh công việc

```text
BookFlow AI
│
├── A. PHÂN TÍCH VÀ CHỐT YÊU CẦU
│   ├── A1. Phạm vi MVP và các giai đoạn sau
│   ├── A2. Vai trò, tổ chức, chi nhánh và phân quyền
│   ├── A3. Quy trình bán / mượn / thuê / hội viên / tài chính
│   ├── A4. Quy tắc dữ liệu, trạng thái và trường hợp ngoại lệ
│   └── A5. Tiêu chí nghiệm thu cho từng nghiệp vụ
│
├── B. NỀN TẢNG KỸ THUẬT
│   ├── B1. Git, nhánh, PR và quy tắc phiên bản
│   ├── B2. Monorepo: frontend / backend / ai-service / database
│   ├── B3. Contracts: API nghiệp vụ và API Python nội bộ
│   ├── B4. Docker Compose: dev / stable / production
│   ├── B5. PostgreSQL, Redis, MinIO, Nginx
│   └── B6. CI, test, healthcheck, log và quản lý bí mật
│
├── C. NỀN TẢNG ỨNG DỤNG
│   ├── C1. Cơ sở dữ liệu và migration nền
│   ├── C2. Tổ chức SaaS, chi nhánh, tài khoản và RBAC
│   ├── C3. Thiết kế giao diện, form và JavaScript dùng chung
│   ├── C4. Bộ SVG icon và logo tự thiết kế
│   └── C5. Quản lý file và phân quyền MinIO
│
├── D. NGHIỆP VỤ CỐT LÕI — THỰC HIỆN THEO THỨ TỰ
│   ├── D1. Danh mục đầu sách, phiên bản, tác giả, thể loại
│   ├── D2. Nhà cung cấp, nhập kho, bản sao, tồn kho
│   ├── D3. Khách hàng, hội viên, chính sách và quyền lợi
│   ├── D4. Nền tài chính: khoản phải thu, thanh toán, cọc
│   ├── D5. Giỏ hàng, POS, bán sách, giao và trả hàng
│   ├── D6. Đặt trước, mượn miễn phí, thuê có phí, trả/gia hạn
│   └── D7. Thông báo, báo cáo, nhật ký và đối soát
│
├── E. AI VÀ QUẢN TRỊ NỀN TẢNG
│   ├── E1. FastAPI và hợp đồng API nội bộ
│   ├── E2. AI Worker, RQ, embedding và pgvector
│   ├── E3. Tìm kiếm/tư vấn sách, phân loại và báo cáo AI
│   ├── E4. Theo dõi chi phí, quyền truy cập, kiểm thử AI
│   └── E5. Gói SaaS, đăng ký, giới hạn và Super Admin
│
└── F. CHẤT LƯỢNG VÀ PHÁT HÀNH
    ├── F1. Unit / Integration / Contract / E2E / bảo mật
    ├── F2. Kiểm thử đồng thời cho kho, mượn và tiền
    ├── F3. Build riêng/chung, gắn phiên bản image
    ├── F4. Stable: smoke test, UAT, thử migration/khôi phục
    ├── F5. Production: triển khai có kiểm soát và rollback
    └── F6. Vận hành: giám sát, backup, sự cố, cải tiến
```

## 2. Cây phụ thuộc: làm cái nào trước cái nào?

```text
Yêu cầu + tiêu chí nghiệm thu
           │
           ▼
Git + cấu trúc dự án + Compose + CI + Contracts
           │
           ▼
PostgreSQL nền + migration + tenant + auth + RBAC
           │
           ├───────────────► Design system + form chung + SVG icon
           │                                  │
           ├───────────────► File chung + MinIO ──────┐
           │                                          │
           ▼                                          ▼
       Danh mục sách + phiên bản + ảnh + hình thức kinh doanh
           │
           ▼
     Nhà cung cấp + nhập kho + tồn kho + bản sao sách
           │
           ├────────► Khách hàng + hội viên + chính sách
           │                        │
           └────────► Nền tài chính: thanh toán/cọc/hoàn
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
             Bán hàng             Mượn / thuê / trả
                  └─────────┬─────────┘
                            ▼
                   Thông báo + báo cáo
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
          Python AI + RAG          SaaS billing
                └───────────┬───────────┘
                            ▼
                    Stable → Production
```

**Có thể làm song song:** FE design system với backend auth sau khi chốt hợp đồng; Python AI skeleton với danh mục sách sau khi có schema mẫu; kiểm thử, bảo mật, tài liệu và CI phải chạy xuyên suốt. **Không làm song song khi cùng sửa schema hoặc hợp đồng chưa chốt**; phải có người chịu trách nhiệm và migration rõ ràng.

## 3. Giai đoạn, đầu ra và điều kiện chuyển bước

| Giai đoạn | Công việc trọng tâm | Đầu ra tối thiểu | Chỉ chuyển bước khi |
|---|---|---|---|
| G0 | Phân tích nghiệp vụ | Phạm vi MVP, luồng nghiệp vụ, trạng thái, quyền, backlog | Không còn mâu thuẫn trong luồng bán/mượn/thuê/cọc |
| G1 | Dựng nền kỹ thuật | Monorepo, Compose dev, CI, contracts, log/healthcheck | Các service mẫu khởi động và kiểm thử độc lập |
| G2 | Database + tổ chức/tài khoản | Migration nền, RBAC, tenant/branch scope | Test phân quyền và cô lập dữ liệu qua API đạt |
| G3 | FE dùng chung + file | Layout, field/form/modal/table, SVG icon, MinIO | Một form mẫu, một upload mẫu hoạt động và an toàn |
| G4 | Danh mục sách | Đầu sách, phiên bản, ảnh, thể loại, offering | Tạo/sửa/xem/tìm sách hoàn chỉnh |
| G5 | Kho | Nhập, tồn bán, bản sao mượn, biến động | Không âm tồn; không cấp một bản sao cho hai phiếu |
| G6 | Khách hàng, hội viên, chính sách | Hồ sơ, quyền lợi, chính sách snapshot | Quyền lợi và hạn mức có kiểm thử |
| G7 | Tài chính nền | Khoản phải thu, thanh toán, cọc, hoàn | Thu trùng được chặn; cọc tách khỏi doanh thu |
| G8 | Bán hàng | Giỏ, POS, đơn, thanh toán, trả hàng | Luồng mua hoàn chỉnh và không bán vượt tồn |
| G9 | Mượn và thuê | Yêu cầu, giữ chỗ, phiếu, trả từng cuốn, gia hạn | Luồng miễn phí/có phí, quá hạn, hoàn cọc được kiểm thử |
| G10 | Thông báo và báo cáo | Queue, nhắc hạn, báo cáo, audit | Retry không tạo giao dịch trùng; số liệu đối soát đúng |
| G11 | AI | FastAPI, Worker, RAG/pgvector, giám sát chi phí | AI không lộ dữ liệu đơn vị và không tự sửa giao dịch |
| G12 | SaaS | Gói dịch vụ, giới hạn, thanh toán đơn vị, Super Admin | Tổ chức bị giới hạn đúng theo gói và quyền |
| G13 | Phát hành | E2E, Stable, backup/restore, Production | Checklist phát hành và phương án xử lý sự cố đạt |

**MVP đề xuất:** hoàn tất G0–G9 ở phạm vi tối thiểu, thêm thông báo quan trọng và báo cáo cơ bản của G10. Sau khi luồng nghiệp vụ đã ổn định mới triển khai AI nâng cao và SaaS billing đầy đủ. Nền tenant và phân quyền vẫn phải làm từ sớm nếu định hướng SaaS đã chốt.

---

# PHẦN II. CẤU TRÚC NHÁNH GIT VÀ QUY TRÌNH LÀM VIỆC

## 4. Cây nhánh Git

```text
repository: BookFlow
│
├── main                                # Code đã phát hành Production
│   ├── tag v0.1.0
│   ├── tag v0.2.0
│   └── tag v1.0.0
│
├── develop                             # Nhánh tích hợp cho phiên bản tiếp theo
│   │
│   ├── feature/nen-tang/dang-nhap
│   ├── feature/phan-quyen/chi-nhanh
│   ├── feature/sach/danh-muc
│   ├── feature/kho/nhap-sach
│   ├── feature/ban-hang/pos
│   ├── feature/muon-tra/tra-tung-cuon
│   ├── feature/ai/tu-van-sach
│   ├── fix/kho/dong-bo-ton
│   └── chore/build/docker-compose
│
├── release/v0.1.0                      # Tạo từ develop để kiểm thử Stable
│   ├── fix/bug-phat-hien-khi-kiem-thu
│   └── → main + tag v0.1.0 + merge lại develop
│
└── hotfix/v0.1.1-loi-thanh-toan         # Tạo từ main khi sửa Production khẩn
    └── → main + tag v0.1.1 + merge lại develop
```

### 4.1. Quy tắc từng nhánh

| Nhánh | Tạo từ | Công dụng | Đích hợp nhất |
|---|---|---|---|
| `main` | — | Phiên bản Production đã được chấp nhận | Chỉ nhận release/hotfix đã duyệt |
| `develop` | `main` lúc khởi tạo | Tích hợp và kiểm thử tính năng | Tạo `release/...` |
| `feature/<phan-he>/<cong-viec>` | `develop` | Một tính năng hoặc một lát cắt nghiệp vụ | `develop` qua Pull Request |
| `fix/<phan-he>/<loi>` | `develop` | Sửa lỗi chưa phát hành | `develop` qua Pull Request |
| `chore/<phan-he>/<viec>` | `develop` | Cấu hình, refactor, CI, tài liệu | `develop` qua Pull Request |
| `release/vX.Y.Z` | `develop` | Khóa phạm vi, kiểm thử Stable, sửa lỗi phát hành | `main`, rồi đồng bộ về `develop` |
| `hotfix/vX.Y.Z-mo-ta` | `main` | Sửa khẩn cho phiên bản Production | `main`, rồi đồng bộ về `develop` |

**Không tạo cả `develop` và `development`:** chọn thống nhất `develop`. Không đẩy thẳng lên `main`, không commit `.env` thực, không dùng nhánh riêng cho từng khách hàng SaaS nếu khác nhau chỉ ở dữ liệu/cấu hình.

### 4.2. Quy trình làm một tính năng

```text
Ticket đã rõ yêu cầu và tiêu chí nghiệm thu
        ↓
Cập nhật develop → tạo feature/<phan-he>/<cong-viec>
        ↓
Chốt hợp đồng API + dữ liệu + quyền + giao diện liên quan
        ↓
Code một lát cắt hoàn chỉnh + test + tài liệu
        ↓
Chạy lint, unit, integration, contract, build bị ảnh hưởng
        ↓
Pull Request → review → kiểm tra CI → merge develop
        ↓
Kiểm thử tích hợp trên môi trường dev
        ↓
Đánh dấu ticket hoàn tất khi đạt Definition of Done
```

**Quy tắc Pull Request:** một PR nên có mục tiêu rõ, nêu migration nếu có, API thay đổi, ảnh hưởng FE/BE/AI, test đã chạy, rủi ro và cách triển khai. Không gộp một lần toàn bộ danh mục, kho, bán hàng và AI vào một PR khó kiểm tra.

### 4.3. Quy trình phát hành Stable và Production

```text
develop đạt phạm vi của phiên bản
        ↓
Tạo release/vX.Y.Z
        ↓
Build image có tag bất biến + ghi nhận commit SHA
        ↓
Deploy Stable → chạy migration thử → smoke test → E2E/UAT
        ↓
Chỉ sửa lỗi phát hành trên release; đồng bộ sửa lỗi về develop
        ↓
Duyệt phát hành → merge main → tạo tag vX.Y.Z
        ↓
Deploy Production bằng ĐÚNG image đã kiểm thử ở Stable
        ↓
Theo dõi sức khỏe + đối soát giao dịch + ghi release notes
```

**Stable là môi trường triển khai, không bắt buộc có nhánh `stable` riêng.** Production không build lại từ source một lần nữa; dùng cùng image/tag đã vượt qua Stable. Nếu muốn site khách hàng chạy riêng, tạo cấu hình triển khai và dữ liệu riêng, không nhân bản branch không cần thiết.

### 4.4. Quy trình hotfix

1. Ghi nhận mức độ ảnh hưởng; nếu liên quan tiền/kho, có thể tạm tắt thao tác bị lỗi bằng cấu hình hoặc cơ chế bảo vệ phù hợp.
2. Tạo `hotfix/...` từ tag/commit Production trên `main`; viết test tái hiện lỗi trước khi sửa nếu khả thi.
3. Sửa tối thiểu, chạy test liên quan và kiểm thử trên Stable với dữ liệu thử nghiệm tương đương.
4. Tạo tag bản vá, triển khai đúng image đã kiểm thử; kiểm tra nhật ký, số dư, tồn kho và giao dịch ảnh hưởng.
5. Merge/cherry-pick thay đổi về `develop` và cập nhật tài liệu nguyên nhân, biện pháp phòng ngừa.

---

# PHẦN III. QUY TRÌNH CHI TIẾT THEO THỨ TỰ PHÁT TRIỂN

## 5. G0 — Phân tích yêu cầu và chốt phạm vi

**Đầu vào:** mục tiêu BookFlow, cấu trúc dự án đã duyệt, bộ từ điển dữ liệu, các nhóm người dùng.

**Các bước:**

1. Xác định ai sử dụng: khách vãng lai, khách có tài khoản, thu ngân, thủ thư, quản lý chi nhánh, quản trị đơn vị và Super Admin.
2. Chốt hành động được xem khi chưa đăng nhập; hành động nào yêu cầu tài khoản; trường hợp khách mua/mượn tại quầy không có tài khoản web.
3. Viết luồng nghiệp vụ chuẩn và ngoại lệ cho bán, đặt trước, mượn miễn phí, thuê có phí, gia hạn, trả từng cuốn, hư hỏng, mất sách, cọc, hội viên và hoàn tiền.
4. Phân biệt đầu sách (`dau_sach`), phiên bản (`phien_ban_sach`), tồn kho bán theo số lượng và từng bản sao sách để mượn/thuê (`ban_sao_sach`). Chốt trường hợp chuyển mục đích sử dụng có phê duyệt.
5. Chốt trạng thái của từng chứng từ và điều kiện chuyển trạng thái; xác định ai được phép thao tác và khi nào phải ghi nhật ký.
6. Từ bộ 99 bảng, đánh dấu bảng bắt buộc cho MVP, bảng cần ở giai đoạn sau và những cột cần xác minh theo thực tế. **Không mặc định 99 bảng là danh sách bất biến**.
7. Lập backlog theo lát cắt chức năng, mỗi ticket có đầu vào, kết quả, quyền, ràng buộc, ngoại lệ, màn hình và tiêu chí kiểm thử.

**Đầu ra:** `docs/business/` chứa đặc tả nghiệp vụ; `docs/database/` chứa danh sách bảng theo giai đoạn; `docs/frontend/` chứa danh sách trang; danh sách ticket có thứ tự phụ thuộc.

**Điều kiện hoàn tất:** mô tả được luồng dữ liệu và dòng tiền từ khi khách chọn sách đến khi hoàn tất đơn/phiếu mượn, kể cả hoàn/đảo giao dịch.

## 6. G1 — Khởi tạo monorepo và môi trường phát triển

**Thứ tự thao tác:**

1. Khởi tạo repository Git với `main` và `develop`, `.gitignore`, quy tắc commit/PR và bảo vệ `main`.
2. Tạo bộ khung đúng cây đã duyệt: `frontend/`, `backend/`, `ai-service/`, `database/`, `contracts/`, `infrastructure/`, `scripts/`, `docs/`, `.github/workflows/`.
3. Tạo `package.json` riêng của FE/BE và gốc; thiết lập Python virtual environment và `requirements.txt`/lock phù hợp; không dùng chung `node_modules` giữa hai ứng dụng.
4. Tạo `.env.example` cho từng ứng dụng và môi trường. Tài liệu hóa biến bắt buộc, tuyệt đối không commit khóa thật hoặc dữ liệu khách hàng thật.
5. Tạo Dockerfile độc lập cho `frontend`, `backend`, `ai-api`, `ai-worker`; cấu hình `backend-worker` dùng cùng image backend nhưng command khác.
6. Tạo `compose.yaml` và các file `compose.dev.yaml`, `compose.stable.yaml`, `compose.production.yaml`; thêm `postgres`, `redis`, `minio`, `nginx`, volume bền vững, network và healthcheck.
7. Dựng endpoint `/health` và `/ready` phù hợp cho FE/BE/AI; kiểm thử backend gọi được PostgreSQL/Redis/MinIO và API Python nội bộ.
8. Tạo CI tối thiểu: lint, test, kiểm tra hợp đồng, build image; chỉ chạy workflow ứng dụng bị ảnh hưởng khi có thể.

**Đầu ra:** `docker compose -f compose.yaml -f compose.dev.yaml up -d --build` có thể khởi động bộ khung *sau khi file cấu hình đã được viết*. Từ bên ngoài production chỉ Nginx là điểm truy cập công khai; không public PostgreSQL, Redis, MinIO hoặc FastAPI.

**Điều kiện hoàn tất:** khởi động/xóa tạo lại container ứng dụng không làm mất dữ liệu volume; build FE không cần build BE/AI; log và healthcheck cho biết service lỗi ở đâu.

## 7. G2 — Contracts và quy ước kỹ thuật dùng chung

1. Viết `contracts/openapi/bookflow-api.yaml` cho API FE ↔ BE và `contracts/openapi/ai-noi-bo-api.yaml` cho BE ↔ Python.
2. Chuẩn hóa response thành công/lỗi, mã lỗi, phân trang, lọc/sắp xếp, thời gian UTC, decimal cho tiền và quy tắc `idempotency_key` ở thao tác tạo giao dịch.
3. Chốt header/cookie xác thực, cách truyền `don_vi_id` và `chi_nhanh_id` từ phiên đã kiểm tra; **không tin `don_vi_id` do client tự gửi**.
4. Có ví dụ request/response hợp lệ và lỗi; tạo test hợp đồng để phát hiện BE/AI thay đổi không tương thích.
5. Cài log có request ID/correlation ID giữa FE, BE và AI; che token, mật khẩu, thông tin thanh toán nhạy cảm.

**Điều kiện hoàn tất:** FE có thể dùng API mock theo hợp đồng; BE/AI có thể triển khai độc lập mà vẫn kiểm tra được schema giao tiếp.

## 8. G3 — Database nền, tài khoản và phân quyền SaaS

**Thứ tự migration dự kiến:** extension và các hàm chung → `don_vi`/`chi_nhanh` → `tai_khoan`/phiên đăng nhập → thành viên/chi nhánh → vai trò/quyền → nhật ký đăng nhập. Các FK vòng phụ thuộc tạo bằng migration sau khi bảng đích đã tồn tại.

**Các bước:**

1. Khởi tạo PostgreSQL + pgvector; thống nhất UUID, `TIMESTAMPTZ`, `NUMERIC` cho tiền, charset, schema, index, lịch sử migration.
2. Viết migration có số thứ tự và seed quyền/vai trò cơ bản; dữ liệu demo tách khỏi seed production.
3. Xây kết nối pool và `backend/src/database/transaction.js`; không tự tạo transaction khác nhau trong từng module.
4. Xây đăng ký, đăng nhập, xác minh, đặt lại mật khẩu, phiên đăng nhập/thu hồi phiên và giới hạn đăng nhập sai.
5. Xây RBAC theo đơn vị/chi nhánh; Super Admin và người dùng thông thường có phạm vi dữ liệu rõ ràng.
6. Viết middleware xác thực/phân quyền chung; mọi repository nghiệp vụ có quy tắc tenant scope và branch scope.
7. Kiểm thử: tài khoản thuộc đơn vị A không đọc/sửa bản ghi đơn vị B; nhân viên chi nhánh A không được thao tác chi nhánh B nếu không có quyền; FE ẩn nút không thay thế kiểm tra BE.

**Điều kiện hoàn tất:** API từ chối request chéo đơn vị, chéo chi nhánh và thao tác thiếu quyền kể cả khi người dùng tự gọi API thủ công.

## 9. G4 — Thiết kế FE chung và bộ nhận diện tự tạo

**Các bước:**

1. Chốt hệ màu, typography, spacing, responsive, focus/keyboard, thông báo lỗi và trạng thái loading trong `docs/frontend/design-system.md`.
2. Tạo layout `main`, `auth`, `customer`, `staff`, `admin`, `super-admin` và các navigation partial dùng chung.
3. Làm **một bộ** form field, modal, bảng, phân trang, toast, confirm; các màn hình nghiệp vụ chỉ ghép chúng lại.
4. Xây `frontend/src/public/js/core/` cho API client, form handler, validation hiển thị, upload, bảng, phân trang; `utils/` cho tiền/ngày và tiện ích.
5. Tự vẽ SVG gốc ở `frontend/src/assets/icons/`, logo ở `assets/brand/`; thống nhất viewBox, độ dày nét, `currentColor`, tên icon, quy tắc accessible label.
6. Viết `frontend/scripts/build-icons.mjs` để kiểm tra tên trùng/SVG không hợp lệ và tạo sprite `frontend/src/public/icons/bookflow-icons.svg`.
7. Tạo partial `views/partials/ui/icon.hbs`; tất cả trang gọi qua partial, không copy SVG vào từng trang.
8. Làm một trang danh sách và một form thêm/sửa mẫu để kiểm thử CSS, JS, validation, lỗi BE và quyền hiển thị.

**Điều kiện hoàn tất:** thay đổi một field/modal/icon dùng chung phản ánh đúng trên các trang mẫu; trang công khai xem sách được mà không bắt đăng nhập.

## 10. G5 — Quản lý file và danh mục sách

### 10.1. Quy trình upload file chung

```text
FE chọn ảnh/tài liệu
    ↓
BE kiểm tra phiên, tenant, quyền, loại file, dung lượng
    ↓
Lưu file vào vùng tạm MinIO / kho S3 tương thích
    ↓
Xác minh MIME thực tế, checksum, trạng thái kiểm tra an toàn
    ↓
Ghi metadata vào tep_dinh_kem
    ↓
Gắn file vào bản ghi nghiệp vụ theo quyền
    ↓
Public: URL hợp lệ; file private: URL có thời hạn sau kiểm tra quyền
```

1. Module `backend/src/modules/tep/` là đầu mối lưu file; phần ảnh sách không tự viết code upload MinIO thứ hai.
2. Bảng `tep_dinh_kem` lưu object key, bucket, MIME xác minh, dung lượng, checksum, quyền truy cập và trạng thái; không lưu ảnh base64 vào PostgreSQL.
3. `dau_sach.anh_bia_chinh_id` trỏ ảnh bìa chính; `tep_sach` gắn nhiều ảnh/tệp vào đầu sách hoặc phiên bản bằng `tep_dinh_kem_id`, `loai_tep_sach`, `thu_tu`.
4. Chỉ file đã được kiểm tra và cấp quyền mới hiển thị công khai; không coi object key là bằng chứng quyền truy cập.
5. Ghi rõ quy định số ảnh và dung lượng là **cấu hình nghiệp vụ cần chốt**, không giả định database hiện tại đã chặn số ảnh tối đa.

### 10.2. Quy trình danh mục sách

1. Tạo tác giả, nhà xuất bản, thể loại và từ khóa; quy định chống dữ liệu trùng và cách gộp bản ghi hợp lệ.
2. Tạo đầu sách; tạo một hay nhiều phiên bản ISBN/ngôn ngữ/định dạng; gắn tác giả/thể loại.
3. Gắn ảnh bìa chính, ảnh phụ và các file được phép hiển thị; xác định bản quyền và tính công khai.
4. Tạo hình thức cung cấp theo **phiên bản + chi nhánh**: bán, mượn miễn phí, thuê có phí; chính sách và giá áp dụng ở đúng phạm vi.
5. Xây API CRUD/filter/pagination và giao diện danh sách, tạo, sửa, chi tiết; form tạo/sửa dùng chung `bieu-mau-sach.hbs`.
6. Kiểm thử trường hợp cùng đầu sách có nhiều phiên bản, thiếu ảnh, ISBN trùng theo quy định và ảnh private bị truy cập trái phép.

**Điều kiện hoàn tất:** nhân viên tạo được đầu sách hoàn chỉnh, khách công khai xem được đúng phiên bản, giá và khả năng cung cấp của chi nhánh được chọn.

## 11. G6 — Nhà cung cấp, nhập kho và tồn kho

**Quy tắc dữ liệu:** tồn bán theo số lượng; sách mượn/thuê theo từng bản sao có mã riêng. Không trừ tồn của hai mô hình bằng cùng một phép cộng/trừ đơn giản.

### 11.1. Luồng nhập kho

```text
Chọn nhà cung cấp → lập phiếu nhập nháp → thêm các dòng ISBN/số lượng/giá
   → kiểm tra số liệu → duyệt/nhận hàng → tạo lô nhập
   → cập nhật tồn bán HOẶC tạo bản sao sách cho mượn
   → ghi biến động kho → đối chiếu số lượng thực nhận
```

- Chỉ phát sinh tồn khi đã ghi nhận nhận hàng theo quy trình, không khi mới lưu phiếu nháp.
- Mỗi lần ghi nhận phải có chứng từ tham chiếu; điều chỉnh tồn cần lý do và người có quyền.
- Kiểm thử nhận một phần, nhận vượt dự kiến, nhập trùng request, chuyển chi nhánh và kiểm kê lệch.

### 11.2. Luồng giữ hàng, xuất và chuyển kho

1. Đơn bán được phép giữ số lượng tồn khả dụng trong transaction; giữ hàng có thời hạn và được giải phóng khi hủy/hết hạn.
2. Xác nhận xuất kho dựa trên trạng thái giao dịch thực tế; không trừ lại khi retry callback hoặc chạy lại worker.
3. Một `ban_sao_sach` chỉ được ở một trạng thái/vị trí hợp lệ và không thể có hai phiếu mượn đang hoạt động đồng thời.
4. Chuyển mục đích từ sách bán sang bản sao cho mượn hoặc ngược lại phải có nghiệp vụ điều chuyển riêng, lịch sử và kiểm tra quyền.

**Điều kiện hoàn tất:** kiểm thử nhiều request đồng thời không bán quá tồn hoặc cấp trùng cùng bản sao; đối chiếu biến động kho khớp số liệu hiện tại.

## 12. G7 — Khách hàng, hội viên và chính sách

1. Tạo hồ sơ khách hàng có thể gắn hoặc không gắn tài khoản web; có phạm vi đơn vị và chi nhánh phù hợp.
2. Tạo gói hội viên, quyền lợi, hạn mức, thời hạn, điều kiện áp dụng, trạng thái và quy tắc gia hạn.
3. Tạo chính sách mượn/thuê theo hình thức và phạm vi chi nhánh: thời hạn, giới hạn số cuốn, gia hạn, cọc, phí phát sinh.
4. Khi khách đăng ký gói/nhận quyền lợi, lưu phiên bản/snapshot các điều kiện thực tế đã áp dụng.
5. Khi dùng quyền lợi, tạo lịch sử sử dụng liên kết giao dịch; retry không được trừ quyền lợi hai lần.
6. Kiểm thử gói hết hạn, vượt hạn mức, quyền lợi đã dùng, thay đổi chính sách sau khi phát sinh phiếu và khách chuyển chi nhánh.

**Điều kiện hoàn tất:** quyền lợi và phí trong giao dịch cũ không bị tính lại theo gói/chính sách mới.

## 13. G8 — Nền tài chính và thanh toán dùng chung

**Làm phần lõi tài chính trước khi hoàn thiện checkout/phiếu mượn.** Module bán hàng và mượn trả **gọi cùng một module tài chính**, không tự ghi thanh toán theo hai cách khác nhau.

```text
Nghiệp vụ phát sinh nghĩa vụ thanh toán
           ↓
Tạo khoản phải thu + snapshot số tiền/chính sách
           ↓
Tạo yêu cầu thanh toán có idempotency_key
           ↓
Nhận kết quả từ thu ngân / cổng thanh toán đã xác minh
           ↓
Ghi thanh toán + phân bổ + cập nhật trạng thái trong transaction
           ↓
Nếu hoàn/đảo: tạo chứng từ bù, không sửa xóa giao dịch gốc
```

1. Thống nhất mã giao dịch, đơn vị tiền tệ, kiểu tiền decimal và trạng thái thanh toán.
2. Tách tiền cọc khỏi doanh thu; ghi giao dịch thu/giữ/hoàn/khấu trừ cọc có căn cứ.
3. Xác minh chữ ký và trạng thái từ nhà cung cấp thanh toán nếu tích hợp; không đánh dấu thành công chỉ dựa vào trang FE báo đã trả.
4. Chặn callback lặp và request retry bằng idempotency/unique key phù hợp; mọi bước liên quan phải có transaction.
5. Viết xử lý hoàn tiền một phần, thất bại, giao dịch chờ đối soát và sai lệch số tiền.

**Điều kiện hoàn tất:** gửi cùng callback hai lần không ghi thu hai lần; số tiền trên chứng từ có thể đối soát với khoản phải thu, tiền cọc và hoàn tiền.

## 14. G9 — Bán sách tại quầy và trực tuyến

### 14.1. Khách mua online

```text
Khách xem/tìm sách → chọn phiên bản + chi nhánh → giỏ hàng
    → kiểm tra tồn khả dụng và giá hiện tại
    → nhập/chọn thông tin nhận hàng
    → chốt đơn, snapshot giá/thuế/giảm giá/địa chỉ
    → giữ tồn và tạo khoản phải thu
    → thanh toán / xác nhận hình thức thu
    → xuất/giao hàng → hoàn tất / trả hàng / hoàn tiền
```

### 14.2. Nhân viên bán tại quầy (POS)

```text
Đăng nhập và chọn ca/chi nhánh → quét mã hoặc tìm sách
    → chọn khách hoặc bán vãng lai → xác nhận giá/ưu đãi
    → thu tiền qua module payments → in/gửi chứng từ
    → cập nhật kho theo một giao dịch thống nhất
```

### 14.3. Trả hàng

1. Kiểm tra nguồn đơn gốc, thời hạn/chính sách và số lượng còn được trả.
2. Ghi phiếu trả và tình trạng hàng; quyết định có nhập lại kho hay đưa vào khu xử lý riêng.
3. Tính khoản hoàn từ snapshot đơn gốc và phần thực trả, không dùng giá hiện tại để tính lại.
4. Hoàn tiền qua module chung; tránh hoàn hai lần khi thao tác hoặc callback lặp.

**Kiểm thử bắt buộc:** hai người mua cuốn cuối cùng, đơn hủy khi đang giữ hàng, thanh toán callback lặp, bán tại quầy không có tài khoản web, trả một phần và hoàn tiền một phần.

## 15. G10 — Mượn miễn phí, thuê có phí và trả sách

### 15.1. Yêu cầu/đặt trước

```text
Khách chọn đầu sách + phiên bản + chi nhánh + hình thức
  → kiểm tra quyền hội viên/chính sách
  → kiểm tra bản sao khả dụng hoặc đưa vào danh sách chờ
  → nhân viên duyệt/chuẩn bị → giữ đúng bản sao
  → bàn giao tại quầy → tạo phiếu mượn và hạn trả
```

### 15.2. Phiếu mượn và phí thuê

1. Mỗi dòng phiếu liên kết bản sao cụ thể, ngày nhận, hạn trả, trạng thái, chính sách và quyền lợi đã áp dụng.
2. Với mượn miễn phí, phí thuê bằng 0 khi đủ điều kiện; các khoản cọc/phí phát sinh nếu có vẫn quản lý qua module tài chính.
3. Với thuê có phí, tạo khoản phải thu và giao dịch cọc tách biệt theo quy định; không ghi nhận cọc là doanh thu thuê.
4. Chỉ bàn giao khi các điều kiện bắt buộc đã thỏa mãn; cập nhật bản sao và phiếu trong transaction.
5. Không cho một bản sao thuộc hai phiếu mượn còn hiệu lực cùng lúc.

### 15.3. Gia hạn và trả từng cuốn

```text
Quét mã cuốn trả → tìm dòng phiếu chưa trả → kiểm tra tình trạng
    → tính phí quá hạn/hư hỏng theo snapshot đã chốt
    → ghi chi tiết lần trả, cập nhật đúng dòng phiếu
    → cập nhật bản sao và lịch sử tình trạng
    → thu phí / hoàn cọc phù hợp → đóng phiếu khi đủ điều kiện
```

- Gia hạn kiểm tra số lần cho phép, đặt trước của người khác và tình trạng thanh toán; lưu lịch sử hạn cũ/hạn mới/người duyệt.
- Một phiếu có thể trả từng phần; không đóng toàn bộ khi vẫn còn cuốn chưa trả.
- Trả hư hỏng/mất cần chứng từ và ảnh minh chứng được phân quyền, xác định phí theo chính sách đã áp dụng và người duyệt.
- Job nhắc hạn chỉ gửi thông báo; không tự tính phí/thu tiền không qua nghiệp vụ đã kiểm tra.

**Kiểm thử bắt buộc:** mượn miễn phí, thuê có phí, mượn nhiều cuốn, trả một phần, gia hạn, đặt trước, quá hạn, hư hỏng, cọc trả thiếu và hai nhân viên quét cùng bản sao.

## 16. G11 — Thông báo, báo cáo và nhật ký

1. Chuẩn hóa sự kiện nghiệp vụ: đơn xác nhận, thanh toán, bàn giao, gần hạn, quá hạn, trả sách, hội viên sắp hết hạn.
2. Backend dùng BullMQ cho email/thông báo/nhắc hạn; có retry, backoff, job ID/idempotency và nhật ký gửi.
3. Viết báo cáo theo đơn vị, chi nhánh, khoảng thời gian, hình thức kinh doanh; tách tiền cọc khỏi doanh thu và hiển thị rõ giao dịch hủy/hoàn.
4. Các bảng thống kê/cache nếu có phải đối soát với chứng từ và biến động gốc.
5. Ghi audit cho thao tác cấp quyền, điều chỉnh tồn, sửa chính sách, thu/hoàn tiền và truy cập dữ liệu nhạy cảm.
6. Kiểm thử job gửi lại không gửi trùng không kiểm soát; kiểm tra múi giờ chi nhánh, ngày cắt báo cáo và quyền xuất dữ liệu.

## 17. G12 — AI bằng Python

### 17.1. Dựng FastAPI và Worker

1. Tạo `ai-service/app/main.py`, healthcheck, Pydantic schemas và xác thực API nội bộ; chỉ BE có quyền gọi API AI nội bộ.
2. Tạo một LLM client dùng chung trong `llm/`, cấu hình provider, timeout, retry an toàn, giới hạn token và ghi nhận chi phí.
3. Tạo RQ worker riêng; dùng Redis queue **của Python**, không cố lấy job BullMQ của Node để xử lý trực tiếp.
4. Backend gửi yêu cầu tạo job qua FastAPI; FastAPI xác thực và đưa job vào RQ; worker lưu trạng thái/kết quả theo request ID.

### 17.2. Lập chỉ mục và tìm kiếm

```text
BE ghi đầu sách hợp lệ → sự kiện/yêu cầu lập chỉ mục
  → FastAPI xác minh tenant và quyền sử dụng dữ liệu
  → RQ Worker lấy metadata được phép dùng
  → chuẩn hóa/chia đoạn → tạo embedding
  → ghi vector vào pgvector kèm tenant + nguồn + phiên bản
  → đánh dấu hoàn tất / lỗi và thử lại có kiểm soát
```

- Chỉ đưa vào chỉ mục nội dung có quyền sử dụng. Không tự sao chép toàn văn sách có bản quyền.
- Mỗi truy vấn RAG lọc `don_vi_id`, quyền xem, trạng thái công khai và phạm vi chi nhánh trước khi dùng dữ liệu để tạo câu trả lời.
- AI chỉ **đề xuất** thể loại, mô tả, gợi ý sách; nhân viên duyệt trước khi sửa metadata chính thức.
- Giá, tồn, khả năng mượn, phí và trạng thái thanh toán phải lấy từ API nghiệp vụ thực tế, không lấy kết luận từ văn bản AI.

### 17.3. Kiểm thử AI

1. Bộ câu hỏi chuẩn: tìm sách theo nhu cầu, sách không tồn tại, thiếu thông tin, quyền riêng tư, nhiều ngôn ngữ.
2. Test tenant A không truy xuất tài liệu tenant B; file private không trở thành nguồn công khai.
3. Test prompt injection từ mô tả sách/tài liệu; dữ liệu nguồn không được cấp quyền gọi công cụ nghiệp vụ.
4. Test timeout, lỗi nhà cung cấp AI, chi phí quá hạn mức, index lỗi và dữ liệu sách đã ngừng hiển thị.
5. Ghi phiên bản prompt/model và nguồn dữ liệu tham chiếu phù hợp để phân tích chất lượng về sau.

**Điều kiện hoàn tất:** tắt toàn bộ AI vẫn bán/mượn/trả sách bình thường; một lỗi AI không chặn transaction lõi.

## 18. G13 — Gói SaaS, Super Admin và nhiều khách hàng

1. Xây gói dịch vụ với hạn mức tính năng, chi nhánh, tài khoản, dung lượng và AI theo chính sách kinh doanh đã duyệt.
2. Tạo luồng đơn vị đăng ký gói, thử nghiệm/kích hoạt/tạm ngưng/gia hạn và các trường hợp hết hạn.
3. Super Admin quản lý đơn vị và hóa đơn SaaS trong phạm vi cho phép; không mặc định được xem nội dung riêng tư của khách hàng.
4. Tách dòng tiền khách mua/thuê sách của đơn vị khỏi dòng tiền đơn vị thanh toán phí phần mềm cho BookFlow.
5. Kiểm thử đơn vị A hết hạn không ảnh hưởng dữ liệu/giao dịch của đơn vị B; giới hạn gói phải kiểm tra ở backend, không chỉ ẩn nút FE.
6. Mặc định một bản image cho nhiều tenant; khách hàng cần môi trường riêng có cấu hình/secrets/database/storage phù hợp, không fork code tràn lan.

---

# PHẦN IV. QUY TRÌNH CHUNG CHO MỖI MODULE / MỖI TICKET

## 19. Mẫu quy trình làm một chức năng từ đầu đến cuối

Ví dụ ticket: **Thêm và sửa đầu sách**. Áp dụng cấu trúc này cho kho, khách hàng, hội viên, bán hàng, mượn trả và những phân hệ khác.

```text
01. Phân tích yêu cầu + ai được làm + các lỗi dự kiến
 ↓
02. Chốt trường DB / FK / index / trạng thái / snapshot
 ↓
03. Chốt API trong contracts/openapi/
 ↓
04. Viết migration + seed (nếu cần) + test ràng buộc
 ↓
05. Viết repository + service + validation + permission
 ↓
06. Viết controller + route + test API/transaction
 ↓
07. Viết frontend services/<nghiep-vu>.api.js
 ↓
08. Ghép form field/modal/table chung vào trang nghiệp vụ
 ↓
09. Viết JavaScript riêng của màn hình và trạng thái lỗi/loading
 ↓
10. Kiểm thử FE/BE tích hợp + quyền + tenant + ngoại lệ
 ↓
11. Viết tài liệu, cập nhật migration và changelog
 ↓
12. Pull Request → CI → review → merge develop
```

### 19.1. Định nghĩa hoàn tất (Definition of Done)

- [ ] Có tiêu chí nghiệm thu và các trường hợp lỗi cụ thể.
- [ ] Migration có thứ tự, chạy được trên database sạch và database ở phiên bản trước; không làm mất dữ liệu.
- [ ] Mọi API có xác thực, kiểm tra quyền, tenant/branch scope và validation phù hợp.
- [ ] Logic nghiệp vụ nằm trong service; controller không chứa toàn bộ xử lý; repository không tự quyết định quyền.
- [ ] Dùng component/form/hàm chung sẵn có thay vì nhân bản; các quy tắc chung không bị viết lại ở từng màn hình.
- [ ] Có test thành công, lỗi, thiếu quyền, khác đơn vị, retry và đồng thời khi có liên quan.
- [ ] Không lộ secrets hoặc dữ liệu nhạy cảm trong log, API, trang HTML hay ảnh/file private.
- [ ] Cập nhật hợp đồng API, tài liệu, ghi chú triển khai và kết quả kiểm thử.
- [ ] Build được service bị ảnh hưởng; CI/PR đạt trước khi merge.

## 20. Phân trách nhiệm để tránh lặp code

| Việc | Nơi sở hữu duy nhất | Các phần khác phải làm gì? |
|---|---|---|
| Xác thực và phân quyền | `backend/src/common/` + module auth/permission | FE chỉ render theo quyền, BE kiểm tra cuối cùng |
| Kết nối DB/transaction | `backend/src/database/` | Các service truyền cùng transaction khi cần |
| Form field, modal, bảng | `frontend/src/views/partials/` và `public/js/core/` | Form nghiệp vụ ghép các thành phần dùng chung |
| SVG và logo | `frontend/src/assets/` + `scripts/build-icons.mjs` | Trang gọi partial `icon.hbs` |
| Upload/metadata file | module file BE + MinIO | Sách, hồ sơ, chứng từ chỉ liên kết file |
| Kho/tồn/bản sao | module kho BE | Bán/mượn gọi service kho, không tự sửa kho tùy ý |
| Thu/cọc/hoàn/đối soát | module tài chính BE | Bán, mượn, hội viên tạo nghiệp vụ và gọi module tài chính |
| Tư vấn/embedding/RAG | `ai-service/` | BE gọi FastAPI theo contracts, không copy code Python |
| Định dạng giao tiếp | `contracts/` | FE, BE, Python kiểm thử tương thích |

**Quy tắc chống lặp:** chỉ đưa vào `common/` hoặc `core/` khi có cùng một trách nhiệm thật sự; không tạo một “service chung” khổng lồ gom cả nghiệp vụ không liên quan.

---

# PHẦN V. QUY TRÌNH BUILD, KIỂM THỬ VÀ TRIỂN KHAI

## 21. Ma trận thay đổi → build/kiểm thử

| Vị trí thay đổi | Build tối thiểu | Kiểm thử bắt buộc |
|---|---|---|
| Chỉ `frontend/` | `frontend` | FE unit/render/E2E liên quan, contract API tiêu thụ |
| Chỉ `backend/` | `backend` | BE unit/integration/API; `backend-worker` dùng image backend mới nếu có thay đổi liên quan |
| Python API riêng | `ai-api` | FastAPI test, hợp đồng nội bộ và smoke BE ↔ AI |
| Python mã dùng chung API/Worker | `ai-api` + `ai-worker` | AI unit/integration, queue và contract |
| Chỉ Python worker/tác vụ | `ai-worker` | Job/retry/idempotency/indexing test |
| `contracts/` | Các ứng dụng bị ảnh hưởng | Contract + integration + E2E liên quan |
| `database/migrations/` | Migration job, không phải image FE bắt buộc | Migration test, tương thích BE/AI, backup/restore khi cần |
| `infrastructure/` hoặc Compose | Service cấu hình bị ảnh hưởng | Validate Compose, healthcheck, smoke và kiểm tra network/secrets |
| FE + BE + AI thay đổi đồng thời | Build tất cả ứng dụng bị ảnh hưởng | Contract, integration và E2E toàn luồng |

**Ví dụ lệnh kế hoạch** (chỉ chạy sau khi các file Docker đã được triển khai):

```bash
# Build chung bốn image ứng dụng
docker compose build frontend backend ai-api ai-worker

# Build riêng
docker compose build frontend
docker compose build backend
docker compose build ai-api ai-worker

# Chạy môi trường phát triển
docker compose -f compose.yaml -f compose.dev.yaml up -d --build
```

`backend-worker` là một container chạy command khác từ image `backend`, không cần build image thứ năm nếu dùng cùng mã/dependencies. PostgreSQL, Redis, MinIO và Nginx là hạ tầng, không phải code nghiệp vụ cần rebuild cùng mọi thay đổi.

## 22. Quy trình CI cho Pull Request

```text
PR được mở/cập nhật
  → kiểm tra tên nhánh, file nhạy cảm, cấu hình và định dạng
  → lint / unit test theo ứng dụng thay đổi
  → test migration / DB constraints nếu đụng database
  → test contract nếu đụng API/JSON Schema
  → integration test với các service cần thiết
  → build thử image bị ảnh hưởng + quét dependency/image phù hợp
  → review → cho phép merge develop
```

Không bắt buộc build toàn hệ thống trên mọi thay đổi CSS, nhưng thay đổi schema API, DB hoặc thư viện mã dùng chung phải chạy đủ bài kiểm thử tương thích. PR bị chặn nếu migration phá dữ liệu hoặc kiểm tra quyền thất bại.

## 23. Quy trình migration an toàn

1. Mỗi thay đổi schema có migration mới; không sửa lại migration đã phát hành trừ khi đang ở nhánh chưa triển khai và quy trình cho phép.
2. Với thay đổi không tương thích, dùng **expand → migrate data → contract**: thêm cột/bảng tương thích trước; cho app đọc/ghi cả hai dạng khi cần; chuyển dữ liệu có kiểm tra; chỉ xóa cấu trúc cũ ở phiên bản sau.
3. Chạy migration trên DB thử nghiệm, dữ liệu mẫu lớn và bản sao đã loại dữ liệu nhạy cảm nếu cần.
4. Sao lưu/điểm khôi phục trước thay đổi có rủi ro; kiểm tra cách khôi phục. **Rollback image không tự đảo ngược migration DB**.
5. Triển khai migration qua một job duy nhất có lock/lịch sử; không cho từng replica API tự chạy migration khi khởi động.
6. Kiểm tra ràng buộc, số lượng bản ghi, chức năng liên quan sau migration; ghi nhận phiên bản schema.

## 24. Quy trình Stable

```text
Release branch / image đã build
       ↓
Deploy vào môi trường Stable (dữ liệu thử riêng)
       ↓
Migration và seed thử nghiệm
       ↓
Smoke: login, sách, ảnh, kho, bán, mượn, thanh toán, AI
       ↓
E2E + test đồng thời + phân quyền + tenant isolation
       ↓
UAT theo kịch bản thu ngân / thủ thư / khách hàng / admin
       ↓
Kiểm tra backup & restore + log + healthcheck
       ↓
Duyệt phiên bản để chuyển Production
```

**Tiêu chí dừng phát hành:** sai tiền/cọc, bán quá tồn, một cuốn bị mượn hai nơi, rò rỉ dữ liệu giữa tenant, mất file khách hàng, migration không thể kiểm soát hoặc lỗi xác thực nghiêm trọng.

## 25. Quy trình Production và rollback

1. Chuẩn bị release notes, image digest/tag, danh sách migration, biến môi trường mới, plan mở rộng/cấu hình và thời điểm triển khai đã thống nhất.
2. Kiểm tra backup gần nhất và thử quy trình khôi phục theo chính sách; nếu thay đổi DB lớn, có điểm khôi phục phù hợp.
3. Deploy hạ tầng/cấu hình tương thích trước; chạy migration theo kế hoạch; lần lượt thay thế service bị ảnh hưởng bằng image đã kiểm thử.
4. Chạy smoke test trên tên miền thật bằng tài khoản kiểm thử có quyền hạn tối thiểu; không làm giao dịch tài chính thật khi không cần thiết.
5. Theo dõi error rate, latency, backlog queue, PostgreSQL, Redis, storage, giao dịch tiền/kho và kết quả AI; đối soát dữ liệu trọng yếu.
6. Nếu phát sinh lỗi: dừng phát hành, chuyển ứng dụng về image tương thích trước hoặc bật cơ chế bảo vệ đã chuẩn bị. **Không tự chạy migration đảo dữ liệu khi chưa biết hậu quả**; xử lý DB theo kế hoạch khôi phục/bù trừ đã kiểm thử.
7. Ghi nhận phiên bản và sự cố; đồng bộ mọi hotfix vào `develop`.

## 26. Quy trình triển khai cho nhiều site khách hàng

```text
Một phiên bản BookFlow đã kiểm thử
          ↓
Image/tag chuẩn từ registry
          ↓
Chọn cấu hình site: tên miền, tenant, secrets, tài nguyên
          ↓
Kiểm tra tương thích schema và giới hạn gói
          ↓
Triển khai image theo nhóm site/canary khi cần
          ↓
Smoke site, kiểm tra dữ liệu riêng, theo dõi và ghi phiên bản
```

- **SaaS dùng chung:** một hệ thống nhiều đơn vị; `don_vi_id`/phân quyền đảm bảo cô lập dữ liệu.
- **Site triển khai riêng:** cùng image nhưng DB, storage, Redis hoặc cấu hình riêng theo yêu cầu. Secrets tuyệt đối tách theo site.
- **Không tạo branch riêng cho khách hàng chỉ vì giao diện, branding, quyền hoặc giá khác nhau:** ưu tiên cấu hình, feature flag, template/branding theo tenant; custom code phải có quyết định kiến trúc và quy trình bảo trì riêng.

---

# PHẦN VI. QUY TRÌNH VẬN HÀNH, BẢO MẬT VÀ BẢO TRÌ

## 27. Kiểm thử theo lớp

| Lớp | Nội dung |
|---|---|
| Unit | Hàm tính tiền, phí thuê, quyền lợi, trạng thái, định dạng; AI parsing/retrieval |
| Integration | Repository + PostgreSQL, MinIO, Redis/BullMQ/RQ, BE ↔ FastAPI |
| Contract | FE ↔ BE; BE ↔ FastAPI; mã lỗi, schema và phiên bản |
| E2E | Khách mua; thu ngân POS; thủ thư mượn/trả; quản lý cấu hình; Super Admin |
| Concurrency | Mua cuốn cuối, giữ tồn, hai nhân viên mượn/trả cùng cuốn, callback thanh toán lặp |
| Security | Tenant/branch isolation, RBAC, upload private, session, rate limit, RAG ACL |
| Recovery | Restore PostgreSQL và MinIO, queue retry, restart/đổi image, migration sự cố |
| Performance | Tìm sách, danh sách phân trang, truy vấn nhiều tenant, queue tồn đọng, AI timeout |

## 28. Quy trình sao lưu và khôi phục

1. Xác định mục tiêu mất dữ liệu tối đa và thời gian khôi phục chấp nhận được cho từng môi trường; quyết định lịch backup từ mục tiêu đó.
2. Sao lưu PostgreSQL và object storage MinIO theo kế hoạch nhất quán; lưu bản sao ở nơi không cùng một ổ/máy chủ với dữ liệu gốc.
3. Mã hóa bản sao, giới hạn người truy cập, theo dõi kết quả và cảnh báo khi backup thất bại.
4. Định kỳ dựng môi trường khôi phục thử, xác minh dữ liệu, file đính kèm, các bản ghi tham chiếu và tính toàn vẹn giao dịch.
5. Có runbook cho lỗi máy chủ, xóa nhầm file, migration lỗi, mất Redis, lỗi AI hoặc mất kết nối nhà cung cấp thanh toán.

## 29. Quy trình vận hành hằng ngày / theo phiên bản

- Kiểm tra healthcheck, dung lượng ổ, kết nối DB, backup, cảnh báo bảo mật, queue tồn đọng và lỗi callback.
- Theo dõi các số liệu đối soát: tồn kho bán, bản sao đang mượn, khoản phải thu, tiền cọc chưa hoàn, hoàn tiền chờ xử lý và chi phí AI theo tenant.
- Xử lý cảnh báo theo mức độ ảnh hưởng; ưu tiên ngăn sai lệch tiền/kho và rò rỉ dữ liệu trước cải tiến giao diện.
- Định kỳ cập nhật dependency, image nền và bản vá bảo mật trong nhánh `chore/...`, qua Stable trước khi lên Production.
- Khi thay đổi quy trình nghiệp vụ, cập nhật đặc tả, hợp đồng, migration nếu có, test và tài liệu vận hành cùng PR.

---

# PHẦN VII. CHECKLIST BẮT ĐẦU DỰ ÁN VÀ MỐC NGHIỆM THU

## 30. 20 việc nên làm đầu tiên, đúng thứ tự

- [ ] 01. Duyệt lại cấu trúc thư mục BookFlow cuối cùng và quy tắc đặt tên.
- [ ] 02. Chốt phạm vi MVP, vai trò và sơ đồ nghiệp vụ bán/mượn/thuê.
- [ ] 03. Đánh dấu bảng MVP trong từ điển 99 bảng; chốt quan hệ/phạm vi tenant.
- [ ] 04. Tạo repository, `main`, `develop`, quy tắc PR và CI cơ bản.
- [ ] 05. Dựng skeleton `frontend`, `backend`, `ai-service`, `database`, `contracts`.
- [ ] 06. Tạo `.env.example`, Dockerfile, Compose dev và network/volume.
- [ ] 07. Dựng PostgreSQL + pgvector, Redis, MinIO, Nginx và healthcheck.
- [ ] 08. Viết migration nền, migration history, seed quyền/vai trò.
- [ ] 09. Chốt OpenAPI BE và AI nội bộ, response/error/pagination.
- [ ] 10. Làm xác thực, phiên đăng nhập, tenant/branch scope và RBAC.
- [ ] 11. Xây layout FE, form field, modal, bảng, API client và lỗi chung.
- [ ] 12. Thiết kế logo và SVG icon gốc; viết bước build sprite.
- [ ] 13. Làm module file chung + MinIO + quyền file private/public.
- [ ] 14. Làm danh mục sách/phiên bản/tác giả/thể loại/hình thức cung cấp.
- [ ] 15. Làm nhập kho, tồn bán, bản sao mượn, biến động và kiểm thử đồng thời.
- [ ] 16. Làm khách hàng, hội viên và chính sách mượn/thuê.
- [ ] 17. Làm tài chính chung: khoản phải thu, thanh toán, cọc, hoàn.
- [ ] 18. Hoàn tất bán tại quầy/online và luồng mượn/thuê/trả từng cuốn.
- [ ] 19. Thêm thông báo/báo cáo tối thiểu; hoàn thiện E2E và Stable.
- [ ] 20. Sau MVP ổn định: AI, giới hạn SaaS nâng cao, Production và giám sát.

## 31. Bàn giao từng mốc

**Mốc 1 — Nền tảng:** chạy được FE/BE/Python skeleton và hạ tầng; migration, đăng nhập và phân quyền đúng; icon/form dùng chung có ví dụ thực tế.

**Mốc 2 — Dữ liệu sách và kho:** có thể nhập sách, gắn ảnh, quản lý bản sao và tồn bán; thử đồng thời đạt.

**Mốc 3 — Giao dịch đầy đủ:** bán, mượn miễn phí, thuê có phí, trả từng cuốn, thanh toán, cọc và hoàn có kiểm thử và đối soát.

**Mốc 4 — Sản phẩm dùng thử:** đủ trang công khai/khách/nhân viên/admin cho luồng MVP, thông báo quan trọng, báo cáo cơ bản, backup và Stable.

**Mốc 5 — AI và SaaS:** Python tư vấn/tìm kiếm có ACL, AI Worker ổn định, Super Admin/gói SaaS được kiểm thử, triển khai Production có giám sát và kế hoạch phục hồi.

---

## Quyết định cần giữ cố định trong quá trình làm

1. **Node.js + Express quyết định nghiệp vụ.** Python chỉ xử lý AI và tác vụ AI; không được tự xác nhận thu tiền, cấp sách, giảm tồn hoặc phê duyệt giao dịch.
2. **Một nguồn dữ liệu giao dịch:** PostgreSQL là nguồn chuẩn; Redis/cache/search chỉ là dữ liệu hỗ trợ, có thể xây lại hoặc đối soát.
3. **File lưu ngoài database:** MinIO/S3 giữ nội dung; PostgreSQL giữ metadata, liên kết và quyền.
4. **Mỗi module có một chủ trách nhiệm:** không sao chép xử lý kho/tiền/hội viên/upload vào nhiều module.
5. **Mỗi thay đổi có quy trình:** ticket → nhánh → code/test → PR → Stable → Production; image riêng không có nghĩa được phá hợp đồng chung.
6. **Phát triển theo giai đoạn:** 99 bảng là phạm vi thiết kế mở rộng; chọn bảng và màn hình theo các lát cắt thực tế, không tạo hết chỉ để đủ số lượng.

**Trạng thái tài liệu:** bản kế hoạch để duyệt và dùng làm checklist phát triển; chưa khẳng định bất kỳ thư mục, migration, API, job hay Docker image nào đã được triển khai trong repository thực tế.
