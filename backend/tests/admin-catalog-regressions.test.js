const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "../..");
const load = (path) => readFileSync(join(root, path), "utf8");
const sach = require("../src/modules/sach/sach.validation.js");
const sachService = require("../src/modules/sach/sach.service.js");
const tacGia = require("../src/modules/tac-gia/tac-gia.validation.js");
const theLoai = require("../src/modules/the-loai/the-loai.validation.js");
const nhaXuatBan = require("../src/modules/nha-xuat-ban/nha-xuat-ban.validation.js");
const nhaCungCap = require("../src/modules/nha-cung-cap/nha-cung-cap.validation.js");
const phienBan = require("../src/modules/phien-ban-sach/phien-ban-sach.validation.js");
const kho = require("../src/modules/kho/kho.validation.js");
const hoiVien = require("../src/modules/hoi-vien/hoi-vien.validation.js");
const tepTin = require("../src/modules/tep-tin/tep-tin.validation.js");
const {
  chuyenRequestSnakeCase,
} = require("../src/common/middlewares/request-snake-case.js");
const {
  chuyenResponseCamelCase,
} = require("../src/common/middlewares/response-camel-case.js");

const forms = [
  "frontend/src/views/partials/modals/admin/quan-ly-sach/sach/sach-form.hbs",
  "frontend/src/views/partials/modals/admin/quan-ly-sach/tac-gia/tac-gia-form.hbs",
  "frontend/src/views/partials/modals/admin/quan-ly-sach/the-loai/the-loai-form.hbs",
  "frontend/src/views/partials/modals/admin/quan-ly-sach/nha-xuat-ban/nha-xuat-ban-form.hbs",
  "frontend/src/views/partials/modals/admin/quan-ly-sach/nha-cung-cap/nha-cung-cap-form.hbs",
  "frontend/src/views/partials/modals/admin/quan-ly-sach/phien-ban-sach/phien-ban-sach-form.hbs",
  "frontend/src/views/partials/modals/admin/quan-ly-kho/kho/kho-form.hbs",
  "frontend/src/views/partials/modals/admin/hoi-vien/hoi-vien-form.hbs",
];

test("API validation permits changing codes on update for every catalog form", () => {
  assert.equal(
    sach.duLieuSach({ ma_dau_sach: "BOOK-2" }).ma_dau_sach,
    "BOOK-2",
  );
  assert.equal(
    tacGia.suaTacGiaHopLe({ ma_tac_gia: "AUTHOR-2" }).ma_tac_gia,
    "AUTHOR-2",
  );
  assert.equal(
    theLoai.suaTheLoaiHopLe({ ma_the_loai: "GENRE-2" }).ma_the_loai,
    "GENRE-2",
  );
  assert.equal(
    nhaXuatBan.suaNhaXuatBanHopLe({ ma_nha_xuat_ban: "PUB-2" }).ma_nha_xuat_ban,
    "PUB-2",
  );
  assert.equal(
    nhaCungCap.duLieuHopLe({ ma_nha_cung_cap: "SUP-2" }).ma_nha_cung_cap,
    "SUP-2",
  );
  assert.equal(
    phienBan.suaPhienBanHopLe({ ma_phien_ban: "VER-2" }).ma_phien_ban,
    "VER-2",
  );
  assert.equal(kho.duLieuKhoHopLe({ ma_kho: "WH-2" }).ma_kho, "WH-2");
  assert.equal(
    hoiVien.suaHoiVienHopLe({ ma_hoi_vien: "MEM-2" }).ma_hoi_vien,
    "MEM-2",
  );
});

test("warehouse create accepts branch selection; update keeps branch ownership immutable", () => {
  const created = kho.duLieuKhoHopLe(
    { chi_nhanh_id: 7, ma_kho: "WH-7", ten_kho: "Kho thử" },
    true,
  );
  assert.equal(created.chi_nhanh_id, 7);
  assert.throws(
    () => kho.duLieuKhoHopLe({ chi_nhanh_id: 8 }, false),
    /Không được đổi chi nhánh sở hữu kho/,
  );
});

test("supplier address fields stay in the address form and out of the root supplier API payload", () => {
  const source = load(forms[4]);
  for (const name of ["maTinhThanh", "maPhuongXa", "diaChiChiTiet"]) {
    const start = source.indexOf(`name="${name}"`);
    assert.notEqual(start, -1, `Missing form field ${name}`);
    const end = source.indexOf("\n        }}", start);
    assert.match(source.slice(start, end), /frontendOnly=true/);
  }
  const formScript = load("frontend/src/public/js/page/admin-danh-muc.js");
  assert.match(formScript, /\["maTinhThanh", "maPhuongXa", "diaChiChiTiet"\]/);
});

