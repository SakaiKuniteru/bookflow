const { AppError } = require("../../common/errors/AppError.js");
const MAX_ID = 2147483647;
const BANG = Object.freeze({
  nha_cung_cap: {
    cha: null,
    khoaCha: null,
    ma: "ma_nha_cung_cap",
    ten: "ten_nha_cung_cap",
    xoaMem: true,
  },
  dia_chi_nha_cung_cap: {
    cha: "nha_cung_cap",
    khoaCha: "nha_cung_cap_id",
    ma: "ma_dia_chi",
  },
  lien_he_nha_cung_cap: { cha: "nha_cung_cap", khoaCha: "nha_cung_cap_id" },
  tai_khoan_ngan_hang_nha_cung_cap: {
    cha: "nha_cung_cap",
    khoaCha: "nha_cung_cap_id",
  },
  hop_dong_nha_cung_cap: {
    cha: "nha_cung_cap",
    khoaCha: "nha_cung_cap_id",
    ma: "so_hop_dong",
  },
  nha_cung_cap_phien_ban_sach: {
    cha: "nha_cung_cap",
    khoaCha: "nha_cung_cap_id",
  },
});
function loi(message, status = 422, code = "INVALID_INPUT") {
  return new AppError({ code, message, status });
}
const NHAN_TRUONG = Object.freeze({
  ma_nha_cung_cap: "Mã nhà cung cấp",
  ten_nha_cung_cap: "Tên nhà cung cấp",
  so_dien_thoai: "Số điện thoại",
  so_dien_thoai_phu: "Số điện thoại phụ",
  ngay_bat_dau_hop_tac: "Ngày bắt đầu hợp tác",
  ngay_ket_thuc_hop_tac: "Ngày kết thúc hợp tác",
});
function loiNhieuTruong(details, code = "INVALID_INPUT", status = 422) {
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
function chuanHoaSoDienThoai(value, field) {
  const text = value.trim();
  if (!text) return text;
  if (!/^\+?[0-9][0-9\s().-]*$/.test(text))
    throw new Error(
      `${NHAN_TRUONG[field] || "Số điện thoại"} chỉ được chứa chữ số, khoảng trắng, dấu ngoặc, dấu chấm hoặc dấu gạch ngang; dấu + chỉ được đặt ở đầu.`,
    );
  const normalized = text.replace(/[\s().-]/g, "");
  const digits = normalized.replace(/^\+/, "");
  if (digits.length < 6 || digits.length > 29)
    throw new Error(
      `${NHAN_TRUONG[field] || "Số điện thoại"} phải có từ 6 đến 29 chữ số.`,
    );
  return normalized;
}
function ngayHopLe(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
function idHopLe(value, ten = "ID") {
  const dung =
    typeof value === "number"
      ? Number.isInteger(value)
      : typeof value === "string" && /^[1-9]\d*$/.test(value);
  const id = Number(value);
  if (!dung || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID)
    throw loi(`${ten} không hợp lệ`);
  return id;
}
function bangHopLe(value) {
  if (!Object.hasOwn(BANG, value))
    throw loi("Loại dữ liệu không được hỗ trợ", 404, "NOT_FOUND");
  return BANG[value];
}
function duLieuHopLe(body, { tao = false, bang = "nha_cung_cap" } = {}) {
  const cauHinh = bangHopLe(bang);
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw loi("Dữ liệu phải là object");
  if (!Object.keys(body).length) throw loi("Không có dữ liệu");
  const cam = new Set([
    "id",
    "don_vi_id",
    "ngay_tao",
    "ngay_cap_nhat",
    "nguoi_tao_id",
    "nguoi_cap_nhat_id",
    "ngay_xoa",
    "so_luong_thuc_te",
    "so_luong_kha_dung",
  ]);
  if (cauHinh.khoaCha) cam.add(cauHinh.khoaCha);
  const duLieu = {};
  const loiTruong = [];
  for (const [ten, value] of Object.entries(body)) {
    if (!/^[a-z][a-z0-9_]*$/.test(ten) || cam.has(ten))
      throw loi(`Không được ghi trường ${ten}`);
    try {
      if (typeof value === "string") {
        let chuoi = value.trim();
        if (chuoi.length > 20000)
          throw new Error(
            `${NHAN_TRUONG[ten] || ten} vượt quá độ dài cho phép`,
          );
        if (["so_dien_thoai", "so_dien_thoai_phu"].includes(ten))
          chuoi = chuanHoaSoDienThoai(chuoi, ten);
        if (
          ["ngay_bat_dau_hop_tac", "ngay_ket_thuc_hop_tac"].includes(ten) &&
          chuoi &&
          !ngayHopLe(chuoi)
        )
          throw new Error(`${NHAN_TRUONG[ten]} không hợp lệ`);
        duLieu[ten] = chuoi;
      } else if (
        value === null ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
      )
        duLieu[ten] = value;
      else if (ten === "lich_lam_viec" || ten === "thong_so_ky_thuat")
        duLieu[ten] = value;
      else throw new Error(`${NHAN_TRUONG[ten] || ten} không hợp lệ`);
    } catch (error) {
      loiTruong.push({
        field: ten,
        message: error.message || `${NHAN_TRUONG[ten] || ten} không hợp lệ`,
      });
    }
  }
  const batBuoc = tao
    ? [cauHinh.ma, cauHinh.ten].filter(Boolean)
    : [cauHinh.ma, cauHinh.ten].filter(
        (ten) => ten && Object.hasOwn(body, ten),
      );
  const nhan = {
    ma_nha_cung_cap: "Mã nhà cung cấp",
    ten_nha_cung_cap: "Tên nhà cung cấp",
  };
  loiTruong.push(
    ...batBuoc
      .filter((ten) => !duLieu[ten])
      .map((ten) => ({
        field: ten,
        message: `${nhan[ten] || ten} là bắt buộc`,
      })),
  );
  if (duLieu.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(duLieu.email))
    loiTruong.push({ field: "email", message: "Email không hợp lệ" });
  if (bang === "nha_cung_cap") {
    const start = Object.hasOwn(body, "ngay_bat_dau_hop_tac")
      ? duLieu.ngay_bat_dau_hop_tac
      : null;
    const end = Object.hasOwn(body, "ngay_ket_thuc_hop_tac")
      ? duLieu.ngay_ket_thuc_hop_tac
      : null;
    if (start && end && ngayHopLe(start) && ngayHopLe(end) && end < start)
      loiTruong.push({
        field: "ngay_ket_thuc_hop_tac",
        message: "Ngày kết thúc hợp tác không được trước ngày bắt đầu hợp tác",
      });
  }
  if (loiTruong.length) throw loiNhieuTruong(loiTruong);
  return duLieu;
}
function boLocHopLe(query = {}) {
  const trang = query.trang == null ? 1 : idHopLe(query.trang, "Trang");
  const kichThuoc =
    query.kich_thuoc == null
      ? 20
      : idHopLe(query.kich_thuoc, "Kích thước trang");
  if (kichThuoc > 100 || (trang - 1) * kichThuoc > MAX_ID)
    throw loi("Phân trang không hợp lệ");
  const tuKhoa = query.tu_khoa == null ? "" : String(query.tu_khoa).trim();
  if (tuKhoa.length > 120) throw loi("Từ khóa quá dài");
  return {
    trang,
    kich_thuoc: kichThuoc,
    tu_khoa: tuKhoa,
    trang_thai: query.trang_thai || null,
  };
}
module.exports = {
  BANG,
  loi,
  idHopLe,
  bangHopLe,
  duLieuHopLe,
  boLocHopLe,
  chuanHoaSoDienThoai,
};
