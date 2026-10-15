const { AppError } = require("../../common/errors/AppError.js");
const { trongGiaoDich } = require("../../database/transaction.js");
const phanQuyenService = require("../phan-quyen/phan-quyen.service.js");
const nhaCungCapService = require("../nha-cung-cap/nha-cung-cap.service.js");
const chiNhanhRepo = require("../chi-nhanh/chi-nhanh.repository.js");
const validation = require("./kho.validation.js");
const repo = require("./kho.repository.js");
class KhoService extends nhaCungCapService.constructor {
  constructor() {
    super(validation.BANG, repo, validation);
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
      throw validation.loi("Không có quyền quản lý kho", 403, "FORBIDDEN");
  }
  xuLyLoi(error) {
    if (error.code === "23505") {
      const laTen = error.constraint === "uq_kho_ten_chi_nhanh";
      const field = laTen ? "ten_kho" : "ma_kho";
      const message = laTen
        ? "Tên kho đã tồn tại trong chi nhánh"
        : "Mã kho đã tồn tại trong đơn vị";
      throw new AppError({
        code: "DUPLICATE_DATA",
        message,
        status: 409,
        details: [{ field, message }],
      });
    }
    if (error.code === "23503") {
      const message = "Chi nhánh hoặc dữ liệu tham chiếu không hợp lệ";
      throw new AppError({
        code: "REFERENCE_CONFLICT",
        message,
        status: 409,
        details: [{ field: "chi_nhanh_id", message }],
      });
    }
    if (error.code === "23514" && error.constraint === "ck_kho_suc_chua") {
      const message = "Diện tích sử dụng không được lớn hơn diện tích";
      throw new AppError({
        code: "INVALID_INPUT",
        message,
        status: 422,
        details: [{ field: "dien_tich_su_dung_m2", message }],
      });
    }
    return super.xuLyLoi(error);
  }
  async tonTai(auth, bang, id, client, khoa = false) {
    const row = await super.tonTai(auth, bang, id, client, khoa);
    if (bang !== "kho") return row;
    const duocXem = await phanQuyenService.kiemTraQuyen(
      auth,
      "books.read",
      { phamVi: "CHI_NHANH", chiNhanhId: row.chi_nhanh_id },
      client,
    );
    if (!duocXem)
      throw validation.loi(
        "Không có quyền truy cập kho thuộc chi nhánh này",
        403,
        "FORBIDDEN",
      );
    return row;
  }
  async danhSach(auth, bang, query, chaId) {
    if (bang !== "kho") return super.danhSach(auth, bang, query, chaId);
    await this.quyen(auth);
    return this.repo.danhSach(
      auth.donViId,
      bang,
      this.validation.boLocHopLe(query),
    );
  }
  async tao(auth, bang, body, requestId, chaId) {
    if (bang !== "kho") return super.tao(auth, bang, body, requestId, chaId);
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...body };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = validation.duLieuKhoHopLe(dauVao, true);
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong = error.details || [];
    }
    if (!kiemTra) {
      const chiNhanhId = validation.idHopLe(duLieu.chi_nhanh_id, "Chi nhánh");
      if (!(await chiNhanhRepo.layChiNhanh(auth.donViId, chiNhanhId))) {
        const message = "Chi nhánh không tồn tại trong đơn vị";
        throw new AppError({
          code: "REFERENCE_CONFLICT",
          message,
          status: 422,
          details: [{ field: "chi_nhanh_id", message }],
        });
      }
      const duocTao = await phanQuyenService.kiemTraQuyen(
        auth,
        "books.create",
        { phamVi: "CHI_NHANH", chiNhanhId },
      );
      if (!duocTao)
        throw validation.loi(
          "Không có quyền tạo kho tại chi nhánh này",
          403,
          "FORBIDDEN",
        );
      return super.tao(auth, bang, dauVao, requestId, chaId);
    }
    return trongGiaoDich(async (client) => {
      await this.quyen(auth, true, client);
      const chiNhanhId = Number(dauVao.chi_nhanh_id);
      if (Number.isSafeInteger(chiNhanhId) && chiNhanhId > 0) {
        const chiNhanh = await chiNhanhRepo.layChiNhanh(
          auth.donViId,
          chiNhanhId,
          client,
        );
        if (!chiNhanh)
          loiTruong.push({
            field: "chi_nhanh_id",
            message: "Chi nhánh không tồn tại trong đơn vị",
          });
        else if (
          !(await phanQuyenService.kiemTraQuyen(
            auth,
            "books.create",
            { phamVi: "CHI_NHANH", chiNhanhId },
            client,
          ))
        )
          throw validation.loi(
            "Không có quyền tạo kho tại chi nhánh này",
            403,
            "FORBIDDEN",
          );
      }
      const maKho =
        typeof dauVao.ma_kho === "string" ? dauVao.ma_kho.trim() : "";
      if (
        maKho &&
        (await repo.maKhoDaTonTai(auth.donViId, maKho, null, client))
      )
        loiTruong.push({
          field: "ma_kho",
          message: "Mã kho đã tồn tại trong đơn vị",
        });
      const tenKho =
        typeof dauVao.ten_kho === "string" ? dauVao.ten_kho.trim() : "";
      if (
        chiNhanhId &&
        tenKho &&
        (await repo.tenKhoDaTonTai(
          auth.donViId,
          chiNhanhId,
          tenKho,
          null,
          client,
        ))
      )
        loiTruong.push({
          field: "ten_kho",
          message: "Tên kho đã tồn tại trong chi nhánh",
        });
      if (loiTruong.length) {
        const duplicate = loiTruong.some((item) =>
          item.message.includes("đã tồn tại"),
        );
        const details = [
          ...new Map(
            loiTruong.map((item) => [`${item.field}:${item.message}`, item]),
          ).values(),
        ];
        throw new AppError({
          code: duplicate ? "DUPLICATE_DATA" : "INVALID_INPUT",
          message: details.map((item) => item.message).join(". "),
          status: duplicate ? 409 : 422,
          details,
        });
      }
      return { da_kiem_tra: true };
    });
  }
  async sua(auth, bang, id, body, requestId, chaId) {
    if (bang !== "kho")
      return super.sua(auth, bang, id, body, requestId, chaId);
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...body };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = validation.duLieuKhoHopLe(dauVao);
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong = error.details || [];
    }
    if (kiemTra) {
      return trongGiaoDich(async (client) => {
        await this.quyen(auth, true, client);
        const hienTai = await this.tonTai(
          auth,
          bang,
          validation.idHopLe(id, "Kho"),
          client,
        );
        const dienTich = Object.hasOwn(duLieu, "dien_tich_m2")
          ? duLieu.dien_tich_m2
          : hienTai.dien_tich_m2;
        const dienTichSuDung = Object.hasOwn(duLieu, "dien_tich_su_dung_m2")
          ? duLieu.dien_tich_su_dung_m2
          : hienTai.dien_tich_su_dung_m2;
        if (
          dienTich != null &&
          dienTichSuDung != null &&
          Number(dienTichSuDung) > Number(dienTich)
        )
          loiTruong.push({
            field: "dien_tich_su_dung_m2",
            message: "Diện tích sử dụng không được lớn hơn diện tích",
          });
        const maKho =
          typeof duLieu.ma_kho === "string"
            ? duLieu.ma_kho.trim()
            : typeof dauVao.ma_kho === "string"
              ? dauVao.ma_kho.trim()
              : "";
        if (
          maKho &&
          (await repo.maKhoDaTonTai(auth.donViId, maKho, Number(id), client))
        ) {
          loiTruong.push({
            field: "ma_kho",
            message: "Mã kho đã tồn tại trong đơn vị",
          });
        }
        const tenKho =
          typeof duLieu.ten_kho === "string"
            ? duLieu.ten_kho.trim()
            : typeof dauVao.ten_kho === "string"
              ? dauVao.ten_kho.trim()
              : "";
        if (
          tenKho &&
          (await repo.tenKhoDaTonTai(
            auth.donViId,
            hienTai.chi_nhanh_id,
            tenKho,
            Number(id),
            client,
          ))
        )
          loiTruong.push({
            field: "ten_kho",
            message: "Tên kho đã tồn tại trong chi nhánh",
          });
        if (loiTruong.length) {
          const details = [
            ...new Map(
              loiTruong.map((item) => [`${item.field}:${item.message}`, item]),
            ).values(),
          ];
          const duplicate = details.some((item) =>
            item.message.includes("đã tồn tại"),
          );
          throw new AppError({
            code: duplicate ? "DUPLICATE_DATA" : "INVALID_INPUT",
            message: details.map((item) => item.message).join(". "),
            status: duplicate ? 409 : 422,
            details,
          });
        }
        return { da_kiem_tra: true };
      });
    }
    return super.sua(auth, bang, id, dauVao, requestId, chaId);
  }
}
module.exports = new KhoService();
