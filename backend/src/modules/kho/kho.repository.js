const nhaCungCapRepository = require('../nha-cung-cap/nha-cung-cap.repository.js');
const { BANG } = require('./kho.validation.js');
class KhoRepository extends nhaCungCapRepository.constructor {
    constructor() {
        super(BANG);
    }
}
module.exports = new KhoRepository();