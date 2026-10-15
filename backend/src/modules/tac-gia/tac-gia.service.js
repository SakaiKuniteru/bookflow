const { AppError } = require("../../common/errors/AppError.js");
const { trongGiaoDich } = require("../../database/transaction.js");
const phanQuyenService = require("../phan-quyen/phan-quyen.service.js");
const {
  idHopLe,
  loiNhieuTruong,
  tacGiaMoiHopLe,
  suaTacGiaHopLe,
  trangThaiHopLe,
  tenKhacMoiHopLe,
  suaTenKhacHopLe,
  boLocHopLe,
} = require("./tac-gia.validation.js");
const repo = require("./tac-gia.repository.js");
class TacGiaService {
  boKhoaDiaChiTinhXa(tacGia) {
    if (!tacGia) return tacGia;
    const ketQua = { ...tacGia };
    for (const field of [
      "ma_tinh_thanh_xuat_than",
      "tinh_thanh_xuat_than",
      "ma_phuong_xa_xuat_than",
      "phuong_xa_xuat_than",
    ])
      delete ketQua[field];
    return ketQua;
  }
  loi(message, status = 422, code = "INVALID_INPUT") {
    return new AppError({ code, message, status });
  }
  async yeuCauQuyen(auth, maQuyen, client) {
    if (!(await phanQuyenService.kiemTraQuyen(auth, maQuyen, {}, client)))
      throw this.loi("Không có quyền quản lý tác giả", 403, "FORBIDDEN");
  }
  async tacGiaTonTai(donViId, tacGiaId, client, khoa = false) {
    const tacGia = await repo.layTacGia(donViId, tacGiaId, client, khoa);
    if (!tacGia) throw this.loi("Không tìm thấy tác giả", 404, "NOT_FOUND");
    return tacGia;
  }
  async tenKhacTonTai(donViId, tacGiaId, tenKhacId, client, khoa = false) {
    const tenKhac = await repo.layTenKhac(
      donViId,
      tacGiaId,
      tenKhacId,
      client,
      khoa,
    );
    if (!tenKhac)
      throw this.loi("Không tìm thấy tên khác của tác giả", 404, "NOT_FOUND");
    return tenKhac;
  }
  kiemTraNgayThang(duLieu) {
    const errors = [];
    const ngaySinh =
      duLieu.ngay_sinh == null ? null : String(duLieu.ngay_sinh).slice(0, 10);
    const ngayMat =
      duLieu.ngay_mat == null ? null : String(duLieu.ngay_mat).slice(0, 10);
    if (
      ngaySinh &&
      duLieu.nam_sinh != null &&
      Number(ngaySinh.slice(0, 4)) !== duLieu.nam_sinh
    )
      errors.push({
        field: "nam_sinh",
        message: "Năm sinh không khớp ngày sinh",
      });
    if (
      ngayMat &&
      duLieu.nam_mat != null &&
      Number(ngayMat.slice(0, 4)) !== duLieu.nam_mat
    )
      errors.push({ field: "nam_mat", message: "Năm mất không khớp ngày mất" });
    if (ngaySinh && ngayMat && ngayMat <= ngaySinh)
      errors.push({
        field: "ngay_mat",
        message: "Ngày mất phải sau ngày sinh",
      });
    if (
      duLieu.nam_sinh != null &&
      duLieu.nam_mat != null &&
      duLieu.nam_mat < duLieu.nam_sinh
    )
      errors.push({
        field: "nam_mat",
        message: "Năm mất không được trước năm sinh",
      });
    if (errors.length) throw loiNhieuTruong(errors);
  }
  async kiemTraAnh(donViId, duLieu, client) {
    if (
      duLieu.anh_dai_dien_tep_id &&
      !(await repo.tepTonTai(donViId, duLieu.anh_dai_dien_tep_id, client))
    )
      throw this.loi("Ảnh đại diện không tồn tại trong đơn vị");
  }
  xuLyLoiDb(error) {
    if (error.code === "23505") {
      const field =
        error.constraint === "uq_ten_khac_tg" ? "ten_khac" : "ma_tac_gia";
      const message =
        field === "ten_khac"
          ? "Tên khác đã tồn tại"
          : "Mã tác giả đã tồn tại trong đơn vị";
      throw loiNhieuTruong([{ field, message }], 409, "AUTHOR_EXISTS");
    }
    if (error.code === "23503")
      throw this.loi(
        "Tác giả đang được sử dụng hoặc dữ liệu tham chiếu không hợp lệ",
        409,
        "AUTHOR_IN_USE",
      );
    if (
      error.code === "23514" ||
      error.code === "22003" ||
      error.code === "22P02"
    )
      throw this.loi("Dữ liệu tác giả vi phạm ràng buộc");
    throw error;
  }
  async danhSach(auth, queryString) {
    const boLoc = boLocHopLe(queryString);
    await this.yeuCauQuyen(auth, "books.read");
    const ketQua = await repo.danhSach(auth.donViId, boLoc);
    return {
      ...ketQua,
      tac_gia: (ketQua.tac_gia || []).map((tacGia) =>
        this.boKhoaDiaChiTinhXa(tacGia),
      ),
    };
  }
  async chiTiet(auth, tacGiaId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    await this.yeuCauQuyen(auth, "books.read");
    const tacGia = await this.tacGiaTonTai(auth.donViId, tacGiaId);
    return {
      ...this.boKhoaDiaChiTinhXa(tacGia),
      ten_khac_tac_gia: await repo.danhSachTenKhac(auth.donViId, tacGiaId),
    };
  }
  async taoTacGia(auth, body, requestId) {
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...body };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = tacGiaMoiHopLe(dauVao);
      this.kiemTraNgayThang(duLieu);
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong.push(...(error.details || []));
    }
    try {
      const ketQua = await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        const ma =
          typeof dauVao.ma_tac_gia === "string"
            ? dauVao.ma_tac_gia.trim().toUpperCase()
            : "";
        if (ma && (await repo.maTacGiaDaTonTai(auth.donViId, ma, null, client)))
          loiTruong.push({
            field: "ma_tac_gia",
            message: "Mã tác giả đã tồn tại trong đơn vị",
          });
        const rawImageId = dauVao.anh_dai_dien_tep_id;
        const imageId =
          duLieu.anh_dai_dien_tep_id ??
          (Number.isSafeInteger(Number(rawImageId)) && Number(rawImageId) > 0
            ? Number(rawImageId)
            : null);
        if (imageId && !(await repo.tepTonTai(auth.donViId, imageId, client)))
          loiTruong.push({
            field: "anh_dai_dien_tep_id",
            message:
              "Ảnh đại diện không tồn tại hoặc không hợp lệ trong đơn vị",
          });
        if (loiTruong.length) {
          const unique = [
            ...new Map(
              loiTruong.map((item) => [`${item.field}:${item.message}`, item]),
            ).values(),
          ];
          const duplicate = unique.some(
            (item) =>
              item.field === "ma_tac_gia" &&
              item.message.includes("đã tồn tại"),
          );
          throw loiNhieuTruong(
            unique,
            duplicate ? 409 : 422,
            duplicate ? "AUTHOR_EXISTS" : "INVALID_INPUT",
          );
        }
        if (kiemTra) return { da_kiem_tra: true };
        await this.kiemTraAnh(auth.donViId, duLieu, client);
        const tacGia = await repo.taoTacGia(
          auth.donViId,
          auth.taiKhoanId,
          duLieu,
          client,
        );
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongLoai: "tac_gia",
            doiTuongId: tacGia.id,
            hanhDong: "books.author.create",
            requestId,
          },
          client,
        );
        return tacGia;
      });
      return kiemTra
        ? ketQua
        : { ...this.boKhoaDiaChiTinhXa(ketQua), ten_khac_tac_gia: [] };
    } catch (error) {
      this.xuLyLoiDb(error);
    }
  }
  async suaTacGia(auth, tacGiaId, body, requestId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    const kiemTra = body?.kiem_tra === true;
    const dauVao = { ...body };
    delete dauVao.kiem_tra;
    let duLieu = {};
    let loiTruong = [];
    try {
      duLieu = suaTacGiaHopLe(dauVao);
    } catch (error) {
      if (!kiemTra) throw error;
      loiTruong = error.details || [];
    }
    let ketQua;
    try {
      ketQua = await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        const hienTai = await this.tacGiaTonTai(
          auth.donViId,
          tacGiaId,
          client,
          true,
        );
        const values = { ...hienTai, ...duLieu };
        try {
          this.kiemTraNgayThang(values);
        } catch (error) {
          if (!kiemTra) throw error;
          loiTruong.push(...(error.details || []));
        }
        const rawImageId = dauVao.anh_dai_dien_tep_id;
        const imageId =
          duLieu.anh_dai_dien_tep_id ??
          (Number.isSafeInteger(Number(rawImageId)) && Number(rawImageId) > 0
            ? Number(rawImageId)
            : null);
        if (imageId && !(await repo.tepTonTai(auth.donViId, imageId, client)))
          loiTruong.push({
            field: "anh_dai_dien_tep_id",
            message:
              "Ảnh đại diện không tồn tại hoặc không hợp lệ trong đơn vị",
          });
        const ma =
          duLieu.ma_tac_gia ||
          (typeof dauVao.ma_tac_gia === "string"
            ? dauVao.ma_tac_gia.trim().toUpperCase()
            : "");
        if (
          ma &&
          (await repo.maTacGiaDaTonTai(auth.donViId, ma, tacGiaId, client))
        )
          loiTruong.push({
            field: "ma_tac_gia",
            message: "Mã tác giả đã tồn tại trong đơn vị",
          });
        if (loiTruong.length) {
          const unique = [
            ...new Map(
              loiTruong.map((item) => [`${item.field}:${item.message}`, item]),
            ).values(),
          ];
          const duplicate = unique.some(
            (item) =>
              item.field === "ma_tac_gia" &&
              item.message.includes("đã tồn tại"),
          );
          throw loiNhieuTruong(
            unique,
            duplicate ? 409 : 422,
            duplicate ? "AUTHOR_EXISTS" : "INVALID_INPUT",
          );
        }
        if (kiemTra) return { da_kiem_tra: true };
        await this.kiemTraAnh(auth.donViId, duLieu, client);
        const tacGia = await repo.suaTacGia(
          auth.donViId,
          tacGiaId,
          auth.taiKhoanId,
          duLieu,
          client,
        );
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongLoai: "tac_gia",
            doiTuongId: tacGiaId,
            hanhDong: "books.author.update",
            requestId,
          },
          client,
        );
        return tacGia;
      });
    } catch (error) {
      this.xuLyLoiDb(error);
    }
    if (kiemTra) return ketQua;
    return {
      ...this.boKhoaDiaChiTinhXa(ketQua),
      ten_khac_tac_gia: await repo.danhSachTenKhac(auth.donViId, tacGiaId),
    };
  }
  async doiTrangThai(auth, tacGiaId, body, requestId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    const trangThai = trangThaiHopLe(body);
    return trongGiaoDich(async (client) => {
      await this.yeuCauQuyen(auth, "books.create", client);
      await this.tacGiaTonTai(auth.donViId, tacGiaId, client, true);
      const tacGia = await repo.doiTrangThai(
        auth.donViId,
        tacGiaId,
        auth.taiKhoanId,
        trangThai,
        client,
      );
      await repo.ghiNhatKy(
        {
          donViId: auth.donViId,
          actorId: auth.taiKhoanId,
          doiTuongLoai: "tac_gia",
          doiTuongId: tacGiaId,
          hanhDong: "books.author.status.update",
          requestId,
        },
        client,
      );
      return this.boKhoaDiaChiTinhXa(tacGia);
    });
  }
  async xoaTacGia(auth, tacGiaId, requestId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    try {
      return await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        await this.tacGiaTonTai(auth.donViId, tacGiaId, client, true);
        const tenKhac = await repo.danhSachTenKhac(
          auth.donViId,
          tacGiaId,
          client,
        );
        for (const item of tenKhac)
          await repo.xoaTenKhac(auth.donViId, tacGiaId, item.id, client);
        const ketQua = await repo.xoaTacGia(auth.donViId, tacGiaId, client);
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongLoai: "tac_gia",
            doiTuongId: tacGiaId,
            hanhDong: "books.author.delete",
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
  async danhSachTenKhac(auth, tacGiaId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    await this.yeuCauQuyen(auth, "books.read");
    await this.tacGiaTonTai(auth.donViId, tacGiaId);
    return {
      ten_khac_tac_gia: await repo.danhSachTenKhac(auth.donViId, tacGiaId),
    };
  }
  async taoTenKhac(auth, tacGiaId, body, requestId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    const duLieu = tenKhacMoiHopLe(body);
    try {
      return await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        await this.tacGiaTonTai(auth.donViId, tacGiaId, client, true);
        const tenKhac = await repo.taoTenKhac(
          auth.donViId,
          tacGiaId,
          auth.taiKhoanId,
          duLieu,
          client,
        );
        if (duLieu.la_ten_uu_tien)
          await repo.boTenUuTien(
            auth.donViId,
            tacGiaId,
            duLieu.loai_ten,
            tenKhac.id,
            auth.taiKhoanId,
            client,
          );
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongLoai: "ten_khac_tac_gia",
            doiTuongId: tenKhac.id,
            hanhDong: "books.author.alias.create",
            requestId,
          },
          client,
        );
        return tenKhac;
      });
    } catch (error) {
      this.xuLyLoiDb(error);
    }
  }
  async suaTenKhac(auth, tacGiaId, tenKhacId, body, requestId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    tenKhacId = idHopLe(tenKhacId, "Tên khác");
    const duLieu = suaTenKhacHopLe(body);
    try {
      return await trongGiaoDich(async (client) => {
        await this.yeuCauQuyen(auth, "books.create", client);
        await this.tacGiaTonTai(auth.donViId, tacGiaId, client, true);
        const hienTai = await this.tenKhacTonTai(
          auth.donViId,
          tacGiaId,
          tenKhacId,
          client,
          true,
        );
        const tenKhac = await repo.suaTenKhac(
          auth.donViId,
          tacGiaId,
          tenKhacId,
          auth.taiKhoanId,
          duLieu,
          client,
        );
        if (tenKhac.la_ten_uu_tien)
          await repo.boTenUuTien(
            auth.donViId,
            tacGiaId,
            tenKhac.loai_ten,
            tenKhac.id,
            auth.taiKhoanId,
            client,
          );
        await repo.ghiNhatKy(
          {
            donViId: auth.donViId,
            actorId: auth.taiKhoanId,
            doiTuongLoai: "ten_khac_tac_gia",
            doiTuongId: hienTai.id,
            hanhDong: "books.author.alias.update",
            requestId,
          },
          client,
        );
        return tenKhac;
      });
    } catch (error) {
      this.xuLyLoiDb(error);
    }
  }
  async xoaTenKhac(auth, tacGiaId, tenKhacId, requestId) {
    tacGiaId = idHopLe(tacGiaId, "Tác giả");
    tenKhacId = idHopLe(tenKhacId, "Tên khác");
    return trongGiaoDich(async (client) => {
      await this.yeuCauQuyen(auth, "books.create", client);
      await this.tacGiaTonTai(auth.donViId, tacGiaId, client, true);
      await this.tenKhacTonTai(auth.donViId, tacGiaId, tenKhacId, client, true);
      const ketQua = await repo.xoaTenKhac(
        auth.donViId,
        tacGiaId,
        tenKhacId,
        client,
      );
      await repo.ghiNhatKy(
        {
          donViId: auth.donViId,
          actorId: auth.taiKhoanId,
          doiTuongLoai: "ten_khac_tac_gia",
          doiTuongId: tenKhacId,
          hanhDong: "books.author.alias.delete",
          requestId,
        },
        client,
      );
      return ketQua;
    });
  }
}
module.exports = new TacGiaService();
