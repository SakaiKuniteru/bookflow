# BOOKFLOW AI — QUY TRÌNH VIẾT CODE THEO FOLDER VÀ FILE

**Tên file:** `quy-trinh-thuc-hien.md`  
**Phiên bản:** 3.1 — cập nhật lộ trình BE trước, bổ sung quy trình F17 theo cấu trúc `ai-service/` đã chốt.  
**Áp dụng cho:** cấu trúc BookFlow AI 1.1; frontend Handlebars + Bootstrap + JavaScript, backend Node.js + Express, Python FastAPI/RQ, PostgreSQL + pgvector, Redis/BullMQ, MinIO, Nginx, Docker Compose.  
**Nhánh phát triển đang dùng:** `dev`. `main` là nhánh phát hành. Không sử dụng `develop` trong tài liệu này.

> **Phân biệt rõ:** “Tạo file” chỉ tạo đường dẫn. **“Viết code xong file”** có nghĩa là đã khai báo dependency cần thiết, viết được hàm/chức năng của file, nối vào nơi gọi, có cách chạy hoặc test và xác nhận kết quả. F00 chủ yếu là cấu hình repository; **code chạy ứng dụng bắt đầu từ F04 (backend) và F06 (frontend)**. F00 vẫn có một script Node.js chạy được để kiểm tra nền tảng.

## 0. Quy ước không được đổi giữa chừng

- Tên kỹ thuật giữ tiếng Anh: `frontend`, `backend`, `ai-service`, `database`, `contracts`, `infrastructure`, `scripts`, `docs`, `src`, `views`, `routes`, `controllers`, `services`, `repositories`, `middlewares`, `common`, `Dockerfile`, `package.json`...
- Tên nghiệp vụ tự đặt dùng tiếng Việt không dấu: `sach/`, `muon-tra/`, `bieu-mau-sach.hbs`, `sach.service.js`; Python dùng `snake_case`, ví dụ `tu_van_sach.py`; bảng/cột PostgreSQL dùng `snake_case`.
- Backend là nguồn quyết định nghiệp vụ và quyền. Frontend chỉ render/gọi API; Python xử lý AI. Không sao chép nghiệp vụ kho/tiền/upload sang FE hay Python.
- `frontend`, `backend`, `ai-api`, `ai-worker` build được độc lập; `backend-worker` dùng cùng image backend với lệnh chạy khác.
- **Chỉ viết file đang có nhu cầu chạy hoặc được file khác gọi đến.** Không tạo hàng trăm file rỗng cho đẹp cây thư mục.
- Trong ví dụ code dưới đây, phần nào gọi là “mẫu chạy được” phải được cài dependency và chạy đúng lệnh đã ghi. Những bước nghiệp vụ phía sau là thiết kế hàm/luồng để triển khai dựa trên migration và hợp đồng thực tế, không giả vờ đã có code.

---

# PHẦN I — CÂY PHỤ THUỘC ĐỂ VIẾT CODE

```text
F00  Repository + cấu hình gốc + script kiểm tra cấu trúc
  │
  ├── F01  Contracts: thống nhất JSON request/response + lỗi + quyền
  │     │
  │     ├── F03  Database: migration runner + schema nền + test
  │     │     │
  │     │     └── F04  Backend chạy thật: Express + health + pool + transaction
  │     │            │
  │     │            └── F05  Auth + tổ chức + chi nhánh + RBAC + test cô lập tenant
  │     │                   │
  │     └───────────────────┤
  │                         └── F06  Frontend chạy thật: Express + HBS + API client
  │                                ├── F07  SVG/logo tự thiết kế + build icon
  │                                └── F08  Field/form/modal/bảng/JS/CSS dùng chung
  │
  ├── F02  Compose dev: PostgreSQL + Redis + MinIO (cần trước F03/F09)
  │
  └── F09  Module file chung + MinIO + metadata (cần F02/F03/F05)
          │
          └── F10  Danh mục sách hoàn chỉnh: DB → BE → FE → test
                 ├── F11  Nhà cung cấp + nhập kho + tồn/bản sao
                 ├── F12  Khách hàng + hội viên
                 └── F13  Tài chính chung (khoản thu/cọc/hoàn)
                        ├── F14  Giỏ hàng + POS + bán online
                        └── F15  Đặt trước + mượn miễn phí + thuê + trả
                               │
                               └── F16  BullMQ + thông báo + hoàn thiện báo cáo BE
                                      │
                                      └── F17  AI API + AI Worker + pgvector (CHỈ sau BE)
                                             │
                                             └── F18  Báo cáo FE + SaaS + Nginx + CI/build/deploy/backup
```

**Một chức năng được coi là code xong khi có đủ:** đường đi dữ liệu; hàm gọi nhau; dữ liệu trả đúng contract; kiểm tra quyền và lỗi; test; lệnh chạy; kết quả xác nhận. Tất cả được thực hiện trên nhánh `dev` hoặc nhánh `feature/...` tạo từ `dev`.

---

# PHẦN II — QUY TRÌNH CODE TỪNG BƯỚC

## F00 — Repository có cấu hình hợp lệ và một script chạy được

**Mục đích:** chuẩn bị nền cho việc code. Bước này **chưa tạo API bán/mượn**, nhưng không dừng ở `mkdir`.

### F00.1. Folder và file cần có

```text
BookFlow/
├── frontend/
├── backend/
├── ai-service/
├── database/
├── contracts/
├── infrastructure/
├── scripts/
│   ├── kiem-tra-cau-truc.mjs            # CODE thật của F00
│   └── tests/
│       └── kiem-tra-cau-truc.test.mjs  # Test script F00
├── docs/
│   ├── architecture/
│   │   ├── tong-quan.md
│   │   └── ranh-gioi-phan-he.md
│   └── database/
│       ├── tu-dien-du-lieu.md
│       └── ban-goc/
├── .github/workflows/
├── package.json
├── .env.example
├── .gitignore
├── .dockerignore
└── README.md
```

**Thứ tự viết và nội dung:**

1. `README.md`: mô tả BookFlow, bốn image ứng dụng, dịch vụ hạ tầng, đường dẫn docs, quy tắc bảo mật; ghi rõ chỉ chạy script đã tồn tại.
2. `.gitignore`: bỏ `.env` thật, dependency, build, log, dump, uploads; giữ `.env.example`.
3. `.dockerignore`: bỏ `.git`, dependency máy local, bí mật và file phát sinh; **sau này từng app vẫn có `.dockerignore` riêng**.
4. `.env.example`: biến mẫu không có khóa thật; file này chưa được dùng làm mật khẩu production.
5. `package.json`: chỉ khai báo các lệnh đã có file chạy thật; **chưa khai báo giả `build:all` nếu script build chưa viết**.
6. `scripts/kiem-tra-cau-truc.mjs`: code kiểm tra folder và file gốc, đọc và parse `package.json`, kiểm tra `private: true`.
7. `scripts/tests/kiem-tra-cau-truc.test.mjs`: gọi script ở bước 6, khẳng định exit code bằng `0`.
8. `docs/architecture/*.md` và `docs/database/tu-dien-du-lieu.md`: mô tả ranh giới và đưa bản từ điển dữ liệu đã duyệt vào tài liệu; không tự sửa nội dung bộ dữ liệu gốc.

### F00.2. Code mẫu hoàn chỉnh cho `package.json`

**FILE:** `BookFlow/package.json` — **TẠO MỚI**:

```json
{
  "name": "bookflow",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "kiem-tra:nen-tang": "node scripts/kiem-tra-cau-truc.mjs",
    "test:nen-tang": "node --test scripts/tests/*.test.mjs"
  }
}
```

**FILE:** `BookFlow/scripts/kiem-tra-cau-truc.mjs` — **TẠO MỚI**:

```js
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const thuMucGoc = resolve(import.meta.dirname, '..');
const thuMucBatBuoc = [
  'frontend', 'backend', 'ai-service', 'database', 'contracts',
  'infrastructure', 'scripts', 'docs/architecture',
  'docs/database', '.github/workflows'
];
const tepBatBuoc = ['README.md', '.gitignore', '.dockerignore', '.env.example', 'package.json'];

for (const duongDan of [...thuMucBatBuoc, ...tepBatBuoc]) {
  if (!existsSync(resolve(thuMucGoc, duongDan))) {
    throw new Error(`Thieu duong dan: ${duongDan}`);
  }
}

const packageJson = JSON.parse(
  readFileSync(resolve(thuMucGoc, 'package.json'), 'utf8')
);
if (packageJson.private !== true) {
  throw new Error('package.json phai co private: true');
}

console.log('F00 OK: cau truc goc va package.json hop le');
```

> Nếu phiên bản Node.js đang dùng chưa hỗ trợ `import.meta.dirname`, thay `thuMucGoc` bằng `resolve(new URL('..', import.meta.url).pathname)` trên macOS; khi triển khai đa nền tảng nên dùng `fileURLToPath` từ `node:url`.

**FILE:** `BookFlow/scripts/tests/kiem-tra-cau-truc.test.mjs` — **TẠO MỚI**:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const thuMucGoc = fileURLToPath(new URL('../../', import.meta.url));

