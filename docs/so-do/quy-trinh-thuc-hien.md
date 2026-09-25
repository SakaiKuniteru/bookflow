# BOOKFLOW AI — QUY TRÌNH VIẾT CODE THEO FOLDER VÀ FILE

**Tên file:** `quy-trinh-thuc-hien.md`  
**Phiên bản:** 3.0 — hướng dẫn thực thi code, thay cho checklist chỉ tạo thư mục/file.  
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
                               └── F16  BullMQ + thông báo + nhắc hạn

F17  AI API + AI Worker + pgvector (sau khi có sách/hợp đồng/quyền)
F18  Báo cáo + SaaS + Nginx + CI/build/deploy/backup
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
backend/src/modules/tai-khoan/        # Tài khoản và hồ sơ
backend/src/modules/xac-thuc/         # Đăng nhập, phiên, đổi/đặt lại mật khẩu
backend/src/modules/phan-quyen/       # Vai trò, quyền, gán quyền
backend/src/modules/don-vi/           # CRUD và phạm vi đơn vị
backend/src/modules/chi-nhanh/        # Chi nhánh thuộc đơn vị
backend/src/common/middlewares/       # authenticate/authorize/tenant-scope/branch-scope
```

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

## F16 — Code BullMQ worker, thông báo và báo cáo cơ bản

**Phụ thuộc:** F04, F05 và sự kiện từ F13–F15. **Thứ tự file:** `integrations/redis-client.js → jobs/queues/ → jobs/processors/ → worker.js → tests`.

**Hàm:** `xepThongBao`, `guiThongBao`, `nhacHanMuon`, `ghiNhanKetQuaGui`, `taoBaoCaoCoBan`. Job chứa ID nghiệp vụ, không gửi cả dữ liệu nhạy cảm vào Redis; retry/backoff có giới hạn, job id chống trùng theo nghiệp vụ. `backend-worker` khởi chạy bằng image backend nhưng command `node src/worker.js`.

**Test:** retry không nhân đôi thông báo/giao dịch, worker dừng không làm mất sự kiện gốc, báo cáo có phạm vi tenant/branch và đối soát đúng tiền cọc/hoàn.

---

## F17 — Code AI API, AI Worker và kết nối backend

**Phụ thuộc:** F01, F02, F03, F05 và sách F10. **Thứ tự:**

```text
ai-service/requirements.txt
  → app/config.py
  → app/main.py + app/api/kiem_tra.py
  → app/core/security.py
  → app/schemas/*.py
  → app/llm/client.py
  → app/embeddings/embedding_service.py
  → app/retrieval/vector_search.py + permission_filter.py
  → app/services/tu_van_sach.py
  → app/workers/queue.py + worker.py + tasks/lap_chi_muc_sach.py
  → backend/src/integrations/ai-client.js
  → backend/src/modules/ai/ + FE trang AI
  → tests FastAPI/RQ/contract/RAG permissions
```

**Mẫu code FastAPI tối thiểu** — `ai-service/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI(title="BookFlow AI Internal API")

@app.get("/health")
def kiem_tra_suc_khoe():
    return {"status": "ok", "service": "ai-api"}
```

**Hàm cần viết:** `kiemTraYeuCauNoiBo`, `taoEmbedding`, `lapChiMucSach`, `timSachVector`, `locNguonTheoQuyen`, `tuVanSach`, `taoJobAi`, `layTrangThaiJob`. Python dùng RQ queue riêng, không đọc trực tiếp BullMQ job. Mọi truy vấn vector lọc tenant và quyền; metadata sách thay đổi phải có cách cập nhật/xóa index. AI chỉ đề xuất, backend quyết định bán/kho/tiền.

**Test:** `GET /health`; backend xác thực gọi nội bộ; tenant B không có dữ liệu A; file private không xuất hiện trong RAG; job retry không tạo vector trùng; timeout nhà cung cấp AI không chặn bán/mượn. Sau khi có code Python mới viết `Dockerfile.api` và `Dockerfile.worker`, kiểm tra build riêng từng image.

---

## F18 — Code báo cáo/SaaS, hoàn thiện build và CI triển khai

**Phụ thuộc:** các module đã hoạt động. Chia F18 thành các nhánh riêng, không gom thành một lần triển khai lớn.

| Nhánh | Viết file/code | Test hoàn thành |
|---|---|---|
| Báo cáo | `backend/src/modules/bao-cao/` repository/service/controller/route + FE báo cáo | Đúng tenant, mốc giờ, số liệu hoàn/cọc |
| SaaS | `backend/src/modules/saas/` gói/quyền/hạn mức/thuê bao + FE `super-admin` | Đơn vị hết hạn không ảnh hưởng đơn vị khác |
| Nginx | `infrastructure/nginx/nginx.conf`, templates, `compose.production.yaml` | Chỉ Nginx public; FE/API proxy đúng |
| Docker | `frontend/Dockerfile`, `backend/Dockerfile`, `ai-service/Dockerfile.api`, `Dockerfile.worker` | Bốn image build riêng; `backend-worker` tái sử dụng image BE |
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

**Trạng thái:** đây là quy trình và code mẫu để triển khai, không khẳng định bất kỳ file/code nào ở trên đã được tạo trong GitHub repository của m. Khi làm thật phải ghi lại lệnh kiểm tra đã chạy và kết quả tương ứng.
