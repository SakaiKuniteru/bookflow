const nhaCungCapRepository = require("../nha-cung-cap/nha-cung-cap.repository.js");
const { query } = require("../../database/query.js");
const { BANG } = require("./kho.validation.js");
class KhoRepository extends nhaCungCapRepository.constructor {
  constructor() {
    super(BANG);
  }
  async maKhoDaTonTai(donViId, maKho, boQuaId = null, client) {
    const { rowCount } = await query(
      "SELECT id FROM kho WHERE don_vi_id = $1 AND upper(btrim(ma_kho)) = upper(btrim($2)) AND ngay_xoa IS NULL AND ($3::integer IS NULL OR id <> $3) LIMIT 1",
      [donViId, maKho, boQuaId],
      client,
    );
    return rowCount > 0;
  }
  async tenKhoDaTonTai(donViId, chiNhanhId, tenKho, boQuaId = null, client) {
    const { rowCount } = await query(
      "SELECT id FROM kho WHERE don_vi_id = $1 AND chi_nhanh_id = $2 AND lower(btrim(ten_kho)) = lower(btrim($3)) AND ngay_xoa IS NULL AND ($4::integer IS NULL OR id <> $4) LIMIT 1",
      [donViId, chiNhanhId, tenKho, boQuaId],
      client,
    );
    return rowCount > 0;
  }
}
module.exports = new KhoRepository();
