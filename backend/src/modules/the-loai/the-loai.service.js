const { AppError } = require("../../common/errors/AppError.js");
const { query } = require("../../database/query.js");
const { trongGiaoDich } = require("../../database/transaction.js");
const phanQuyenService = require("../phan-quyen/phan-quyen.service.js");
const {
  idHopLe,
  loiNhieuTruong,
  theLoaiMoiHopLe,
  suaTheLoaiHopLe,
  trangThaiHopLe,
  boLocHopLe,
} = require("./the-loai.validation.js");
const repo = require("./the-loai.repository.js");
class TheLoaiService {
  loi(message, status = 422, code = "INVALID_INPUT") {
    return new AppError({ code, message, status });
  }
  async yeuCauQuyen(auth, maQuyen, client) {
    if (!(await phanQuyenService.kiemTraQuyen(auth, maQuyen, {}, client)))
      throw this.loi("Không có quyền quản lý thể loại sách", 403, "FORBIDDEN");
  }
  async theLoaiTonTai(donViId, theLoaiId, client, khoa = false) {
    const theLoai = await repo.layTheLoai(donViId, theLoaiId, client, khoa);
    if (!theLoai)
      throw this.loi("Không tìm thấy thể loại sách", 404, "NOT_FOUND");
    return theLoai;
  }
  async kiemTraTep(donViId, duLieu, client) {
    const errors = [];
    for (const ten of ["anh_dai_dien_tep_id", "icon_tep_id"]) {
      if (duLieu[ten] && !(await repo.tepTonTai(donViId, duLieu[ten], client)))
        errors.push({
          field: ten,
          message: `${ten} không tồn tại trong đơn vị`,
        });
    }
    return errors;
  }
  xuLyLoiDb(error) {
    if (error.code === "23505") {
      const field =
        error.constraint === "uq_the_loai_slug"
          ? "duong_dan"
          : error.constraint === "uq_the_loai_ten"
            ? "ten_the_loai"
            : "ma_the_loai";
      const label =
        field === "duong_dan"
          ? "Đường dẫn"
          : field === "ten_the_loai"
            ? "Tên thể loại"
            : "Mã thể loại";
      throw loiNhieuTruong(
        [{ field, message: `${label} đã tồn tại trong đơn vị` }],
        409,
        "CATEGORY_EXISTS",
      );
    }
    if (error.code === "23503")
      throw this.loi(
        "Thể loại đang được sử dụng hoặc dữ liệu tham chiếu không hợp lệ",
        409,
        "CATEGORY_IN_USE",
      );
    if (error.code === "23514" || error.code === "22003")
      throw this.loi("Dữ liệu thể loại vi phạm ràng buộc");
    throw error;
  }
  async danhSach(auth, queryString) {
    const boLoc = boLocHopLe(queryString);
    await this.yeuCauQuyen(auth, "books.read");
    return repo.danhSach(auth.donViId, boLoc);
  }
  async chiTiet(auth, theLoaiId) {
    theLoaiId = idHopLe(theLoaiId, "Thể loại");
    await this.yeuCauQuyen(auth, "books.read");
    const theLoai = await this.theLoaiTonTai(auth.donViId, theLoaiId);
    const nhanh = await repo.nhanhTheLoai(auth.donViId, theLoaiId);
    return { ...theLoai, so_the_loai_con: nhanh.length - 1 };
  }
  async cayTheLoai(auth) {
    await this.yeuCauQuyen(auth, "books.read");
    const rows = await repo.cayTheLoai(auth.donViId);
    const map = new Map(
      rows.map((item) => [item.id, { ...item, the_loai_con: [] }]),
    );
    const goc = [];
    for (const item of map.values()) {
      if (item.the_loai_cha_id != null && map.has(item.the_loai_cha_id))
        map.get(item.the_loai_cha_id).the_loai_con.push(item);
      else goc.push(item);
    }
    return { the_loai: goc, tong_so: rows.length };
  }
  async taoTheLoai(auth, body, requestId) {
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...body };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = theLoaiMoiHopLe(dauVao);
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong = error.details || [];
    }
    let ketQua;
    try {
      ketQua = await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        await query(
          "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
          [1616, auth.donViId],
          client,
        );
        const ma =
          typeof dauVao.ma_the_loai === "string"
            ? dauVao.ma_the_loai.trim().toUpperCase()
            : "";
        const duongDan =
          typeof dauVao.duong_dan === "string"
            ? dauVao.duong_dan.trim().toLowerCase()
            : "";
        if (
          ma &&
          (await repo.maTheLoaiDaTonTai(auth.donViId, ma, null, client))
        )
          loiTruong.push({
            field: "ma_the_loai",
            message: "Mã thể loại đã tồn tại trong đơn vị",
          });
        const ten =
          typeof dauVao.ten_the_loai === "string" ? dauVao.ten_the_loai.trim() : "";
        if (
          ten &&
          (await repo.tenTheLoaiDaTonTai(auth.donViId, ten, null, client))
        )
          loiTruong.push({
            field: "ten_the_loai",
            message: "Tên thể loại đã tồn tại trong đơn vị",
          });
        if (
          duongDan &&
          (await repo.duongDanDaTonTai(auth.donViId, duongDan, null, client))
        )
          loiTruong.push({
            field: "duong_dan",
            message: "Đường dẫn đã được sử dụng",
          });
        const ids = {};
        for (const field of [
          "the_loai_cha_id",
          "anh_dai_dien_tep_id",
          "icon_tep_id",
        ]) {
          const value = duLieu[field] ?? dauVao[field];
          if (value == null || value === "") continue;
          try {
            ids[field] = idHopLe(value, field);
          } catch {
            continue;
          }
        }
        if (
          ids.the_loai_cha_id &&
          !(await repo.layTheLoai(auth.donViId, ids.the_loai_cha_id, client))
        )
          loiTruong.push({
            field: "the_loai_cha_id",
            message: "Thể loại cha không tồn tại trong đơn vị",
          });
        for (const field of ["anh_dai_dien_tep_id", "icon_tep_id"]) {
          if (
            ids[field] &&
            !(await repo.tepTonTai(auth.donViId, ids[field], client))
          )
            loiTruong.push({
              field,
              message: `${field} không tồn tại trong đơn vị`,
            });
        }
        if (loiTruong.length) {
          const unique = [
            ...new Map(
              loiTruong.map((item) => [`${item.field}:${item.message}`, item]),
            ).values(),
          ];
          const duplicate = unique.some(
            (item) =>
              item.message.includes("đã tồn tại") ||
              item.message.includes("đã được sử dụng"),
          );
          throw loiNhieuTruong(
            unique,
            duplicate ? 409 : 422,
            duplicate ? "CATEGORY_EXISTS" : "INVALID_INPUT",
          );
        }
        if (kiemTra) return { da_kiem_tra: true };
        let capDo = 1;
        if (duLieu.the_loai_cha_id) {
          const cha = await this.theLoaiTonTai(
            auth.donViId,
            duLieu.the_loai_cha_id,
            client,
          );
          capDo = cha.cap_do + 1;
        }
        if (capDo > 32767) throw this.loi("Cấp độ thể loại vượt giới hạn");
        const theLoai = await repo.taoTheLoai(
          auth.donViId,
          auth.taiKhoanId,
          duLieu,
          capDo,
          client,
        );
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongId: theLoai.id,
            hanhDong: "books.category.create",
            requestId,
          },
          client,
        );
        return theLoai;
      });
    } catch (error) {
      this.xuLyLoiDb(error);
    }
    return ketQua;
  }
  async suaTheLoai(auth, theLoaiId, body, requestId) {
    theLoaiId = idHopLe(theLoaiId, "Thể loại");
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...body };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = suaTheLoaiHopLe(dauVao);
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong = error.details || [];
    }
    let ketQua;
    try {
      ketQua = await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        await query(
          "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
          [1616, auth.donViId],
          client,
        );
        const hienTai = await this.theLoaiTonTai(
          auth.donViId,
          theLoaiId,
          client,
          true,
        );
        if (kiemTra) {
          const ma =
            typeof dauVao.ma_the_loai === "string"
              ? dauVao.ma_the_loai.trim().toUpperCase()
              : "";
          if (
            ma &&
            (await repo.maTheLoaiDaTonTai(
              auth.donViId,
              ma,
              theLoaiId,
              client,
            ))
          )
            loiTruong.push({
              field: "ma_the_loai",
              message: "Mã thể loại đã tồn tại trong đơn vị",
            });
          const ten =
            typeof dauVao.ten_the_loai === "string"
              ? dauVao.ten_the_loai.trim()
              : "";
          if (
            ten &&
            (await repo.tenTheLoaiDaTonTai(
              auth.donViId,
              ten,
              theLoaiId,
              client,
            ))
          )
            loiTruong.push({
              field: "ten_the_loai",
              message: "Tên thể loại đã tồn tại trong đơn vị",
            });
          const duongDan =
            typeof dauVao.duong_dan === "string"
              ? dauVao.duong_dan.trim().toLowerCase()
              : "";
          if (
            duongDan &&
            (await repo.duongDanDaTonTai(
              auth.donViId,
              duongDan,
              theLoaiId,
              client,
            ))
          )
            loiTruong.push({
              field: "duong_dan",
              message: "Đường dẫn đã được sử dụng",
            });
          const ids = {};
          for (const field of [
            "the_loai_cha_id",
            "anh_dai_dien_tep_id",
            "icon_tep_id",
          ]) {
            const value = duLieu[field] ?? dauVao[field];
            if (value == null || value === "") continue;
            try {
              ids[field] = idHopLe(value, field);
            } catch {
              continue;
            }
          }
          if (
            ids.the_loai_cha_id &&
            !(await repo.layTheLoai(auth.donViId, ids.the_loai_cha_id, client))
          )
            loiTruong.push({
              field: "the_loai_cha_id",
              message: "Thể loại cha không tồn tại trong đơn vị",
            });
          for (const field of ["anh_dai_dien_tep_id", "icon_tep_id"]) {
            if (
              ids[field] &&
              !(await repo.tepTonTai(auth.donViId, ids[field], client))
            )
              loiTruong.push({
                field,
                message: `${field} không tồn tại trong đơn vị`,
              });
          }
          if ("the_loai_cha_id" in ids && ids.the_loai_cha_id != null) {
            const nhanh = await repo.nhanhTheLoai(
              auth.donViId,
              theLoaiId,
              client,
            );
            if (
              ids.the_loai_cha_id === theLoaiId ||
              nhanh.some((item) => item.id === ids.the_loai_cha_id)
            )
              loiTruong.push({
                field: "the_loai_cha_id",
                message:
                  "Không thể chuyển thể loại vào chính nó hoặc nhánh con",
              });
          }
          if (loiTruong.length) {
            const unique = [
              ...new Map(
                loiTruong.map((item) => [
                  `${item.field}:${item.message}`,
                  item,
                ]),
              ).values(),
            ];
            const duplicate = unique.some(
              (item) =>
                item.message.includes("đã tồn tại") ||
                item.message.includes("đã được sử dụng"),
            );
            throw loiNhieuTruong(
              unique,
              duplicate ? 409 : 422,
              duplicate ? "CATEGORY_EXISTS" : "INVALID_INPUT",
            );
          }
          return { da_kiem_tra: true };
        }
        const tepErrors = await this.kiemTraTep(auth.donViId, duLieu, client);
        if (tepErrors.length) throw loiNhieuTruong(tepErrors);
        if (
          "the_loai_cha_id" in duLieu &&
          duLieu.the_loai_cha_id !== hienTai.the_loai_cha_id
        ) {
          const nhanh = await repo.nhanhTheLoai(
            auth.donViId,
            theLoaiId,
            client,
          );
          if (
            duLieu.the_loai_cha_id === theLoaiId ||
            nhanh.some((item) => item.id === duLieu.the_loai_cha_id)
          )
            throw this.loi(
              "Không thể chuyển thể loại vào chính nó hoặc nhánh con",
            );
          let capDoMoi = 1;
          if (duLieu.the_loai_cha_id !== null) {
            const cha = await this.theLoaiTonTai(
              auth.donViId,
              duLieu.the_loai_cha_id,
              client,
            );
            capDoMoi = cha.cap_do + 1;
          }
          const doLech = capDoMoi - hienTai.cap_do;
          if (
            nhanh.some(
              (item) =>
                item.cap_do + doLech < 1 || item.cap_do + doLech > 32767,
            )
          )
            throw this.loi("Cấp độ thể loại vượt giới hạn");
          if (doLech !== 0)
            await repo.capNhatCapDoNhanh(
              auth.donViId,
              nhanh.map((item) => item.id),
              doLech,
              auth.taiKhoanId,
              client,
            );
        }
        const theLoai = await repo.suaTheLoai(
          auth.donViId,
          theLoaiId,
          auth.taiKhoanId,
          duLieu,
          client,
        );
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongId: theLoaiId,
            hanhDong: "books.category.update",
            requestId,
          },
          client,
        );
        return theLoai;
      });
    } catch (error) {
      this.xuLyLoiDb(error);
    }
    return ketQua;
  }
  async doiTrangThai(auth, theLoaiId, body, requestId) {
    theLoaiId = idHopLe(theLoaiId, "Thể loại");
    const trangThai = trangThaiHopLe(body);
    return trongGiaoDich(async (client) => {
      await this.yeuCauQuyen(auth, "books.create", client);
      await this.theLoaiTonTai(auth.donViId, theLoaiId, client, true);
      const theLoai = await repo.doiTrangThai(
        auth.donViId,
        theLoaiId,
        auth.taiKhoanId,
        trangThai,
        client,
      );
      await repo.ghiNhatKy(
        {
          donViId: auth.donViId,
          actorId: auth.taiKhoanId,
          doiTuongId: theLoaiId,
          hanhDong: "books.category.status.update",
          requestId,
        },
        client,
      );
      return theLoai;
    });
  }
  async xoaTheLoai(auth, theLoaiId, requestId) {
    theLoaiId = idHopLe(theLoaiId, "Thể loại");
    try {
      return await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        await query(
          "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
          [1616, auth.donViId],
          client,
        );
        await this.theLoaiTonTai(auth.donViId, theLoaiId, client, true);
        const nhanh = await repo.nhanhTheLoai(auth.donViId, theLoaiId, client);
        if (nhanh.length > 1)
          throw this.loi(
            "Không thể xóa thể loại đang có thể loại con",
            409,
            "CATEGORY_HAS_CHILDREN",
          );
        const ketQua = await repo.xoaTheLoai(auth.donViId, theLoaiId, client);
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongId: theLoaiId,
            hanhDong: "books.category.delete",
            requestId,
          },
          client,
        );
        return ketQua;
      });
    } catch (error) {
      this.xuLyLoiDb(error);
    }
  }
}
module.exports = new TheLoaiService();