test('F00: repository co cau truc bat buoc', () => {
  const ketQua = spawnSync(process.execPath, ['scripts/kiem-tra-cau-truc.mjs'], {
    cwd: thuMucGoc,
    encoding: 'utf8'
  });
  assert.equal(ketQua.status, 0, ketQua.stderr);
  assert.match(ketQua.stdout, /F00 OK/);
});
```

**Lệnh chạy và kết quả mong đợi:**

```bash
npm run kiem-tra:nen-tang
npm run test:nen-tang
git status
```

Phải in `F00 OK`, bài test thành công; `git status` không chứa `.env` thật, file dump hoặc `node_modules`. Sau khi kiểm tra mới commit và push lên `dev`.

**Không làm ở F00:** viết API giả, tạo 99 migration trống, viết Dockerfile chưa có ứng dụng để chạy hoặc khai báo các script chưa tồn tại.

---

## F01 — Viết hợp đồng API có thể kiểm tra, không chỉ tạo file YAML

**Phụ thuộc:** F00. **File:** `contracts/openapi/bookflow-api.yaml`, `contracts/openapi/ai-noi-bo-api.yaml`, `contracts/schemas/loi-api.schema.json`, `contracts/examples/`.

1. Viết schema response chuẩn: thành công, lỗi, request ID, phân trang; quyết định tiền sử dụng biểu diễn decimal nhất quán và ngày/giờ UTC.
2. Khai báo API đầu tiên `GET /health`: response `200` chứa `status` và `service`. Đây là hợp đồng để F04 viết đúng code.
3. Khai báo nhóm xác thực, sách và upload khi tới module tương ứng, **không đưa đường dẫn không có kế hoạch triển khai vào bản public**.
4. Viết `ai-noi-bo-api.yaml` cho xác thực backend → FastAPI, request ID, giới hạn thời gian và trạng thái job.
5. Viết ví dụ JSON hợp lệ/không hợp lệ; cài công cụ kiểm tra OpenAPI trong CI khi tới F18.

**Kiểm tra:** đọc được OpenAPI; request/response `/health` khớp code F04 và F17; API FE không giả định các trường chưa có. **Kết thúc F01:** backend và frontend biết chính xác định dạng trao đổi.

---

## F02 — Code hạ tầng tối thiểu chạy được trong development

**Phụ thuộc:** F00. **File theo thứ tự:**

```text
infrastructure/postgres/README.md
infrastructure/redis/redis.conf
infrastructure/minio/README.md
compose.yaml
compose.dev.yaml
.env.example
```

1. Viết `compose.yaml` với `postgres` (image PostgreSQL tích hợp pgvector), `redis`, `minio`, volume dữ liệu và mạng nội bộ; healthcheck cho các dịch vụ hỗ trợ.
2. Viết `compose.dev.yaml` chỉ override phần phục vụ dev như port binding lên `127.0.0.1` và tài nguyên thử nghiệm. Không mở DB/Redis/MinIO công khai trong production.
3. Dùng biến môi trường từ file cục bộ **không commit**; không cho ví dụ mật khẩu production vào Git. Cấu hình database phải dùng đúng image, extension và version đã kiểm thử.
4. Chạy `docker compose -f compose.yaml -f compose.dev.yaml config --quiet`, sau đó `up -d postgres redis minio`.
5. Kiểm tra container healthy, volume vẫn còn dữ liệu sau khi container tạo lại. Chưa chạy migration lúc chưa viết runner.

**Kết thúc F02:** ba dịch vụ nền trả lời kết nối trong mạng Docker; cấu hình Compose có thể parse và không lộ secrets.

---

## F03 — Viết runner migration rồi mới viết SQL nghiệp vụ

**Phụ thuộc:** F01, F02. **Code theo đúng thứ tự:**

```text
database/package.json
  ↓
database/scripts/migrate.js
  ↓
database/migrations/001_extensions.sql
  ↓
database/migrations/002_nen-tang.sql
  ↓
database/migrations/003_tai-khoan-phan-quyen.sql
  ↓
database/tests/migration.test.js
  ↓
database/seeds/quyen.sql + vai-tro-mac-dinh.sql
```

**File `database/scripts/migrate.js`:** viết các hàm `ketNoiDatabase()`, `taoBangLichSu()`, `layMigrationDaChay()`, `chayMigration()`, `main()`; dùng transaction và khóa migration phù hợp để không có hai tiến trình cùng chạy. Kiểm tra checksum hoặc quy tắc không sửa migration đã chạy; rollback transaction khi SQL lỗi. Runner trả exit code khác `0` khi thất bại.

**File migration:** mỗi file chỉ làm một bước phụ thuộc hợp lệ. Extension `vector` trước bảng vector; `don_vi`, `chi_nhanh`, `tai_khoan`, thành viên và quyền trước các bảng cần tham chiếu. Với FK vòng, tạo bảng trước rồi thêm constraint sau. `tep_dinh_kem` cần tồn tại trước FK `dau_sach.anh_bia_chinh_id`.

**Test bắt buộc:** migration trên DB sạch thành công; chạy lại không chạy trùng; SQL lỗi không để nửa giao dịch; bản ghi lịch sử và schema khớp; seed chạy lại không sinh bản ghi trùng. Không dùng seed demo trên production.

**Kết thúc F03:** có DB thật đã migrate và test; không chỉ có folder SQL.

---

## F04 — Viết Backend API đầu tiên chạy được, có test thật

**Phụ thuộc:** F01, F02, F03. Tạo `backend/package.json` và cài dependency Express, driver `pg`, validation và logging khi cần. Không dùng `backend/src/modules/` trước khi app core chạy.

### F04.1. Viết Express tối thiểu

**FILE:** `backend/src/app.js` — **TẠO MỚI**:

```js
import express from 'express';

export function taoUngDung() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'backend' });
  });

  return app;
}
```

**FILE:** `backend/src/server.js` — **TẠO MỚI**:

```js
import { taoUngDung } from './app.js';

const cong = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(cong) || cong < 1 || cong > 65535) {
  throw new Error('PORT khong hop le');
}