test("all requested catalog forms render an active checkbox and use camelCase field names", () => {
  for (const path of forms) {
    const source = load(path);
    assert.match(
      source,
      /forms\/catalog-active/,
      `${path} has no active checkbox`,
    );
    assert.doesNotMatch(
      source,
      /name="[a-z][a-z0-9]*_[a-z0-9_]+"/,
      `${path} has a snake_case form name`,
    );
  }
});

test("HTTP field conversion accepts camelCase requests and returns camelCase field errors", () => {
  assert.deepEqual(
    chuyenRequestSnakeCase({ maTheLoai: "GEN-1", tenTheLoai: "Tên" }),
    {
      ma_the_loai: "GEN-1",
      ten_the_loai: "Tên",
    },
  );
  assert.deepEqual(
    chuyenResponseCamelCase({ error: { details: [{ field: "ma_the_loai" }] } }),
    { error: { details: [{ field: "maTheLoai" }] } },
  );
});

test("supplier phone accepts local numbers and common pasted formatting", () => {
  assert.equal(
    nhaCungCap.duLieuHopLe({ so_dien_thoai: "0386296014" }).so_dien_thoai,
    "0386296014",
  );
  assert.equal(
    nhaCungCap.duLieuHopLe({ so_dien_thoai: "+84 (38) 629-6014" })
      .so_dien_thoai,
    "+84386296014",
  );
  assert.throws(
    () => nhaCungCap.duLieuHopLe({ so_dien_thoai: "03A6296014" }),
    (error) =>
      error.details?.some(
        (detail) =>
          detail.field === "so_dien_thoai" &&
          detail.message.includes("Số điện thoại"),
      ),
  );
});

test("a short secondary supplier phone is reported only for its own field", () => {
  assert.throws(
    () =>
      nhaCungCap.duLieuHopLe({
        so_dien_thoai: "0386296014",
        so_dien_thoai_phu: "1234",
      }),
    (error) =>
      error.details?.length === 1 &&
      error.details[0].field === "so_dien_thoai_phu" &&
      error.details[0].message.includes("Số điện thoại phụ"),
  );
  const formScript = load("frontend/src/public/js/components/forms/validation.js");
  assert.match(formScript, /replace\(\/\_\(\[a-z0-9\]\)\/g/);
  assert.match(formScript, /số điện thoại phụ\|điện thoại phụ/);
});

test("book publication year and displayed date enforce their chronological bounds", () => {
  assert.doesNotThrow(() =>
    sachService.kiemTraNghiepVu({
      nam_sang_tac: 2000,
      nam_xuat_ban_dau_tien: 2000,
      ngay_xuat_ban_hien_thi: "2000-01-01",
    }),
  );
  assert.throws(
    () =>
      sachService.kiemTraNghiepVu({
        nam_sang_tac: 2001,
        nam_xuat_ban_dau_tien: 2000,
        ngay_xuat_ban_hien_thi: "1999-12-31",
      }),
    (error) =>
      error.details?.some((item) => item.field === "nam_xuat_ban_dau_tien") &&
      error.details?.some((item) => item.field === "ngay_xuat_ban_hien_thi"),
  );
  const form = load(
    "frontend/src/views/partials/modals/admin/quan-ly-sach/sach/sach-form.hbs",
  );
  assert.match(form, /maxYearFrom="catalog-nam-xuat-ban-dau-tien"/);
  assert.match(form, /minYearFrom="catalog-nam-sang-tac"/);
  assert.match(form, /minDateFrom="catalog-nam-xuat-ban-dau-tien"/);
});

test("file inputs are never assigned saved upload values; book images reload from their API", () => {
  const formScript = load("frontend/src/public/js/page/admin-danh-muc.js");
  const imageScript = load("frontend/src/public/js/components/forms/image.js");
  assert.match(formScript, /field\.type === "file"\) return/);
  assert.match(formScript, /\/api\/sach\/\$\{encodeURIComponent\(record\.id\)\}\/anh/);
  assert.match(formScript, /removeBookImages\(bookId\)/);
  assert.match(imageScript, /event\.detail\?\.items/);
  assert.match(imageScript, /\.bf-image-removed/);
});

test("book form does not accept publisher or manufacturer values that its API cannot persist", () => {
  const bookForm = load(forms[0]);
  const versionForm = load(
    "frontend/src/views/partials/modals/admin/quan-ly-sach/phien-ban-sach/phien-ban-sach-form.hbs",
  );
  assert.doesNotMatch(bookForm, /name="nhaSanXuatId"|name="nhaXuatBanId"/);
  assert.match(bookForm, /Nhà xuất bản được lưu theo từng phiên bản sách/);
  assert.match(versionForm, /name="nhaXuatBanId"/);
});

