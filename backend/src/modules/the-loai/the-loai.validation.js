const { AppError } = require("../../common/errors/AppError.js");
const MAX_ID = 2147483647;
const TRANG_THAI = ["DANG_DUNG", "TAM_AN", "NGUNG_DUNG"];
function loiDuLieu(message) {
  return new AppError({ code: "INVALID_INPUT", message, status: 422 });
}
function loiNhieuTruong(details, status = 422, code = "INVALID_INPUT") {
  const unique = [
    ...new Map(
      details.map((item) => [`${item.field}:${item.message}`, item]),
    ).values(),
  ];
  return new AppError({
    code,
    message: unique.map((item) => item.message).join(". "),
    status,
    details: unique,
  });
}
function kiemTraTruong(body, cacTruong) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw loiDuLieu("Dữ liệu không hợp lệ");
  if (Object.keys(body).some((ten) => !cacTruong.includes(ten)))
    throw loiDuLieu("Dữ liệu có trường không được phép");
}
function chuoiHopLe(value, ten, min, max) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw loiDuLieu(`${ten} không hợp lệ`);
  return value.trim();
}
function idHopLe(value, ten = "ID") {
  const dungDinhDang =
    typeof value === "number"
      ? Number.isInteger(value)
      : typeof value === "string" && /^[1-9]\d*$/.test(value);
  const id = Number(value);
  if (!dungDinhDang || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID)
    throw loiDuLieu(`${ten} không hợp lệ`);
  return id;
}
function soNguyenHopLe(value, ten, min, max) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw loiDuLieu(`${ten} không hợp lệ`);
  return value;
}
function booleanHopLe(value, ten) {
  if (typeof value !== "boolean") throw loiDuLieu(`${ten} phải là boolean`);
  return value;
}
function theLoaiMoiHopLe(body) {
  kiemTraTruong(body, [
    "ma_the_loai",
    "ten_the_loai",
    "ten_tieng_anh",
    "the_loai_cha_id",
    "mo_ta",
    "duong_dan",
    "thu_tu",
    "anh_dai_dien_tep_id",
    "icon_tep_id",
    "hien_thi_menu",
    "hien_thi_trang_chu",
  ]);
  const errors = [];
  const result = {};
  const required = [
    ["ma_the_loai", "Mã thể loại"],
    ["ten_the_loai", "Tên thể loại"],
  ];
  for (const [field, label] of required) {
    if (
      !Object.hasOwn(body, field) ||
      body[field] == null ||
      (typeof body[field] === "string" && !body[field].trim())
    )
      errors.push({ field, message: `${label} là bắt buộc` });
  }
  const validate = (field, callback) => {
    try {
      result[field] = callback();
    } catch (error) {
      errors.push({ field, message: error.message || `${field} không hợp lệ` });
    }
  };
  if (body.ma_the_loai != null && String(body.ma_the_loai).trim())
    validate("ma_the_loai", () => {
      const value = chuoiHopLe(
        body.ma_the_loai,
        "Mã thể loại",
        2,
        50,
      ).toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(value))
        throw loiDuLieu(
          "Mã thể loại chỉ được chứa chữ hoa, số, dấu gạch dưới và gạch ngang",
        );
      return value;
    });
  if (body.ten_the_loai != null && String(body.ten_the_loai).trim())
    validate("ten_the_loai", () =>
      chuoiHopLe(body.ten_the_loai, "Tên thể loại", 1, 200),
    );
  for (const [field, callback] of [
    [
      "ten_tieng_anh",
      () => chuoiHopLe(body.ten_tieng_anh, "Tên tiếng Anh", 1, 200),
    ],
    ["the_loai_cha_id", () => idHopLe(body.the_loai_cha_id, "Thể loại cha")],
    ["mo_ta", () => chuoiHopLe(body.mo_ta, "Mô tả", 1, 20000)],
    [
      "duong_dan",
      () => chuoiHopLe(body.duong_dan, "Đường dẫn", 1, 240).toLowerCase(),
    ],
    ["thu_tu", () => soNguyenHopLe(body.thu_tu, "Thứ tự", 0, MAX_ID)],
    [
      "anh_dai_dien_tep_id",
      () => idHopLe(body.anh_dai_dien_tep_id, "Ảnh đại diện"),
    ],
    ["icon_tep_id", () => idHopLe(body.icon_tep_id, "Icon")],
    ["hien_thi_menu", () => booleanHopLe(body.hien_thi_menu, "Hiển thị menu")],
    [
      "hien_thi_trang_chu",
      () => booleanHopLe(body.hien_thi_trang_chu, "Hiển thị trang chủ"),
    ],
  ]) {
    if (!Object.hasOwn(body, field)) continue;
    if (
      body[field] == null &&
      !["thu_tu", "hien_thi_menu", "hien_thi_trang_chu"].includes(field)
    ) {
      result[field] = null;
      continue;
    }
    validate(field, callback);
  }
  result.thu_tu ??= 0;
  result.hien_thi_menu ??= true;
  result.hien_thi_trang_chu ??= false;
  if (errors.length) throw loiNhieuTruong(errors);
  return result;
}
function suaTheLoaiHopLe(body) {
  kiemTraTruong(body, [
    "ma_the_loai",
    "ten_the_loai",
    "ten_tieng_anh",
    "the_loai_cha_id",
    "mo_ta",
    "duong_dan",
    "thu_tu",
    "anh_dai_dien_tep_id",
    "icon_tep_id",
    "hien_thi_menu",
    "hien_thi_trang_chu",
  ]);
  if (!Object.keys(body).length)
    throw loiNhieuTruong([
      { field: "ten_the_loai", message: "Không có dữ liệu cập nhật" },
    ]);
  const errors = [];
  const result = {};
  const validate = (field, callback) => {
    try {
      result[field] = callback();
    } catch (error) {
      errors.push({ field, message: error.message || `${field} không hợp lệ` });
    }
  };
  const fields = {
    ma_the_loai: () => {
      const value = chuoiHopLe(body.ma_the_loai, "Mã thể loại", 2, 50).toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(value))
        throw loiDuLieu(
          "Mã thể loại chỉ được chứa chữ hoa, số, dấu gạch dưới và gạch ngang",
        );
      return value;
    },
    ten_the_loai: () => chuoiHopLe(body.ten_the_loai, "Tên thể loại", 1, 200),
    ten_tieng_anh: () =>
      chuoiHopLe(body.ten_tieng_anh, "Tên tiếng Anh", 1, 200),
    the_loai_cha_id: () => idHopLe(body.the_loai_cha_id, "Thể loại cha"),
    mo_ta: () => chuoiHopLe(body.mo_ta, "Mô tả", 1, 20000),
    duong_dan: () =>
      chuoiHopLe(body.duong_dan, "Đường dẫn", 1, 240).toLowerCase(),
    thu_tu: () => soNguyenHopLe(body.thu_tu, "Thứ tự", 0, MAX_ID),
    anh_dai_dien_tep_id: () =>
      idHopLe(body.anh_dai_dien_tep_id, "Ảnh đại diện"),
    icon_tep_id: () => idHopLe(body.icon_tep_id, "Icon"),
    hien_thi_menu: () => booleanHopLe(body.hien_thi_menu, "Hiển thị menu"),
    hien_thi_trang_chu: () =>
      booleanHopLe(body.hien_thi_trang_chu, "Hiển thị trang chủ"),
  };
  for (const [field, callback] of Object.entries(fields)) {
    if (!Object.hasOwn(body, field)) continue;
    if (
      body[field] == null &&
      !["thu_tu", "hien_thi_menu", "hien_thi_trang_chu"].includes(field)
    )
      result[field] = null;
    else validate(field, callback);
  }
  if (errors.length) throw loiNhieuTruong(errors);
  return result;
}
function trangThaiHopLe(body) {
  kiemTraTruong(body, ["trang_thai"]);
  if (!TRANG_THAI.includes(body.trang_thai))
    throw loiDuLieu("Trạng thái thể loại không hợp lệ");
  return body.trang_thai;
}
function boLocHopLe(query = {}) {
  kiemTraTruong(query, [
    "trang",
    "kich_thuoc",
    "tu_khoa",
    "trang_thai",
    "the_loai_cha_id",
  ]);
  const trang = query.trang == null ? 1 : idHopLe(query.trang, "Trang");
  const kich_thuoc =
    query.kich_thuoc == null
      ? 20
      : idHopLe(query.kich_thuoc, "Kích thước trang");
  if (kich_thuoc > 100 || (trang - 1) * kich_thuoc > MAX_ID)
    throw loiDuLieu("Phân trang không hợp lệ");
  const trang_thai =
    query.trang_thai == null
      ? null
      : trangThaiHopLe({ trang_thai: query.trang_thai });
  return {
    trang,
    kich_thuoc,
    tu_khoa:
      query.tu_khoa == null ? "" : chuoiHopLe(query.tu_khoa, "Từ khóa", 1, 120),
    trang_thai,
    the_loai_cha_id:
      query.the_loai_cha_id == null
        ? null
        : idHopLe(query.the_loai_cha_id, "Thể loại cha"),
  };
}
module.exports = {
  idHopLe,
  loiNhieuTruong,
  theLoaiMoiHopLe,
  suaTheLoaiHopLe,
  trangThaiHopLe,
  boLocHopLe,
};
