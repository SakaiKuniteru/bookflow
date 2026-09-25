const { Pool } = require('pg');

class DatabasePool {
    poolChung = null;

    taoPool(moiTruong) {
        return new Pool({
            host: moiTruong.database.host,
            port: moiTruong.database.port,
            user: moiTruong.database.user,
            password: moiTruong.database.password,
            database: moiTruong.database.name,
            max: 10,
            connectionTimeoutMillis: 3000,
            idleTimeoutMillis: 10000
        });
    }

    layPool(moiTruong) {
        if (!this.poolChung) {
            if (!moiTruong) throw new Error('Database pool chưa được khởi tạo');
            this.poolChung = this.taoPool(moiTruong);
        }
        return this.poolChung;
    }

    async dongPool() {
        if (!this.poolChung) return;
        const pool = this.poolChung;
        this.poolChung = null;
        await pool.end();
    }
}

module.exports = new DatabasePool();