# BookFlow F05 — xac-thuc/ (patch chi chua code, KHONG chua .env)

## Doi chieu truoc khi ap dung

Patch duoc viet dua tren `BookFlow(2).zip` va bo `tai-khoan` da huong dan trong chat; cac file trong may Mac co the da thay doi sau do. Xem `git status --short` va diff truoc khi ghi de.

`database/migrations/009_xac-thuc-otp-nhan-vien.sql` bo sung username, co bat doi mat khau, han mat khau tam, don vi kich hoat, CSRF session va OTP purposes. Chay sau 001–008 (dac biet `007_nhat-ky-he-thong.sql` can cho audit admin va kich hoat nhan vien). Neu 005–008 chua co tren may, hoan thien cac migration da du kien truoc khi chay 009. File 009 trong patch nay khong thay the 007. Khong sua migration da ghi checksum.

## Cai dependency

```bash
npm install --prefix backend nodemailer cookie-parser express-rate-limit
```

## Them vao .env va .env.example (KHONG commit .env)

```dotenv
SMTP_HOST=smtp.example.invalid
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=
SMTP_FROM="BookFlow <no-reply@example.invalid>"
PUBLIC_LOGIN_URL=http://localhost:3000/dang-nhap
OTP_SECRET=
```

Dien SMTP_HOST/USER/PASSWORD/FROM cua dich vu email that. Tao OTP_SECRET: `openssl rand -hex 32`, dan ket qua vao `.env` (khong in secret trong chat/log). `PUBLIC_LOGIN_URL` phai la URL trang dang nhap FE da trien khai; neu FE chua co trang thi link se chua hoat dong. SMTP 465 dung TLS ngay; 587 dung STARTTLS.

## Chay

```bash
git status --short
npm --prefix database run migrate
npm --prefix backend start
```

## Test Postman

Base: `http://127.0.0.1:3001/api/xac-thuc`. Body JSON, Content-Type application/json.

| POST/GET | Path | Body / luu y |
| --- | --- | --- |
| POST | /dang-ky | `{ "ho_ten":"Nguyen A", "email":"a@example.com", "mat_khau":"Abc@12345" }` |
| POST | /xac-nhan-dang-ky | `{ "email":"a@example.com", "otp":"123456" }` — lay OTP that tu email |
| POST | /gui-lai-otp-dang-ky | `{ "email":"a@example.com" }` — 60 giay cooldown |
| POST | /dang-nhap | `{ "dinh_danh":"a@example.com", "mat_khau":"Abc@12345" }` |
| GET | /me | Cookie `bookflow_sid` sau dang nhap |
| POST | /yeu-cau-doi-mat-khau | `{ "mat_khau_hien_tai":"Abc@12345" }` + cookie + X-CSRF-Token |
| POST | /doi-mat-khau | `{ "mat_khau_hien_tai":"Abc@12345", "otp":"123456", "mat_khau_moi":"New@12345" }` + cookie + CSRF |
| POST | /quen-mat-khau | `{ "email":"a@example.com" }` |
| POST | /dat-lai-mat-khau | `{ "email":"a@example.com", "otp":"123456", "mat_khau_moi":"New@12345" }` |
| POST | /lam-moi-phien | Cookie + X-CSRF-Token; cookie cu bi thu hoi |
| POST | /dang-xuat | Cookie + X-CSRF-Token |
| POST | /chon-don-vi | `{ "don_vi_id":"<uuid>" }` + cookie + CSRF; chi nhan vien |
| POST | /nhan-vien | `{ "ten_dang_nhap":"nv01", "ma_nhan_vien":"NV01", "ho_ten":"Nhan Vien 01", "email":"nv01@example.com", "chuc_danh":"Nhan vien" }` + cookie + CSRF; yeu cau quyen members.manage |
| POST | /hoan-tat-nhan-vien | `{ "dinh_danh":"nv01", "mat_khau_tam":"<tu email 1>", "otp":"<tu email 2>", "mat_khau_moi":"New@12345" }` |
| POST | /nhan-vien/:taiKhoanId/gui-lai-thu-moi | Cookie + CSRF; admin gui lai mat khau tam khi het han |

Postman cookie jar giu `bookflow_sid` (HttpOnly) va `bookflow_csrf`. Cho cac POST duoc bao ve, dat header `X-CSRF-Token` bang gia tri cookie `bookflow_csrf` cua cung host. Account nhan vien moi khong nhan session khi chi nhap mat khau tam: /dang-nhap tra 202 va gui OTP, /hoan-tat-nhan-vien moi tao session.

## Gioi han can giai quyet truoc production

- Bo code dang dung MD5 dung yeu cau giai doan dev; phai nang cap sang Argon2id truoc khi luu mat khau tai khoan that.
- Gui mat khau tam bang email dung yeu cau, nhung kem an toan hon link kich hoat dung mot lan va cho nguoi dung tu dat mat khau. OTP gui cung email khong phai yeu to doc lap.
- Email duoc gui trong DB transaction de neu SMTP loi co the rollback signup/invite; production can outbox + worker de tranh giu lock DB trong khi cho SMTP, va de bao dam retry. Neu SMTP da giao email nhung COMMIT that bai, email do khong con hieu luc.
- Express rate-limit su dung bo nho cua mot process; khi chay nhieu backend can Redis store dung chung, them gioi han tai reverse proxy.
- Backend chua tu tao don vi/quan tri dau tien; endpoint tao nhan vien chi hoat dong neu da co admin co phien da chon don vi va quyen `members.manage`, da seed vai tro `NHAN_VIEN`, co bang audit tu migration 007.
- Chua update OpenAPI F01 cho cac route F05 trong patch nay; truoc khi ket thuc F05 can bo sung va lint hop dong.
- Backend chua cau hinh CORS cho frontend khac origin; frontend nen proxy cung origin hoac them CORS allowlist + credentials theo origin thuc te.
