const nhaCungCapRepository = require('../nha-cung-cap/nha-cung-cap.repository.js');
const { query } = require('../../database/query.js');
const { BANG } = require('./kho.validation.js');
class KhoRepository extends nhaCungCapRepository.constructor {
    constructor() {
        super(BANG);
    }
    async maKhoDaTonTai(donViId, maKho, boQuaId = null, client) {
        const { rowCount } = await query('SELECT id FROM kho WHERE don_vi_id = $1 AND upper(ma_kho) = upper($2) AND ($3::integer IS NULL OR id <> $3) LIMIT 1', [donViId, maKho, boQuaId], client);
        return rowCount > 0;
    }
}
module.exports = new KhoRepository();