taoUngDung().listen(cong, '0.0.0.0', () => {
  console.log(`Backend dang chay tai cong ${cong}`);
});
```

**FILE:** `backend/package.json` — **TẠO MỚI** (sau đó `npm install express pg` để ghi dependency và lockfile):

```json
{
  "name": "bookflow-backend",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test tests/*.test.js"
  }
}
```

**FILE:** `backend/tests/health.test.js` — **TẠO MỚI**:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { taoUngDung } from '../src/app.js';

test('GET /health tra status ok', async () => {
  const server = taoUngDung().listen(0);
  try {
    const cong = server.address().port;
    const response = await fetch(`http://127.0.0.1:${cong}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'backend' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

### F04.2. Nối database/common vào backend

**Thứ tự file và code phải viết:**

| File | Hàm/chức năng cần viết | Được sử dụng bởi |
|---|---|---|
| `src/config/environment.js` | Đọc và validate `PORT`, DB/Redis/MinIO, không in mật khẩu | `server.js`, integrations |
| `src/database/pool.js` | Tạo một `pg.Pool`, đóng pool khi ứng dụng dừng | repositories |
| `src/database/query.js` | Nhận client hoặc pool, query có tham số `$1`, `$2` | repositories |
| `src/database/transaction.js` | `trongGiaoDich(callback)` với `BEGIN/COMMIT/ROLLBACK` | services giao dịch |
| `src/common/errors/AppError.js` | Mã lỗi, HTTP status, thông điệp có kiểm soát | services/middleware |
| `src/common/middlewares/error-handler.js` | Chuyển lỗi thành response đúng contract, log không lộ secrets | `app.js` |
| `src/routes/index.js` | Gom route `/api/...`, không xử lý nghiệp vụ ở đây | `app.js` |

**Lệnh chạy:** từ `backend/` chạy `npm install express pg`, `npm test`, `npm start`; gọi `curl http://localhost:3001/health`. `GET /ready` chỉ trả sẵn sàng khi kết nối thiết yếu đã hoạt động; phân biệt rõ `/health` (tiến trình sống) và `/ready` (phụ thuộc sẵn sàng).

**Kết thúc F04:** API health chạy thật, test đạt, kết nối DB/transaction có test tích hợp với PostgreSQL; một lỗi query phải rollback và API không làm lộ stack trace.

---

## F05 — Viết auth, đơn vị, chi nhánh và RBAC theo chiều dữ liệu → API

**Phụ thuộc:** F03–F04. **Thứ tự cho mỗi module:** `migration → validation → repository → service → permission → controller → route → test`.

**Tạo code theo chuỗi:**

```text
backend/src/modules/
├── tai-khoan/               # Tài khoản và hồ sơ
├── xac-thuc/                # Đăng nhập, phiên, đổi/đặt lại mật khẩu
├── phan-quyen/              # Vai trò, quyền, gán quyền
├── don-vi/                  # CRUD và phạm vi đơn vị
├── chi-nhanh/               # Chi nhánh thuộc đơn vị
│
├── nhan-vien/               # Danh sách nhân viên, mời tham gia, trạng thái làm việc,
│                           # điều chuyển chi nhánh và quản lý phân công
├── tep-tin/                 # Upload, quản lý ảnh sách, ảnh đại diện, logo và quyền truy cập file
│
├── tac-gia/                 # Danh mục tác giả
├── the-loai/                # Danh mục thể loại sách
├── nha-xuat-ban/            # Danh mục nhà xuất bản
├── sach/                    # Đầu sách, thông tin sách, ISBN, tác giả, thể loại
├── phien-ban-sach/          # Phiên bản, ấn bản, định dạng và giá sách
│
├── nha-cung-cap/            # Danh mục và thông tin nhà cung cấp
├── kho/                     # Kho thuộc chi nhánh, vị trí lưu trữ
├── nhap-kho/                # Phiếu nhập, nhập từ nhà cung cấp, kiểm nhận
├── ton-kho/                 # Số lượng tồn, tồn theo kho/chi nhánh, lịch sử biến động
├── chuyen-kho/              # Điều chuyển sách giữa các kho và chi nhánh
├── kiem-kho/                # Kiểm kê, đối chiếu và điều chỉnh tồn kho
│
├── khach-hang/              # Hồ sơ khách hàng, lịch sử giao dịch
├── hoi-vien/                # Hạng hội viên, chính sách và quyền lợi
│
├── gio-hang/                # Giỏ hàng và các mặt hàng được chọn
├── don-hang/                # Đơn hàng, trạng thái xử lý, giao và nhận hàng
├── ban-hang/                # Bán tại quầy (POS), bán trực tuyến
├── thanh-toan/              # Phương thức thanh toán, giao dịch, hoàn tiền
├── cong-no/                 # Các khoản phải thu, phải trả và đối soát
├── tien-coc/                # Thu, giữ và hoàn tiền cọc
│
├── dat-truoc/               # Đặt trước sách và xử lý khi có sách
├── muon-tra/                # Mượn, thuê, giao sách và trả từng cuốn
├── gia-han/                 # Gia hạn thời gian mượn/thuê
├── phi-phat/                # Phí quá hạn, mất hoặc hư hỏng sách
│
├── thong-bao/               # Thông báo trong hệ thống, email và trạng thái đã đọc
├── bao-cao/                 # Báo cáo bán hàng, tồn kho, mượn/trả, doanh thu
└── ai/                      # Tích hợp AI: gợi ý sách, tìm kiếm và trợ lý nội bộ

backend/src/common/
├── middlewares/             # authenticate/authorize/tenant-scope/branch-scope
├── errors/                  # AppError và xử lý lỗi chung
├── security/                # Token, mật khẩu và tiện ích bảo mật
└── utils/                   # Hàm dùng chung, định dạng và chuẩn hóa dữ liệu

backend/src/integrations/
├── email-client.js          # Gửi email qua SMTP
├── email-template.js        # Template email và OTP
├── redis.js                 # Kết nối Redis
└── storage.js               # Kết nối dịch vụ lưu trữ file

backend/src/services/
└── ready.service.js         # Kiểm tra trạng thái các dịch vụ phụ thuộc
```

```text
ai-service/
├── pyproject.toml
├── Dockerfile
├── .env.example
├── README.md
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── dependencies.py
│   │   ├── exceptions.py
│   │   ├── logging.py
│   │   └── rate_limit.py
│   │
│   ├── api/
│   │   ├── health.py
│   │   └── internal/
│   │       ├── jobs.py
│   │       ├── search.py
│   │       ├── recommendations.py
│   │       ├── chat.py
│   │       ├── sources.py
│   │       └── feedback.py
│   │
│   ├── schemas/
│   │   ├── common.py
│   │   ├── jobs.py
│   │   ├── search.py
│   │   ├── recommendations.py
│   │   ├── chat.py
│   │   └── sources.py
│   │
│   ├── integrations/
│   │   ├── postgres.py
│   │   ├── redis.py
│   │   ├── storage.py
│   │   └── backend_client.py
│   │
│   ├── providers/
│   │   ├── base.py
│   │   ├── llm.py
│   │   └── embeddings.py
│   │
│   ├── services/
│   │   ├── indexing/
│   │   │   ├── book_indexer.py
│   │   │   ├── document_indexer.py
│   │   │   └── chunking.py
│   │   │
│   │   ├── retrieval/
│   │   │   ├── hybrid_search.py
│   │   │   ├── vector_search.py
│   │   │   ├── access_filter.py
│   │   │   └── citations.py
│   │   │
│   │   ├── recommendations/
│   │   │   ├── candidate_generator.py
│   │   │   ├── ranking.py
│   │   │   └── explanations.py
│   │   │
│   │   ├── assistant/
│   │   │   ├── chat.py
│   │   │   ├── context_builder.py
│   │   │   ├── tool_registry.py
│   │   │   └── response_validator.py
│   │   │
│   │   ├── extraction/
│   │   │   ├── metadata.py
│   │   │   ├── ocr.py
│   │   │   └── classification.py
│   │   │
│   │   └── analytics/
│   │       ├── report_analysis.py
│   │       └── usage_tracking.py
│   │
│   ├── repositories/
│   │   ├── sources.py
│   │   ├── chunks.py
│   │   ├── conversations.py
│   │   ├── recommendations.py
│   │   ├── jobs.py
│   │   └── feedback.py
│   │
│   ├── queue/
│   │   ├── connection.py
│   │   ├── dispatcher.py
│   │   └── retry.py
│   │
│   ├── workers/
│   │   ├── runner.py
│   │   ├── index_book.py
│   │   ├── index_document.py
│   │   ├── generate_recommendations.py
│   │   ├── extract_metadata.py
│   │   └── cleanup_indexes.py
│   │
│   └── prompts/
│       ├── book_advisor.py
│       ├── internal_assistant.py
│       └── report_assistant.py
```

**Cây AI ở F05 là cấu trúc dự kiến, không phải yêu cầu triển khai Python trong F05. Toàn bộ code `ai-service/` chỉ thực hiện ở F17 sau khi BE hoàn tất.** Khi triển khai F17 mới tạo `ai-service/tests/{unit,integration,evaluations}/` và chỉ thêm file có test thực.

**Hàm cần triển khai trong service:** `taoTaiKhoan`, `dangNhap`, `lamMoiPhien` hoặc luồng phiên tương đương, `dangXuat`, `kiemTraQuyen`, `layPhamViDuLieu`, `kiemTraChiNhanh`. Hash mật khẩu bằng thư viện phù hợp; phiên/cookie có cấu hình bảo mật. `don_vi_id` và `chi_nhanh_id` phải được suy ra từ phiên/quyền đã xác minh, **không tin ID tùy ý trong request của client**.

**Test:** đăng nhập đúng/sai; giới hạn thử sai; tài khoản A không truy cập đơn vị B; chi nhánh A không thao tác chi nhánh B; ẩn nút FE không thay thế xác thực BE; quyền thay đổi có hiệu lực theo quy tắc phiên.

**Kết thúc F05:** có API thật để FE đăng nhập/lấy quyền và test tenant isolation đạt.

---

## F06 — Viết Frontend đầu tiên render HTML và gọi được backend

**Phụ thuộc:** F01, F04; trang yêu cầu đăng nhập cần F05. **Thứ tự:** `package.json → config/handlebars.js → app.js → server.js → layout → page → route/controller → backend-client → test`.

**FILE:** `frontend/package.json` — **TẠO MỚI**; `npm install express express-handlebars` sau khi khai báo scripts:

```json
{
  "name": "bookflow-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test tests/*.test.js"
  }
}
```

**FILE:** `frontend/src/config/handlebars.js` — **TẠO MỚI**, cấu hình layout và partials theo `views/`; không nhúng kết nối PostgreSQL vào helpers.

**FILE:** `frontend/src/app.js` — **TẠO MỚI**, khởi tạo Express, đăng ký Handlebars, static `public/`, route `/` và error page.

**FILE:** `frontend/src/server.js` — **TẠO MỚI**, đọc `PORT` và gọi `listen` sau khi app được cấu hình.

**FILE:** `frontend/src/views/layouts/main.hbs` — **TẠO MỚI**, chứa HTML shell và `{{{body}}}`; **FILE:** `frontend/src/views/pages/public/trang-chu.hbs` chứa HTML trang công khai.

**FILE:** `frontend/src/routes/public.route.js` → gọi **`controllers/public/trang-chu.controller.js`** → controller lấy dữ liệu thông qua `services/backend-client.js` rồi render. Giai đoạn đầu có thể render một trang tĩnh nhưng vẫn phải dùng route/controller thật; sau F10 nối dữ liệu sách từ API.

**Test:** `GET /` trả `200` và HTML chứa tiêu đề BookFlow; static CSS tải được; trang công khai không ép đăng nhập; lỗi backend hiển thị trạng thái lỗi chứ không làm sập frontend.

**Kết thúc F06:** hai tiến trình FE/BE chạy độc lập; browser truy cập FE, FE gọi được API BE bằng cấu hình môi trường.

---

## F07 — Viết bộ icon/logo SVG tự thiết kế và code đóng gói

**Phụ thuộc:** F06. **Thứ tự:** `docs/frontend/quy-chuan-icon.md → assets/icons/*.svg + assets/brand/*.svg → scripts/build-icons.mjs → views/partials/ui/icon.hbs → public/css/components/icon.css → test`.

**`build-icons.mjs` phải có các hàm:** `quetTepSvg`, `kiemTraTenIcon`, `kiemTraSvg`, `taoSprite`; validate SVG, từ chối icon trùng tên, không chấp nhận script/event handler/URL ngoài trong SVG, dùng `viewBox` và `currentColor`. Output là `frontend/src/public/icons/bookflow-icons.svg`. Không build đè lên SVG nguồn.

**`icon.hbs`:** nhận tên icon từ registry hợp lệ, size và nhãn truy cập khi icon mang nghĩa; icon chỉ trang trí dùng `aria-hidden="true"`. Tất cả màn hình gọi partial này, không chép SVG vào từng nút.

**Test:** build hai lần cho kết quả ổn định; SVG sai bị từ chối; icon hiển thị đúng kích cỡ/màu trong FE; logo/favicon không cần tải từ CDN.

---

## F08 — Viết thư viện form, bảng, modal, CSS/JS dùng chung

**Phụ thuộc:** F06–F07. Chỉ xây component thực tế cần dùng cho form sách đầu tiên; mở rộng từng field khi nghiệp vụ cần.

```text
frontend/src/views/partials/forms/truong-van-ban.hbs
frontend/src/views/partials/forms/truong-tien.hbs
frontend/src/views/partials/forms/loi-truong.hbs
frontend/src/views/partials/forms/nut-bieu-mau.hbs
frontend/src/views/partials/modals/hop-thoai-xac-nhan.hbs
frontend/src/views/partials/tables/phan-trang.hbs
frontend/src/public/js/core/goi-api.js
frontend/src/public/js/core/xu-ly-bieu-mau.js
frontend/src/public/js/core/kiem-tra-bieu-mau.js
frontend/src/public/js/core/hop-thoai.js
frontend/src/public/js/utils/dinh-dang-tien.js
frontend/src/public/css/components/bieu-mau.css
```

**Hàm cần viết:** `goiApi(url, options)` chuẩn hóa credentials, JSON, lỗi và request ID; `xuLyBieuMau(form, { chuanBiDuLieu, gui, khiThanhCong })` chỉ quản lý submit/loading/lỗi; `hienThiLoiTruong`; `hienHopThoaiXacNhan`; `dinhDangTien` và `docSoTien` không mất dữ liệu tiền tệ.

**Không làm:** viết một form động khổng lồ chứa quy tắc của mọi module; frontend tự quyết định hợp lệ nghiệp vụ thay backend; cho HTML tin cậy từ dữ liệu người dùng đi vào `{{{...}}}`.

**Test:** form tạo/sửa cùng dùng một partial; một lỗi API gắn đúng field; submit hai lần không sinh request lặp ngoài ý muốn; keyboard/focus hoạt động; tiền `18.800` và giá trị API không bị sai do parse theo locale.

---

## F09 — Code module file chung trước ảnh sách

**Phụ thuộc:** F02–F05. **Thứ tự file:**

```text
backend/src/integrations/storage-client.js
backend/src/modules/tep/tep.validation.js
backend/src/modules/tep/tep.repository.js
backend/src/modules/tep/tep.service.js
backend/src/modules/tep/tep.permission.js
backend/src/modules/tep/tep.controller.js
backend/src/modules/tep/tep.route.js
backend/src/modules/tep/tests/tep.service.test.js
```

**Hàm trong `tep.service.js`:** `taoYeuCauTaiLen`, `kiemTraTepTaiLen`, `luuMetadata`, `xacNhanTep`, `taoUrlXemTep`, `xoaTepKhiKhongConThamChieu` theo chính sách; xử lý MIME thật, kích thước, checksum, tên object ngẫu nhiên và kiểm tra quyền. Quy định trạng thái file tạm/đã kiểm tra/đã gắn.

**Luồng:** FE chọn tệp → BE xác thực/quyền → MinIO lưu object → kiểm tra nội dung và metadata `tep_dinh_kem` → liên kết vào bản ghi nghiệp vụ → URL công khai hoặc URL có thời hạn sau kiểm tra quyền.

**Test:** file sai MIME/quá dung lượng bị chặn; người đơn vị khác không xem file private; upload thất bại không tạo metadata “thành công”; retry không tạo liên kết sai; file được xóa theo chính sách khi không còn tham chiếu.

---

## F10 — Code một lát cắt danh mục sách từ database đến giao diện

**Phụ thuộc:** F03–F09. **Làm đủ một lát cắt “tạo và xem đầu sách” trước khi thêm toàn bộ danh mục.**

```text
A. database/migrations/<so>_danh-muc-sach.sql
       ↓
B. contracts/openapi/bookflow-api.yaml + schemas/sach.schema.json
       ↓
C. backend/src/modules/sach/sach.validation.js
       ↓
D. backend/src/modules/sach/sach.repository.js
       ↓
E. backend/src/modules/sach/sach.service.js
       ↓
F. backend/src/modules/sach/sach.permission.js
       ↓
G. backend/src/modules/sach/sach.controller.js
       ↓
H. backend/src/modules/sach/sach.route.js → routes/index.js
       ↓
I. backend/src/modules/sach/tests/*.test.js
       ↓
J. frontend/src/public/js/services/sach.api.js
       ↓
K. frontend/src/views/pages/staff/sach/partials/bieu-mau-sach.hbs
       ↓
L. frontend/src/views/pages/staff/sach/them-sach.hbs
       ↓
M. frontend/src/public/js/modules/sach/bieu-mau-sach.js
       ↓
N. trang danh sách + chi tiết + sửa + integration/E2E
```

**Hàm và trách nhiệm:** repository `taoDauSach(client, duLieu)`, `layDauSachTheoId(client, id, donViId)`, `timDauSach(client, boLoc)` chỉ truy vấn có tham số; service `taoDauSach(nguoiDung, duLieu)`, `suaDauSach`, `layChiTietDauSach` điều phối transaction, quyền, ISBN/trùng theo quy định; controller chuyển request/response; route gắn middleware và validation. Không đặt SQL trong controller.

**Ảnh sách:** `dau_sach.anh_bia_chinh_id` trỏ metadata file; `tep_sach` lưu các liên kết ảnh/tệp theo đầu sách/phiên bản, loại và thứ tự. Giới hạn số ảnh là quy tắc nghiệp vụ cần chốt và kiểm tra ở service, không mặc định database đã giới hạn.

**Test:** tạo/sửa/xem thành công; sai input; ISBN trùng theo chính sách; tenant B không thấy sách tenant A; rollback khi liên kết ảnh lỗi; form sửa giữ dữ liệu cũ khi API báo lỗi. Chỉ sau khi luồng đầu sách đạt mới mở rộng tác giả, thể loại, phiên bản và hình thức bán/mượn/thuê.

---

## F11 — Code kho và nhà cung cấp có transaction/concurrency

**Phụ thuộc:** F10. **Nhánh code:** `nha-cung-cap` → phiếu nhập → lô nhập → `kho` → biến động → tồn bán → bản sao sách → chuyển kho.

**Trong `backend/src/modules/kho/`:** service thực hiện `nhanHang`, `giuTonBan`, `giaiPhongTon`, `xuatTon`, `taoBanSaoSach`, `capNhatTrangThaiBanSao`; repository khóa dòng/cập nhật điều kiện trong transaction, có unique/index phù hợp. Không cộng trừ tồn ở controller, không cấp cùng một bản sao cho hai phiếu.

**Test bắt buộc:** hai request mua cuốn cuối; nhận phiếu nhập hai lần; giao dịch fail giữa chừng phải rollback; chuyển kho ghi biến động đầy đủ; tồn bán không âm; bản sao có trạng thái hợp lệ. FE chỉ hiển thị/tạo yêu cầu, không tự quyết định tồn.

---

## F12 — Code khách hàng, hội viên và chính sách

**Phụ thuộc:** F05 và F10, phối hợp F13 khi bắt đầu bán gói. **Viết theo thứ tự:** migration → `khach-hang` repository/service/API → form FE → `hoi-vien` gói/quyền lợi → snapshot áp dụng → test.

**Hàm nghiệp vụ:** `taoKhachHang`, `timKhachHang`, `dangKyGoi`, `kiemTraQuyenLoi`, `suDungQuyenLoi`, `giaHanGoi`. Hồ sơ khách hàng không bắt buộc có tài khoản đăng nhập web. Quyền lợi đã áp dụng trong chứng từ phải lưu snapshot, không tính lại theo gói mới.

**Test:** quá hạn gói, vượt lượt, hai giao dịch đồng thời dùng lượt cuối, khách khác đơn vị, thay chính sách sau khi có phiếu, retry không trừ hai lần.

---

## F13 — Code tài chính chung trước checkout và thuê sách

**Phụ thuộc:** F03/F05, các bảng tài chính đã được chốt. **File module `backend/src/modules/thanh-toan/` theo thứ tự:** `*.validation.js → *.repository.js → *.service.js → *.permission.js → *.controller.js → *.route.js → tests`.

**Hàm nghiệp vụ:** `taoKhoanPhaiThu`, `taoYeuCauThanhToan`, `ghiNhanKetQuaThanhToan`, `giuTienCoc`, `hoanTienCoc`, `taoYeuCauHoanTien`, `doiSoatGiaoDich`; mọi callback xác minh nguồn và xử lý idempotency. Lưu số tiền bằng decimal/NUMERIC, không tính tiền bằng số thực thiếu kiểm soát. Tiền cọc tách khỏi doanh thu.

**Test:** callback lặp không thu hai lần, hoàn một phần, hoàn trùng, request cùng idempotency key, sai số tiền, rollback giao dịch, chéo tenant. Bán hàng và mượn/thuê **gọi service tài chính này**, không viết logic thu tiền riêng.

---

## F14 — Code giỏ hàng, bán tại quầy và bán online

**Phụ thuộc:** F10–F13. **Lát cắt:** tạo giỏ → kiểm tồn và giá thực tế → snapshot đơn → giữ hàng → tạo khoản phải thu → thanh toán → xuất/giao → hóa đơn/chứng từ → đổi trả.

**Module:** `backend/src/modules/gio-hang/`, `backend/src/modules/ban-hang/`; FE `pages/customer/gio-hang.hbs`, `thanh-toan.hbs` và `pages/staff/ban-hang/ban-hang-tai-quay.hbs` sử dụng API client chung.

**Hàm:** `themVaoGio`, `tinhLaiDon`, `taoDonBan`, `xacNhanDon`, `hoanTatDon`, `traHang`; controller chỉ nhận request và trả kết quả. Đơn tạo phải ghi snapshot giá/thuế/giảm giá theo quy định và giữ tồn trong transaction.

**Test:** hai người mua tồn cuối cùng, thanh toán thất bại, callback lặp, hủy đơn giải phóng tồn, POS khách vãng lai, trả một phần, hoàn tiền một phần.

---

## F15 — Code mượn miễn phí, thuê có phí, trả và gia hạn

**Phụ thuộc:** F10–F13. **Thứ tự:** chính sách → đặt trước/giữ bản sao → tạo phiếu → bàn giao → trả từng cuốn → gia hạn → quá hạn/hư hỏng/cọc.

**Module:** `backend/src/modules/muon-tra/`; FE `pages/customer/yeu-cau-muon.hbs`, `pages/staff/muon-tra/tao-phieu-muon.hbs`, `nhan-tra-sach.hbs`; dùng lại `kho` và `thanh-toan` service, không sửa trực tiếp trạng thái kho/tiền từ controller.

**Hàm:** `taoYeuCauMuon`, `giuBanSao`, `banGiaoSach`, `traMotCuon`, `giaHan`, `tinhPhiPhatSinh`, `dongPhieuKhiDuDieuKien`. Mỗi dòng phiếu phải gắn một bản sao cụ thể; trả một phần không đóng cả phiếu.

**Test:** mượn miễn phí, thuê có phí, nhiều cuốn trả một phần, cùng bản sao bị quét đồng thời, gia hạn khi có đặt trước, quá hạn, cọc và ảnh minh chứng private.

---

## F16 — Code BullMQ worker, thông báo và hoàn thiện báo cáo BE

**Phụ thuộc:** F04, F05 và sự kiện từ F13–F15. **Thứ tự file:** `integrations/redis-client.js → jobs/queues/ → jobs/processors/ → worker.js → tests`; hoàn thiện `backend/src/modules/bao-cao/` theo thứ tự `validation → repository → service → controller → routes → tests` trước khi chuyển sang F17.

**Hàm:** `xepThongBao`, `guiThongBao`, `nhacHanMuon`, `ghiNhanKetQuaGui`, `taoBaoCaoCoBan`; bổ sung API báo cáo BE trả dữ liệu bán hàng, doanh thu, tồn kho, mượn/trả và công nợ/cọc theo dữ liệu đã đối soát. Job chứa ID nghiệp vụ, không gửi cả dữ liệu nhạy cảm vào Redis; retry/backoff có giới hạn, job id chống trùng theo nghiệp vụ. `backend-worker` khởi chạy bằng image backend nhưng command `node src/worker.js`.

**Test:** retry không nhân đôi thông báo/giao dịch, worker dừng không làm mất sự kiện gốc, báo cáo có phạm vi tenant/branch và đối soát đúng tiền cọc/hoàn; API báo cáo và test BE phải hoàn thành trước F17. Giao diện báo cáo mở rộng ở F18, nhưng nguồn số liệu BE không được để đến sau AI.

---

## F17 — Triển khai BookFlow AI sau khi hoàn thiện backend

**Thời điểm thực hiện:** chỉ bắt đầu F17 khi những phân hệ BE mà AI sử dụng đã có repository/service/API thật, phân quyền, contract và test. Trong giai đoạn đang viết BE, **chỉ giữ cấu trúc và quy trình này làm kế hoạch; chưa đánh dấu AI hoàn thành, chưa tạo hàng loạt file Python rỗng và chưa cho AI xử lý nghiệp vụ thay BE**. Cây `ai-service/` chuẩn nằm trong F05; F17 dưới đây là thứ tự **viết code, đăng ký, kết nối, chạy và kiểm thử** trên chính cây đó.

**Phụ thuộc bắt buộc:** F01–F05, F09–F16; các phần `sach`, `phien-ban-sach`, `tep-tin`, `ton-kho`, `khach-hang`, `gio-hang`, `don-hang`, `ban-hang`, `thanh-toan`, `cong-no`, `tien-coc`, `dat-truoc`, `muon-tra`, `gia-han`, `phi-phat`, `thong-bao` và `bao-cao` mà AI sẽ đọc đã hoàn thiện ở BE. Chức năng AI nào chưa có API nghiệp vụ tương ứng phải để trạng thái **chưa triển khai**, không dùng dữ liệu giả rồi công bố hoàn thành. AI báo cáo chỉ viết sau khi `backend/src/modules/bao-cao/` đã trả số liệu được đối soát.

**Ranh giới bắt buộc:** frontend chỉ gọi Express; Express xác thực người dùng, suy ra đơn vị/chi nhánh từ quyền đã xác minh và quyết định nghiệp vụ; FastAPI chỉ xử lý AI trên dữ liệu được phép. AI API và AI Worker dùng Python/RQ, không tiêu thụ trực tiếp job BullMQ của backend. PostgreSQL là nguồn dữ liệu bền vững; Redis là hàng đợi/cache, MinIO là nơi lưu file. AI không trực tiếp ghi bảng đơn hàng, tồn kho, tiền, cọc hoặc quyền và không chạy SQL tự do do mô hình sinh ra.

### F17.0. Chốt điều kiện bàn giao từ BE sang AI

**FILE phải kiểm tra:** `contracts/openapi/bookflow-api.yaml`, `contracts/openapi/ai-noi-bo-api.yaml`, `database/migrations/`, `backend/src/modules/`, `backend/src/common/`, `backend/src/integrations/`, `backend/src/routes/index.js` và bộ test BE. **THAO TÁC:** đối chiếu code đang chạy với contract, không thay toàn bộ BE để phục vụ AI.

1. Xác nhận tất cả ID nghiệp vụ dùng đúng kiểu đã migrate (đặc biệt `don_vi_id`, `chi_nhanh_id`, `dau_sach_id`, `phien_ban_sach_id`); thống nhất JSON `camelCase` hay `snake_case` cho từng ranh giới và viết chuyển đổi tại client nếu cần. Python dùng `snake_case` nội bộ nhưng không được tự suy đoán tên trường JSON của BE.
2. Liệt kê các API BE chỉ đọc cần cho AI: tìm sách/phiên bản, trạng thái kinh doanh, giá hiện hành, tồn và khả năng cho mượn theo chi nhánh, hồ sơ và đơn của chính người dùng, báo cáo theo quyền. Không để Python truy vấn bảng nghiệp vụ thay cho service BE khi nghiệp vụ cần kiểm tra quyền/trạng thái hiện hành.
3. Chốt quyền AI công khai, AI người dùng và AI nội bộ; kiểm tra quyền truy cập nguồn tài liệu, quyền dùng lịch sử để cá nhân hóa, thời hạn lưu hội thoại và chính sách xóa dữ liệu. Không lấy `don_vi_id`/`chi_nhanh_id` tùy ý từ request của frontend.
4. Chốt giới hạn nhà cung cấp AI: mô hình ngôn ngữ, mô hình embedding, kích thước vector, timeout, số lần retry, ngân sách/giới hạn sử dụng và trường dữ liệu được phép gửi ra ngoài. Các thông số này đi vào cấu hình, không hard-code trong service.
5. Chốt sự kiện đồng bộ: sách/phiên bản/tài liệu được tạo, sửa, ẩn, chuyển quyền hoặc xóa; BE ghi sự kiện bền vững trong giao dịch nghiệp vụ, backend-worker đẩy yêu cầu lập chỉ mục/xóa chỉ mục qua AI client. Worker AI có thể chạy lại an toàn.

**Kết quả mong đợi:** có danh sách API, quyền, bảng/migration và luồng sự kiện được đối chiếu với code BE; mọi chức năng AI đều có nguồn dữ liệu thật và chủ sở hữu nghiệp vụ rõ ràng. **Lỗi phải thử:** khác tenant/chi nhánh, quyền vừa bị thu hồi, sách vừa ngừng kinh doanh, BE trả lỗi hoặc timeout, dữ liệu thiếu nguồn.

### F17.1. Hoàn thiện hợp đồng nội bộ và migration AI trước khi viết service

**FILE — THAO TÁC:** `contracts/openapi/ai-noi-bo-api.yaml` — **THAY/HOÀN THIỆN** các schema/endpoint AI đã có; `contracts/openapi/bookflow-api.yaml` — **THÊM** API FE → BE khi thực hiện từng tính năng; `database/migrations/<so_tiep_theo>_hoan-thien-ai.sql` — **TẠO MỚI** migration tiếp theo chưa sử dụng, không tự sửa migration đã chạy trong môi trường có dữ liệu.

- Contract nội bộ phải mô tả `health/ready`, tạo/lấy trạng thái job, đồng bộ/thu hồi nguồn, tìm kiếm, gợi ý, hội thoại và phản hồi; mỗi endpoint có request ID, schema dữ liệu, timeout, lỗi, phiên bản API và yêu cầu xác thực dịch vụ. URL chính xác được chốt **một lần** trong OpenAPI rồi BE/Python cùng triển khai, không để hai phía tự đặt route.
- Bảng AI hiện có cần được đối chiếu thực tế với migration. Nếu chỉ lưu `ma_vector` thì bổ sung nơi lưu embedding pgvector hoặc bảng embedding riêng, `model`, `model_version`, `embedding_dimensions`, `source_version`, checksum, `don_vi_id`, phạm vi truy cập và trạng thái nguồn. Kích thước `vector(n)` và index phải khớp mô hình embedding đã chọn; không mặc định mọi nhà cung cấp dùng cùng kích thước.
- Bổ sung lưu job bền vững: ID, loại, đơn vị, nguồn, idempotency key, trạng thái `queued/running/succeeded/failed/cancelled`, số lần chạy, lỗi có kiểm soát, thời gian tạo/cập nhật. Redis/RQ giữ dữ liệu thực thi, PostgreSQL giữ trạng thái kiểm tra và xử lý lại; không ghi toàn bộ nội dung nhạy cảm vào payload queue.
- Ràng buộc ID/khóa ngoại và phạm vi đơn vị phải thống nhất với bảng BE. Thêm index cho tìm kiếm nguồn/đoạn theo tenant, phiên bản và trạng thái; có phương án xóa vector khi nguồn bị xóa hoặc thu hồi quyền.
- Migration chạy bằng runner F03; kiểm tra trên DB sạch, DB đã có migration trước đó, chạy lại và rollback khi SQL lỗi. Nếu một chức năng cần bảng mới, thêm migration trước khi viết repository tương ứng.

**Kết quả mong đợi:** hợp đồng AI parse được, migration có lịch sử và chạy lại an toàn, dữ liệu AI có thể truy xuất theo tenant/quyền; không có kiểu ID lệch BE và không có job mất lịch sử khi Redis khởi động lại.

### F17.2. Viết nền FastAPI và tích hợp hạ tầng theo đúng cây đã chốt

**Thứ tự FILE → chức năng → nơi gọi:**

| Thứ tự | FILE | CODE/hàm chính và kết nối |
|---|---|---|
| 1 | `ai-service/pyproject.toml` | Khai báo Python và dependency thực dùng: FastAPI/Uvicorn, Pydantic Settings, driver PostgreSQL + pgvector, Redis/RQ, HTTP client và dependency test; chỉ cài OCR/đọc PDF khi làm F17.8. Khai báo nhóm `dev` cho test/lint. |
| 2 | `ai-service/.env.example` | Chỉ lưu **tên biến và giá trị mẫu không phải secret**: database, Redis, backend internal URL, token dịch vụ, cấu hình mô hình, dimension, timeout, giới hạn request; `.env` thật không commit. |
| 3 | `ai-service/app/core/config.py` | Đọc/validate môi trường, từ chối cấu hình thiếu hoặc dimension không hợp lệ; che secret trong log. |
| 4 | `app/core/exceptions.py`, `logging.py` | Chuẩn hóa mã lỗi, HTTP status, request ID, structured log; không log mật khẩu, token, prompt nhạy cảm hoặc nội dung file private. |
| 5 | `app/core/security.py`, `dependencies.py`, `rate_limit.py` | Kiểm tra danh tính dịch vụ BE, ngữ cảnh truy cập đã ký/xác minh, quyền của endpoint, hạn mức theo đơn vị/tác vụ; từ chối request sai chữ ký/hết hạn. Không dùng header tenant tùy ý làm bằng chứng quyền. |
| 6 | `app/schemas/common.py`, `jobs.py`, `search.py`, `recommendations.py`, `chat.py`, `sources.py` | Pydantic request/response theo OpenAPI, kiểu ID, giới hạn độ dài, pagination, trạng thái job và cấu trúc trích dẫn. Schema phản hồi chưa có file riêng được khai báo có chủ đích tại `common.py` hoặc thêm file khi thực sự cần. |
| 7 | `app/integrations/postgres.py`, `redis.py`, `storage.py`, `backend_client.py` | Pool/transaction truy cập **bảng AI**, kết nối RQ, lấy tệp được cấp quyền qua storage, gọi API BE chỉ đọc bằng thông tin dịch vụ đã cấu hình; đóng kết nối đúng vòng đời. |
| 8 | `app/api/health.py`, `app/main.py` | Khởi tạo FastAPI, đăng ký exception handler và router, `GET /health` cho liveness; `/ready` chỉ báo sẵn sàng khi thành phần thiết yếu chạy. Không gọi LLM cho health. |
| 9 | `ai-service/README.md` | Ghi yêu cầu môi trường, đường dẫn contract, quy trình migrate, lệnh chạy API/worker/test, biến cấu hình, giới hạn quyền và xử lý sự cố. |

**Kết nối:** `main.py` đăng ký router công khai cho health và router `api/internal/` có dependency xác thực dịch vụ; `backend_client.py` chỉ gọi endpoint BE đã chốt; AI API không được frontend gọi trực tiếp. **Test:** API sống nhưng DB lỗi thì `/health` vẫn phản ánh liveness, `/ready` phản ánh dependency; sai token nhận `401/403` theo contract; log không chứa secret; connection được đóng khi dừng ứng dụng.

### F17.3. Viết lớp mô hình AI có thể thay nhà cung cấp

**FILE theo thứ tự:** `app/providers/base.py → embeddings.py → llm.py`. `base.py` định nghĩa giao diện tạo embedding và sinh phản hồi/structured output; `embeddings.py` bảo đảm dimension/model/version nhất quán giữa lúc lập chỉ mục và lúc tìm; `llm.py` chịu trách nhiệm timeout, giới hạn token, xử lý rate limit, retry có giới hạn và chuẩn hóa lỗi. Khi đổi nhà cung cấp hoặc dùng mô hình nội bộ, `services/` không phải thay thuật toán chính.

**Phụ thuộc:** F17.1–F17.2. **Kết nối:** nhận cấu hình từ `core/config.py`, được gọi bởi indexing, retrieval, explanations, assistant và extraction. **Test:** giả lập provider bằng fake/mock; sai dimension bị chặn; timeout không treo request BE; retry không gửi lặp tác vụ có tác dụng phụ; không đưa tài liệu private sang mô hình bên ngoài khi chính sách không cho phép.

### F17.4. Viết queue, repository và luồng đồng bộ nguồn trước khi bật tìm kiếm

**Thứ tự FILE:** `app/repositories/jobs.py → sources.py → chunks.py → app/queue/connection.py → dispatcher.py → retry.py → app/api/internal/jobs.py → sources.py → app/workers/runner.py → index_book.py → index_document.py → cleanup_indexes.py → app/services/indexing/chunking.py → book_indexer.py → document_indexer.py`.

**Luồng bắt buộc:**

```text
BE sach/tep-tin/phan-quyen thay đổi dữ liệu hoặc quyền
  → BE transaction lưu dữ liệu + sự kiện đồng bộ bền vững
  → backend-worker đọc sự kiện, gọi backend/src/integrations/ai-client.js
  → FastAPI xác thực dịch vụ, kiểm tra scope và idempotency key
  → repositories/jobs.py lưu job → queue/dispatcher.py đưa ID vào RQ
  → workers/runner.py nhận job → workers/index_book.py hoặc index_document.py
  → lấy snapshot/metadata nguồn đã cấp quyền từ BE/storage
  → chunking.py chuẩn hóa/chia đoạn → providers/embeddings.py tạo vector
  → repositories/sources.py + chunks.py cập nhật theo source_version
  → repositories/jobs.py ghi succeeded/failed và thông tin kiểm tra
```

**Quy tắc code:** job chỉ mang ID nguồn, đơn vị và version đã xác minh; cập nhật index bằng upsert theo khóa duy nhất nguồn/phiên bản/đoạn, không tạo đoạn trùng khi retry; bỏ qua job cũ hơn version hiện tại; khi xóa, ẩn hoặc thu hồi quyền, phải xóa/khóa truy xuất index và cache liên quan. Các thao tác lưu vector theo tenant và trạng thái nguồn, không tạo vector từ văn bản không có quyền xử lý. `cleanup_indexes.py` dọn chỉ mục mồ côi và dữ liệu hết hạn theo chính sách, không tự xóa tệp gốc của BE.

**Test:** enqueue hai lần một sự kiện không tạo hai bộ vector; worker lỗi giữa chừng có thể retry; dữ liệu đang đổi không bị job cũ ghi đè; thu hồi quyền có hiệu lực cả trên vector và cache; Redis lỗi không làm mất sự kiện gốc; AI Worker không lấy BullMQ job.

### F17.5. Chức năng 1 — Tìm kiếm sách thông minh

**FILE:** `app/services/retrieval/vector_search.py → access_filter.py → hybrid_search.py → citations.py → app/api/internal/search.py`; dùng lại `schemas/search.py`, `repositories/chunks.py`, `providers/embeddings.py` và `integrations/backend_client.py`.

**Quy trình:** FE gửi câu hỏi/bộ lọc → BE xác định đơn vị và quyền xem sách → AI phân tích câu hỏi → tìm full-text/ISBN/tác giả/thể loại và vector theo cùng tenant → kết hợp/xếp hạng → lọc nguồn/quyền ở tầng truy vấn và kiểm tra lại trước khi trả → BE lấy giá, phiên bản đang bán, tồn và khả năng mượn hiện hành → FE hiển thị sách, lý do gợi ý và link chi tiết. Không dùng embedding làm nguồn giá/tồn. Khi AI timeout, BE dùng tìm kiếm thường bằng PostgreSQL nếu chức năng này đã có.

**Test:** câu hỏi tự nhiên, ISBN chính xác, không có kết quả, từ khóa tiếng Việt, sai tenant, file private, chi nhánh khác, sách ngừng bán, giá/tồn đổi trong lúc tìm. **Xong khi:** kết quả chỉ chứa sách được phép xem, chỉ trích dẫn nguồn tồn tại và dữ liệu động được BE xác minh.

### F17.6. Chức năng 2 — Gợi ý sách

**FILE:** `app/services/recommendations/candidate_generator.py → ranking.py → explanations.py → app/repositories/recommendations.py → app/workers/generate_recommendations.py → app/api/internal/recommendations.py`; dùng `schemas/recommendations.py`.

**Quy trình:** chọn ngữ cảnh (sách đang xem, thể loại, giỏ hàng hoặc lịch sử được phép sử dụng) → lấy ứng viên theo nội dung/quan hệ/embedding → loại sách không được xem, không phù hợp hình thức mua/mượn hoặc đã ngừng kinh doanh → xếp hạng có thể giải thích → BE xác nhận trạng thái thực tế → trả danh sách. Khách ẩn danh dùng dữ liệu công khai/ngữ cảnh phiên; cá nhân hóa chỉ sử dụng dữ liệu theo chính sách và quyền tương ứng. Không gọi LLM cho mọi lượt nếu ranking bằng dữ liệu đã đủ; `explanations.py` chỉ giải thích theo bằng chứng có thật.

**Test:** người chưa đăng nhập, người có/không có lịch sử, sách hết hàng, nhiều phiên bản, tenant khác, xóa lịch sử, kết quả trống và retry job tạo gợi ý. AI chỉ gợi ý, không tự thêm giỏ/đặt trước/thanh toán.

### F17.7. Chức năng 3 và 4 — Chatbot tư vấn khách hàng và trợ lý nội bộ

**FILE theo thứ tự:** `app/prompts/book_advisor.py`, `internal_assistant.py` → `app/services/assistant/tool_registry.py → context_builder.py → response_validator.py → chat.py` → `app/repositories/conversations.py → app/api/internal/chat.py`; dùng `schemas/chat.py`, `services/retrieval/` và `integrations/backend_client.py`.

**Quy trình chat khách:** BE xác định người dùng/phiên và phạm vi công khai → tải ngữ cảnh hội thoại còn hiệu lực → lấy thông tin sách được phép xem → khi hỏi giá/tồn/đơn cá nhân thì gọi công cụ BE phù hợp (đơn cá nhân bắt buộc xác thực/chủ sở hữu) → LLM trả câu trả lời → `response_validator.py` kiểm chứng format, nguồn và phạm vi → lưu hội thoại theo chính sách → BE trả FE. Trợ lý phải thông báo khi không có nguồn xác minh, không tự tạo ISBN, giá hay trạng thái đơn.

**Quy trình trợ lý nội bộ:** BE xác thực nhân viên/admin, quyền chức năng và phạm vi chi nhánh → `tool_registry.py` chỉ cho gọi các công cụ chỉ đọc đã đăng ký như tìm sách, xem tồn, xem đơn có quyền và báo cáo → mỗi tool gọi service BE kiểm tra quyền một lần nữa → AI tổng hợp câu trả lời kèm nguồn/số liệu. Không thực thi SQL do LLM tạo; prompt/tài liệu từ nguồn truy xuất là dữ liệu không đáng tin, không được phép thay đổi system instruction hoặc gọi tool vượt quyền. Chức năng ghi nghiệp vụ trong tương lai phải có API BE và bước xác nhận riêng, **không nằm trong F17**.

**Test:** hội thoại nhiều lượt, tài khoản khác không xem hội thoại, yêu cầu vượt chi nhánh, prompt injection trong tài liệu, tool bị từ chối, BE/LLM timeout, không có nguồn, phản hồi chứa giá hoặc số liệu không khớp nguồn. **Xong khi:** cả hai loại trợ lý dùng chung hạ tầng nhưng không dùng chung quyền; dữ liệu private không đi vào câu trả lời công khai.

### F17.8. Chức năng 5 và 6 — Hỗ trợ thông tin sách, đọc tài liệu và OCR

**FILE:** `app/services/extraction/metadata.py → classification.py → ocr.py` (chỉ khi có nhu cầu OCR thực), kết hợp `app/services/indexing/document_indexer.py`, `app/workers/extract_metadata.py`, `app/api/internal/sources.py` và `app/integrations/storage.py`.

**Quy trình:** BE `tep-tin/` tiếp nhận/kiểm tra file và quyền → BE cấp nguồn hoặc URL đọc có thời hạn cho AI → AI trích xuất văn bản từ định dạng hỗ trợ, chỉ OCR nếu cần → chuẩn hóa/chia đoạn và tạo embedding theo quyền → đề xuất từ khóa, thể loại, metadata hoặc phát hiện khả năng trùng → BE hiển thị bản nháp cho nhân viên duyệt → service sở hữu dữ liệu kiểm tra rồi mới lưu. Không tự ghi đè ISBN, tác giả, nhà xuất bản; không lập chỉ mục toàn văn sách hay gửi file ra nhà cung cấp khi chưa có quyền xử lý nội dung.

**Test:** sai MIME, file quá lớn, PDF/ảnh lỗi, file private khác tenant, nguồn bị thu hồi, nội dung có prompt injection, OCR trả sai, metadata thiếu và nhân viên từ chối đề xuất. **Xong khi:** dữ liệu AI là gợi ý có nguồn, chưa duyệt không trở thành dữ liệu nghiệp vụ chính thức.

### F17.9. Chức năng 7 — AI phân tích báo cáo

**FILE:** `app/services/analytics/report_analysis.py → usage_tracking.py`, `app/prompts/report_assistant.py`, dùng `app/services/assistant/chat.py` và API báo cáo BE. Chỉ thực hiện sau khi `backend/src/modules/bao-cao/` đã hoàn tất và trả đúng số liệu được đối soát.

**Quy trình:** BE xác thực người hỏi → BE `bao-cao/` tính toán và trả bộ dữ liệu theo kỳ/đơn vị/chi nhánh đã kiểm quyền → AI nhận **số liệu đã chốt**, phân tích biến động và tạo diễn giải → `response_validator.py` kiểm tra nguồn, kỳ báo cáo và các con số được trích → BE trả kết quả. AI không tự tính lại tiền bằng văn bản, không tự truy vấn chứng từ thô vượt quyền và không dùng chỉ số thiếu dữ liệu để khẳng định nguyên nhân.

**Test:** kỳ báo cáo rỗng, sai múi giờ, hoàn tiền và cọc, quyền chỉ một chi nhánh, số liệu BE thay đổi, báo cáo chưa sẵn sàng, LLM tự tạo con số. **Xong khi:** mỗi nhận xét định lượng có dữ liệu đầu vào đối chiếu được.

### F17.10. Viết đầu nối backend và API AI theo format chung

**FILE — THAO TÁC:** `backend/src/integrations/ai-client.js` — **TẠO MỚI**; `backend/src/modules/ai/ai.validation.js`, `ai.repository.js`, `ai.service.js`, `ai.controller.js`, `ai.routes.js` — **TẠO MỚI** khi tới lượt; `backend/src/routes/index.js` — **THÊM** đăng ký router AI đúng vị trí; `backend/src/services/ready.service.js` — **CHỈ SỬA NẾU** hợp đồng readiness yêu cầu kiểm tra AI.

- `ai-client.js`: gọi FastAPI bằng địa chỉ nội bộ, token dịch vụ, request ID, timeout và schema đã chốt; không expose token cho browser, không retry vô hạn request chat hoặc thao tác không idempotent.
- `ai.validation.js`: kiểm tra câu hỏi, bộ lọc, ID, phân trang, hội thoại và giới hạn input theo API BE. `ai.repository.js`: chỉ thao tác bảng AI BE sở hữu nếu cần cấu hình/hội thoại/nhật ký; không viết lại repository Python hoặc SQL nghiệp vụ.
- `ai.service.js`: xác thực, lấy tenant/branch từ quyền, kiểm tra quyền cá nhân hóa/tài liệu, gọi `ai-client.js`, bổ sung giá/tồn/đơn/báo cáo qua service BE và có fallback khi AI gián đoạn. `ai.controller.js` trả response/lỗi theo contract chung; `ai.routes.js` gắn middleware phù hợp cho public/customer/staff/admin.
- FE dùng API client chung để gọi `/api/...` của backend, không gọi thẳng FastAPI. Từng màn hình AI chỉ render khả năng đã có API thật: tìm kiếm, gợi ý, chat, lịch sử/feedback và trang quản trị job khi quyền cho phép.
- Đồng bộ nguồn được nối từ sự kiện nghiệp vụ BE qua backend-worker/outbox; **không** gọi AI đồng bộ bên trong transaction bán hàng để tránh AI lỗi làm hỏng nghiệp vụ chính.

**Test:** public xem dữ liệu công khai; người dùng chỉ xem dữ liệu của mình; nhân viên chỉ xem chi nhánh được cấp; API bị timeout trả lỗi/fallback phù hợp; một request BE sinh đúng một request AI và có request ID truy vết; AI ngừng hoạt động không chặn bán, mượn hay thanh toán.

### F17.11. Feedback, vận hành, kiểm thử và điều kiện kết thúc

**FILE:** `app/api/internal/feedback.py`, `app/repositories/feedback.py`, `app/services/analytics/usage_tracking.py`, `ai-service/tests/unit/`, `tests/integration/`, `tests/evaluations/`, `ai-service/Dockerfile` và các cấu hình Compose **chỉ bổ sung khi API/Worker thật đã chạy**. Feedback cần gắn câu trả lời/kết quả và phạm vi người dùng; chặn ghi feedback cho hội thoại người khác. Usage tracking lưu loại tác vụ, độ trễ, trạng thái và mức tiêu thụ theo chính sách, không log bí mật hoặc toàn bộ tài liệu private.

**Lệnh kiểm tra dự kiến sau khi đã viết đầy đủ dependency và file tương ứng** (không coi là bằng chứng đã chạy ở thời điểm lập kế hoạch):

```bash
# Trong ai-service/: cài dependency đã khai báo trong pyproject.toml
python -m pip install -e '.[dev]'
# Chạy API và worker ở hai terminal riêng, với .env cục bộ hợp lệ
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
python -m app.workers.runner
# Chạy kiểm thử Python
python -m pytest tests/unit tests/integration tests/evaluations
# Kiểm tra endpoint health theo contract thực tế
curl -i http://127.0.0.1:8001/health
# Trong backend/: chỉ chạy lệnh test đã khai báo và tồn tại trong package.json
npm test
# Khi Dockerfile đa stage đã viết đúng target api/worker
# docker build -f ai-service/Dockerfile --target api -t bookflow-ai-api .
# docker build -f ai-service/Dockerfile --target worker -t bookflow-ai-worker .
```

**Test bắt buộc để đóng F17:** unit cho schema/provider/ranking/chunking; integration cho PostgreSQL/pgvector/Redis/RQ/BE client; contract test BE ↔ Python; đánh giá RAG cho độ đúng nguồn, trích dẫn, không bịa giá/tồn; thử tenant/branch isolation; thu hồi quyền/file private; prompt injection; lỗi provider/BE/Redis; timeout; retry/idempotency; thay đổi/xóa nguồn; giới hạn chi phí; không làm chậm nghiệp vụ BE khi AI lỗi. Ghi lại **lệnh đã thực chạy và kết quả thực**, không đánh dấu pass trước khi kiểm tra.

**Kết thúc F17:** `ai-api` và `ai-worker` chạy độc lập; BE là cổng duy nhất FE gọi; có tìm kiếm và gợi ý sách trên dữ liệu thật, chatbot khách/trợ lý nội bộ có kiểm quyền, OCR/metadata chỉ theo quyền và bước duyệt, phân tích báo cáo dựa trên số liệu BE; index cập nhật/xóa theo sự kiện; job retry an toàn; có test và tài liệu vận hành. Có thể phát hành từng chức năng bằng feature flag, không cần chờ tất cả bảy chức năng cùng bật.

**Thứ tự mở tính năng sau BE:** nền tảng AI + đồng bộ/index → tìm kiếm sách → gợi ý sách → chatbot khách → trợ lý nội bộ → hỗ trợ metadata/OCR → AI báo cáo. Các nhánh sau chỉ mở khi đã có nguồn, quyền, API và test tương ứng; **phần AI là giai đoạn sau BE, không phải công việc đang làm song song trong giai đoạn BE hiện tại**.

---

## F18 — Hoàn thiện giao diện báo cáo/SaaS, build và CI triển khai

**Phụ thuộc:** các module đã hoạt động. Chia F18 thành các nhánh riêng, không gom thành một lần triển khai lớn.

| Nhánh | Viết file/code | Test hoàn thành |
|---|---|---|
| Báo cáo FE | FE báo cáo gọi API `backend/src/modules/bao-cao/` đã hoàn thiện ở F16; tối ưu truy vấn và giao diện khi cần | Đúng tenant, mốc giờ, số liệu hoàn/cọc; không tính lại số liệu ở FE/AI |
| SaaS | `backend/src/modules/saas/` gói/quyền/hạn mức/thuê bao + FE `super-admin` | Đơn vị hết hạn không ảnh hưởng đơn vị khác |
| Nginx | `infrastructure/nginx/nginx.conf`, templates, `compose.production.yaml` | Chỉ Nginx public; FE/API proxy đúng |
| Docker | `frontend/Dockerfile`, `backend/Dockerfile`, `ai-service/Dockerfile` có target `api`/`worker` | Bốn image build riêng; `backend-worker` tái sử dụng image BE |
| Build scripts | `scripts/build/*.sh`, `scripts/deploy/*.sh`, root `package.json` | Mỗi npm script gọi được file thực tồn tại |
| CI | `.github/workflows/test-*.yml`, `build-images.yml`, `deploy-*.yml` | Test/lint/contract/migration/build ảnh hưởng đạt |
| Backup | `infrastructure/backup/`, `scripts/backup/` | Khôi phục được PostgreSQL và file MinIO bằng bản thử |

**Thứ tự phát hành:** dev chạy end-to-end → tạo release từ `dev` → kiểm thử Stable trên image bất biến → merge/tag `main` → triển khai đúng image đã kiểm thử. Migration production chạy job duy nhất có lịch sử; rollback image không đồng nghĩa đảo migration DB.

---

# PHẦN III — MẪU BẮT BUỘC KHI HƯỚNG DẪN VIẾT MỘT FILE

Mỗi lần triển khai một bước tiếp theo, tài liệu/hướng dẫn phải có **đủ 8 mục**, không dừng ở “tạo file này”:

1. **FILE:** đường dẫn tuyệt đối từ `BookFlow/` hoặc đường dẫn tương đối rõ ràng.
2. **THAO TÁC:** `TẠO MỚI`, `THAY TOÀN BỘ`, `THÊM SAU` hoặc `XÓA` đoạn được định vị chính xác.
3. **PHỤ THUỘC:** file hoặc migration nào phải hoàn tất trước.
4. **CODE:** mã thật cần đặt trong file, hoặc chữ ký hàm + thuật toán + contract cụ thể cho nghiệp vụ chưa chốt schema.
5. **ĐĂNG KÝ/KẾT NỐI:** import/export, route/middleware, HBS partial, queue hoặc Compose nào phải gọi nó; không để file đứng một mình.
6. **LỆNH CHẠY:** câu lệnh chạy thử hoặc test đúng thư mục, không khai báo script chưa tồn tại.
7. **KẾT QUẢ MONG ĐỢI:** HTTP status/JSON, HTML, bản ghi DB, log hoặc thay đổi file phải kiểm tra.
8. **LỖI CẦN TEST:** input sai, thiếu quyền, khác tenant, retry hoặc concurrency khi có liên quan.

**Ví dụ một ticket hoàn chỉnh “thêm đầu sách”:**

```text
Migration tạo bảng/constraint
   ↓
Repository viết SQL có tham số
   ↓
Service kiểm quyền, validate nghiệp vụ, transaction
   ↓
Controller chuyển request thành input service
   ↓
Route gắn middleware xác thực/permission/validation
   ↓
Contract test và API integration test
   ↓
FE api-client gọi API → form dùng partials chung
   ↓
FE test + E2E → cập nhật tài liệu → commit/PR vào dev
```

**Dấu hiệu chưa xong:** chỉ có folder và file rỗng; route trả mock không có dữ liệu thật nhưng được đánh dấu hoàn thành; controller tự viết SQL; FE chỉ ẩn nút mà BE không kiểm quyền; thiếu test transaction; script trong `package.json` trỏ đến file chưa tồn tại.

---

# PHẦN IV — CHECKLIST THỰC TẾ ĐỂ BẮT ĐẦU NGAY

- [ ] F00: folder chính và Git đã có trên `dev`.
- [ ] F00: có README, `.gitignore`, `.dockerignore`, `.env.example` thật; secrets không bị theo dõi.
- [ ] F00: viết `package.json` với script **đã tồn tại**.
- [ ] F00: viết `scripts/kiem-tra-cau-truc.mjs` và test; hai lệnh npm chạy thành công.
- [ ] F01: `/health` được định nghĩa trong hợp đồng API.
- [ ] F02: ba dịch vụ PostgreSQL/Redis/MinIO chạy được trong Compose dev.
- [ ] F03: migration runner chạy SQL thật, chạy lại không trùng và có test rollback.
- [ ] F04: backend trả `/health` bằng code thật và unit/API test đạt.
- [ ] F05: đăng nhập/RBAC/tenant có integration test.
- [ ] F06: frontend render HTML thật và gọi BE qua API client.
- [ ] F07–F08: icon/form dùng chung có trang demo kiểm thử được.
- [ ] F09–F10: upload ảnh và thêm/xem sách là lát cắt đầu tiên chạy end-to-end.
- [ ] F11–F16: hoàn thiện nghiệp vụ BE, worker, thông báo và API báo cáo có test; chưa triển khai AI khi dữ liệu/quyền nguồn chưa sẵn sàng.
- [ ] F17: sau BE, chốt contract + migration AI, viết FastAPI/RQ và backend AI client theo thứ tự, triển khai bảy chức năng, chạy test quyền/tenant/contract/RAG.
- [ ] F18: hoàn thiện FE báo cáo, Docker/CI, build và deploy khi các dịch vụ thực đã chạy.

**Trạng thái:** đây là quy trình và code mẫu để triển khai, không khẳng định bất kỳ file/code nào ở trên đã được tạo trong GitHub repository của m. Khi làm thật phải ghi lại lệnh kiểm tra đã chạy và kết quả tương ứng.
