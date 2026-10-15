const { trongGiaoDich } = require("../../database/transaction.js");
const { AppError } = require("../../common/errors/AppError.js");
const phanQuyenService = require("../phan-quyen/phan-quyen.service.js");
const validation = require("./nha-cung-cap.validation.js");
const { BANG, loi, idHopLe, boLocHopLe } = validation;
const repo = require("./nha-cung-cap.repository.js");
class NhaCungCapService {
  constructor(bang = BANG, repository = repo, validator = validation) {
    this.BANG = bang;
    this.repo = repository;
    this.validation = validator;
  }
  async quyen(auth, ghi = false, client) {
    if (
      !(await phanQuyenService.kiemTraQuyen(
        auth,
        ghi ? "books.create" : "books.read",
        {},
        client,
      ))
    )
      throw loi("Không có quyền quản lý nhà cung cấp", 403, "FORBIDDEN");
  }
  async tonTai(auth, bang, id, client, khoa = false) {
    const row = await this.repo.lay(auth.donViId, bang, id, client, khoa);
    if (!row) throw loi("Không tìm thấy dữ liệu", 404, "NOT_FOUND");
    return row;
  }
  async chaTonTai(auth, bang, chaId, client, khoa = false) {
    if (this.BANG[bang].cha)
      await this.tonTai(auth, this.BANG[bang].cha, chaId, client, khoa);
  }
  xuLyLoi(error) {
    if (error.code === "23505") {
      const laTen = error.constraint === "uq_ncc_ten";
      const field = laTen ? "ten_nha_cung_cap" : "ma_nha_cung_cap";
      const message = laTen
        ? "Tên nhà cung cấp đã tồn tại trong đơn vị"
        : "Mã hoặc dữ liệu duy nhất đã tồn tại";
      throw new AppError({
        code: "DUPLICATE_DATA",
        message,
        status: 409,
        details: [{ field, message }],
      });
    }
    if (error.code === "23503")
      throw loi(
        "Dữ liệu tham chiếu không hợp lệ hoặc đang được sử dụng",
        409,
        "REFERENCE_CONFLICT",
      );
    if (error.code === "23514" && error.constraint === "ck_ncc_ngay_hop_tac") {
      const message =
        "Ngày kết thúc hợp tác không được trước ngày bắt đầu hợp tác";
      throw new AppError({
        code: "INVALID_INPUT",
        message,
        status: 422,
        details: [{ field: "ngay_ket_thuc_hop_tac", message }],
      });
    }
    if (["23502", "23514", "22P02", "22003", "22001"].includes(error.code))
      throw loi("Dữ liệu vi phạm ràng buộc database");
    throw error;
  }
  async kiemTraTrung(auth, bang, duLieu, boQuaId = null, client) {
    if (bang !== "nha_cung_cap") return [];
    const result = await this.repo.kiemTraTrungDinhDanhNhaCungCap(
      auth.donViId,
      duLieu,
      boQuaId,
      client,
    );
    const details = [];
    if (result.trung_ma)
      details.push({
        field: "ma_nha_cung_cap",
        message: "Mã nhà cung cấp đã tồn tại",
      });
    if (result.trung_ma_so_thue)
      details.push({ field: "ma_so_thue", message: "Mã số thuế đã tồn tại" });
    if (result.trung_ten)
      details.push({
        field: "ten_nha_cung_cap",
        message: "Tên nhà cung cấp đã tồn tại",
      });
    return details;
  }
  loiDuLieuVaTrung(details) {
    const unique = [
      ...new Map(
        details.map((item) => [`${item.field}:${item.message}`, item]),
      ).values(),
    ];
    const trung = unique.some((item) => item.message.includes("đã tồn tại"));
    throw new AppError({
      code: trung ? "DUPLICATE_DATA" : "INVALID_INPUT",
      message: unique.map((item) => item.message).join(". "),
      status: trung ? 409 : 422,
      details: unique,
    });
  }
  async danhSach(auth, bang, query, chaId) {
    if (!Object.hasOwn(this.BANG, bang))
      throw loi("Loại dữ liệu không được hỗ trợ", 404, "NOT_FOUND");
    const boLoc = boLocHopLe(query);
    await this.quyen(auth);
    if (chaId != null) chaId = idHopLe(chaId, "Nhà cung cấp");
    await this.chaTonTai(auth, bang, chaId);
    return this.repo.danhSach(auth.donViId, bang, boLoc, { chaId });
  }
  async chiTiet(auth, bang, id, chaId) {
    if (!Object.hasOwn(this.BANG, bang))
      throw loi("Loại dữ liệu không được hỗ trợ", 404, "NOT_FOUND");
    id = idHopLe(id);
    if (chaId != null) chaId = idHopLe(chaId, "Nhà cung cấp");
    await this.quyen(auth);
    await this.chaTonTai(auth, bang, chaId);
    const row = await this.tonTai(auth, bang, id);
    if (this.BANG[bang].khoaCha && row[this.BANG[bang].khoaCha] !== chaId)
      throw loi("Không tìm thấy dữ liệu", 404, "NOT_FOUND");
    if (bang !== "nha_cung_cap") return row;
    const bangCon = Object.keys(this.BANG).filter(
      (ten) => BANG[ten].cha === "nha_cung_cap",
    );
    const chiTiet = await Promise.all(
      bangCon.map(async (ten) => [
        ten,
        (
          await this.repo.danhSach(
            auth.donViId,
            ten,
            { trang: 1, kich_thuoc: 100, tu_khoa: "", trang_thai: null },
            { chaId: id },
          )
        ).danh_sach,
      ]),
    );
    return { ...row, ...Object.fromEntries(chiTiet) };
  }
  async tao(auth, bang, body, requestId, chaId) {
    if (!Object.hasOwn(this.BANG, bang))
      throw loi("Loại dữ liệu không được hỗ trợ", 404, "NOT_FOUND");
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...(body || {}) };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = this.validation.duLieuHopLe(dauVao, { tao: true, bang });
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong = error.details || [];
    }
    if (chaId != null) chaId = idHopLe(chaId, "Nhà cung cấp");
    try {
      return await trongGiaoDich(async (client) => {
        await this.quyen(auth, true, client);
        await this.chaTonTai(auth, bang, chaId, client, true);
        const duLieuKiemTra = { ...duLieu };
        for (const field of [
          "ma_nha_cung_cap",
          "ten_nha_cung_cap",
          "ma_so_thue",
        ]) {
          if (typeof dauVao[field] === "string")
            duLieuKiemTra[field] = dauVao[field].trim() || null;
        }
        loiTruong.push(
          ...(await this.kiemTraTrung(auth, bang, duLieuKiemTra, null, client)),
        );
        if (loiTruong.length) this.loiDuLieuVaTrung(loiTruong);
        if (kiemTra) return { da_kiem_tra: true };
        const row = await this.repo.tao(
          auth.donViId,
          auth.taiKhoanId,
          bang,
          duLieu,
          { chaId },
          client,
        );
        await this.repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            bang,
            id: row.id,
            hanhDong: `${bang}.create`,
            requestId,
          },
          client,
        );
        return row;
      });
    } catch (error) {
      this.xuLyLoi(error);
    }
  }
  async sua(auth, bang, id, body, requestId, chaId) {
    if (!Object.hasOwn(this.BANG, bang))
      throw loi("Loại dữ liệu không được hỗ trợ", 404, "NOT_FOUND");
    id = idHopLe(id);
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...(body || {}) };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = this.validation.duLieuHopLe(dauVao, { bang });
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong = error.details || [];
    }
    if (chaId != null) chaId = idHopLe(chaId, "Nhà cung cấp");
    try {
      return await trongGiaoDich(async (client) => {
        await this.quyen(auth, true, client);
        await this.chaTonTai(auth, bang, chaId, client, true);
        const hienTai = await this.tonTai(auth, bang, id, client, true);
        if (
          this.BANG[bang].khoaCha &&
          hienTai[this.BANG[bang].khoaCha] !== chaId
        )
          throw loi("Không tìm thấy dữ liệu", 404, "NOT_FOUND");
        if (bang === "nha_cung_cap") {
          const ngayBatDau = Object.hasOwn(duLieu, "ngay_bat_dau_hop_tac")
            ? duLieu.ngay_bat_dau_hop_tac
            : hienTai.ngay_bat_dau_hop_tac;
          const ngayKetThuc = Object.hasOwn(duLieu, "ngay_ket_thuc_hop_tac")
            ? duLieu.ngay_ket_thuc_hop_tac
            : hienTai.ngay_ket_thuc_hop_tac;
          if (ngayBatDau && ngayKetThuc && ngayKetThuc < ngayBatDau)
            loiTruong.push({
              field: "ngay_ket_thuc_hop_tac",
              message:
                "Ngày kết thúc hợp tác không được trước ngày bắt đầu hợp tác",
            });
        }
        const duLieuKiemTra = { ...duLieu };
        for (const field of [
          "ma_nha_cung_cap",
          "ten_nha_cung_cap",
          "ma_so_thue",
        ]) {
          if (typeof dauVao[field] === "string")
            duLieuKiemTra[field] = dauVao[field].trim() || null;
        }
        loiTruong.push(
          ...(await this.kiemTraTrung(auth, bang, duLieuKiemTra, id, client)),
        );
        if (loiTruong.length) this.loiDuLieuVaTrung(loiTruong);
        if (kiemTra) return { da_kiem_tra: true };
        const row = await this.repo.sua(
          auth.donViId,
          auth.taiKhoanId,
          bang,
          id,
          duLieu,
          { chaId },
          client,
        );
        await this.repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            bang,
            id,
            hanhDong: `${bang}.update`,
            requestId,
          },
          client,
        );
        return row;
      });
    } catch (error) {
      this.xuLyLoi(error);
    }
  }
  async xoa(auth, bang, id, requestId, chaId) {
    if (!Object.hasOwn(this.BANG, bang))
      throw loi("Loại dữ liệu không được hỗ trợ", 404, "NOT_FOUND");
    id = idHopLe(id);
    if (chaId != null) chaId = idHopLe(chaId, "Nhà cung cấp");
    try {
      return await trongGiaoDich(async (client) => {
        await this.quyen(auth, true, client);
        await this.chaTonTai(auth, bang, chaId, client, true);
        const hienTai = await this.tonTai(auth, bang, id, client, true);
        if (
          this.BANG[bang].khoaCha &&
          hienTai[this.BANG[bang].khoaCha] !== chaId
        )
          throw loi("Không tìm thấy dữ liệu", 404, "NOT_FOUND");
        const row = await this.repo.xoa(
          auth.donViId,
          auth.taiKhoanId,
          bang,
          id,
          { chaId },
          client,
        );
        await this.repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            bang,
            id,
            hanhDong: `${bang}.delete`,
            requestId,
          },
          client,
        );
        return { id: row.id, da_xoa: true };
      });
    } catch (error) {
      this.xuLyLoi(error);
    }
  }
}
module.exports = new NhaCungCapService();