test("multi-select controls keep a visible search placeholder in one horizontally scrollable row", () => {
  const selectCss = load("frontend/src/public/css/components/forms/select.css");
  const selectTemplate = load("frontend/src/views/partials/forms/select.hbs");
  assert.match(selectTemplate, /placeholder="\{\{placeholder\}\}"/);
  assert.match(selectCss, /data-multiple="true"\] \.bf-select-value[\s\S]*?flex-wrap: nowrap/);
  assert.match(selectCss, /overflow-x: auto/);
  assert.match(selectCss, /\.bf-select-search-input[\s\S]*?min-width: 96px/);
});

test("new catalog forms default active and member tier API supplies the four standard ranks", () => {
  const active = load("frontend/src/public/js/page/catalog-status.js");
  const pageScript = load("frontend/src/public/js/page/admin-danh-muc.js");
  for (const key of ["books", "authors", "genres", "publishers", "versions", "warehouses", "suppliers", "memberships"])
    assert.match(active, new RegExp(`${key}: true`));
  assert.match(pageScript, /editing && control\.checked === wasActive/);
  assert.match(pageScript, /!editing && saved\?\.trangThai === targetStatus/);
  assert.match(pageScript, /trangThai: targetStatus/);
  const migration = load("database/migrations/053_hang-hoi-vien-mac-dinh.sql");
  for (const name of ["Hội viên Cơ bản", "Hội viên Bạc", "Hội viên Vàng", "Hội viên Kim cương"])
    assert.ok(migration.includes(name), `Missing default tier ${name}`);
  assert.match(load("backend/src/modules/hoi-vien/hoi-vien.service.js"), /repo\.damBaoHangMacDinh\(auth\.donViId\)/);
});

test("publisher contact phone accepts a valid local number and reports a clear field error", () => {
  const valid = nhaXuatBan.nhaXuatBanMoiHopLe({
    ma_nha_xuat_ban: "PUB-PHONE",
    ten_nha_xuat_ban: "Nhà xuất bản kiểm thử",
    so_dien_thoai_lien_he: "0386296014",
  });
  assert.equal(valid.so_dien_thoai_lien_he, "0386296014");
  assert.throws(
    () =>
      nhaXuatBan.nhaXuatBanMoiHopLe({
        ma_nha_xuat_ban: "PUB-PHONE",
        ten_nha_xuat_ban: "Nhà xuất bản kiểm thử",
        so_dien_thoai_lien_he: "abc",
      }),
    (error) =>
      error.details?.some(
        (detail) =>
          detail.field === "so_dien_thoai_lien_he" &&
          detail.message.includes("Số điện thoại liên hệ"),
      ),
  );
});

test("supplier cooperation dates reject an end date before the start date", () => {
  assert.throws(
    () =>
      nhaCungCap.duLieuHopLe({
        ngay_bat_dau_hop_tac: "2026-10-01",
        ngay_ket_thuc_hop_tac: "2026-09-30",
      }),
    (error) =>
      error.details?.some(
        (detail) =>
          detail.field === "ngay_ket_thuc_hop_tac" &&
          detail.message.includes("không được trước"),
      ),
  );
  const form = load(
    "frontend/src/views/partials/modals/admin/quan-ly-sach/nha-cung-cap/nha-cung-cap-form.hbs",
  );
  assert.match(form, /maxDateFrom="catalog-ngay-ket-thuc-hop-tac"/);
  assert.match(form, /minDateFrom="catalog-ngay-bat-dau-hop-tac"/);
});

test("warehouse reports the used-area field when it exceeds total area", () => {
  assert.throws(
    () =>
      kho.duLieuKhoHopLe(
        {
          chi_nhanh_id: 7,
          ma_kho: "WH-AREA",
          ten_kho: "Kho diện tích",
          dien_tich_m2: 33,
          dien_tich_su_dung_m2: 444,
        },
        true,
      ),
    (error) =>
      error.details?.some(
        (detail) =>
          detail.field === "dien_tich_su_dung_m2" &&
          detail.message.includes("không được lớn hơn diện tích"),
      ),
  );
  assert.match(
    load("backend/src/modules/kho/kho.service.js"),
    /ck_kho_suc_chua[\s\S]*?dien_tich_su_dung_m2/,
  );
});

test("multipart upload validation receives the public camelCase form fields", () => {
  assert.deepEqual(
    tepTin.duLieuUploadHopLe(
      { phamViSoHuu: "DON_VI", loaiTep: "ANH_TAC_GIA" },
      [{ size: 12 }],
    ),
    { phamVi: "DON_VI", loaiTep: "ANH_TAC_GIA" },
  );
  const routes = load("backend/src/modules/tep-tin/tep-tin.routes.js");
  assert.doesNotMatch(routes, /chuyenRequestSnakeCase/);
});

test("catalog delete and status actions use an in-app confirmation dialog", () => {
  const script = load("frontend/src/public/js/page/admin-danh-muc.js");
  assert.doesNotMatch(script, /window\.confirm\(/);
  assert.match(script, /data-catalog-action-confirm/);
  assert.match(script, /setModalLoading\(actionModal, true\)/);
  assert.match(script, /bookflow:modal:close/);
});

test("catalog form submissions always run server validation even with FE errors", () => {
  const formScript = load("frontend/src/public/js/page/admin-danh-muc.js");
  const authorScript = load("frontend/src/public/js/page/admin-tac-gia.js");
  assert.match(
    formScript,
    /const valid = validateForm\(form\);[\s\S]*?await ghiDuLieu\(url, method, \{ \.\.\.payload, kiemTra: true \}\);[\s\S]*?if \(!valid\)/,
  );
  assert.match(
    authorScript,
    /const valid = validateForm\(form\);[\s\S]*?await requestWrite\(url, method, \{[\s\S]*?kiemTra: true,[\s\S]*?\}\);[\s\S]*?if \(!valid \|\| !imageValid\)/,
  );

  for (const moduleName of [
    "sach",
    "tac-gia",
    "the-loai",
    "nha-xuat-ban",
    "nha-cung-cap",
    "phien-ban-sach",
    "kho",
    "hoi-vien",
  ]) {
    const service = load(
      `backend/src/modules/${moduleName}/${moduleName}.service.js`,
    );
    assert.match(
      service,
      /body\?\.kiem_tra === true/,
      `${moduleName} has no read-only preflight mode`,
    );
  }
});

test("catalog APIs check duplicate codes and names; warehouse names are scoped to branch", () => {
  const checks = [
    [
      "the-loai/the-loai.repository.js",
      /maTheLoaiDaTonTai/,
      /tenTheLoaiDaTonTai/,
    ],
    [
      "nha-xuat-ban/nha-xuat-ban.repository.js",
      /maNhaXuatBanDaTonTai/,
      /tenNhaXuatBanDaTonTai/,
    ],
    ["nha-cung-cap/nha-cung-cap.repository.js", /trung_ma/, /trung_ten/],
    ["phien-ban-sach/phien-ban-sach.repository.js", /trung_ma/, /trung_ten/],
    ["kho/kho.repository.js", /maKhoDaTonTai/, /tenKhoDaTonTai/],
    ["hoi-vien/hoi-vien.repository.js", /trung_ma/, /trung_ten/],
  ];
  for (const [path, codeCheck, nameCheck] of checks) {
    const repository = load(`backend/src/modules/${path}`);
    assert.match(repository, codeCheck, `${path} has no code duplicate check`);
    assert.match(repository, nameCheck, `${path} has no name duplicate check`);
  }

  const warehouseRepository = load("backend/src/modules/kho/kho.repository.js");
  const migration = load(
    "database/migrations/052_danh-muc-trang-thai-xoa-unique.sql",
  );
  assert.match(warehouseRepository, /chi_nhanh_id = \$2/);
  assert.match(
    migration,
    /ON kho \(don_vi_id, chi_nhanh_id, lower\(btrim\(ten_kho\)\)\)/,
  );
});

test("category preflight can return required and duplicate errors together", () => {
  const error = theLoai.loiNhieuTruong(
    [
      { field: "ma_the_loai", message: "Mã thể loại đã tồn tại" },
      { field: "ten_the_loai", message: "Tên thể loại là bắt buộc" },
    ],
    409,
    "CATEGORY_EXISTS",
  );
  assert.equal(error.status, 409);
  assert.deepEqual(
    error.details.map((item) => item.field),
    ["ma_the_loai", "ten_the_loai"],
  );
});

test("each requested catalog resource has a DELETE API route", () => {
  const routes = [
    "sach/sach.routes.js",
    "tac-gia/tac-gia.routes.js",
    "the-loai/the-loai.routes.js",
    "nha-xuat-ban/nha-xuat-ban.routes.js",
    "nha-cung-cap/nha-cung-cap.routes.js",
    "phien-ban-sach/phien-ban-sach.routes.js",
    "kho/kho.routes.js",
    "hoi-vien/hoi-vien.routes.js",
  ];
  for (const route of routes)
    assert.match(
      load(`backend/src/modules/${route}`),
      /router\.delete\(/,
      `${route} has no DELETE route`,
    );
});
