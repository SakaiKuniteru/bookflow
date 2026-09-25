import { Pool } from 'pg';

import {
    readFileSync,
    readdirSync
} from 'node:fs';

import { createHash } from 'node:crypto';

import {
    dirname,
    join,
    resolve
} from 'node:path';

import {
    fileURLToPath,
    pathToFileURL
} from 'node:url';

const thuMucHienTai = dirname(
    fileURLToPath(import.meta.url)
);

const thuMucMigrationMacDinh = resolve(
    thuMucHienTai,
    '../migrations'
);

export function ketNoiDatabase({
    tenDatabase = process.env.POSTGRES_DB
} = {}) {
    const bienBatBuoc = [
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'DB_HOST',
        'DB_PORT'
    ];

    for (const tenBien of bienBatBuoc) {
        if (!process.env[tenBien]) {
            throw new Error(
                `Thieu bien moi truong: ${tenBien}`
            );
        }
    }

    if (!tenDatabase) {
        throw new Error(
            'Chua xac dinh ten database'
        );
    }

    return new Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: tenDatabase,
        max: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000
    });
}

export async function taoBangLichSu(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS public.lich_su_migration (
            ten_file TEXT PRIMARY KEY,
            checksum CHAR(64) NOT NULL,
            ngay_chay TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
}

export async function layMigrationDaChay(client) {
    const ketQua = await client.query(`
        SELECT
            ten_file,
            checksum,
            ngay_chay
        FROM public.lich_su_migration
        ORDER BY ten_file
    `);

    return ketQua.rows;
}

function tinhChecksum(noiDung) {
    return createHash('sha256')
        .update(noiDung, 'utf8')
        .digest('hex');
}

function layDanhSachMigration(thuMuc) {
    const danhSach = readdirSync(thuMuc)
        .filter((tenFile) =>
            /^\d{3}_[a-z0-9_-]+\.sql$/.test(tenFile)
        )
        .sort();

    const soThuTu = new Set();

    for (const tenFile of danhSach) {
        const so = tenFile.slice(0, 3);

        if (soThuTu.has(so)) {
            throw new Error(
                `Trung so thu tu migration: ${so}`
            );
        }

        soThuTu.add(so);
    }

    return danhSach;
}

export async function chayMigration(
    client,
    {
        tenFile,
        noiDung
    }
) {
    const checksum = tinhChecksum(noiDung);

    let daBatDauTransaction = false;

    try {
        await client.query('BEGIN');

        daBatDauTransaction = true;

        // Khóa transaction để hai runner không chạy chồng.
        await client.query(`
            SELECT pg_advisory_xact_lock(741909, 1)
        `);

        await taoBangLichSu(client);

        const ketQua = await client.query(
            `
                SELECT
                    ten_file,
                    checksum
                FROM public.lich_su_migration
                WHERE ten_file = $1
                FOR UPDATE
            `,
            [tenFile]
        );

        const migrationCu = ketQua.rows[0];

        if (migrationCu) {
            if (
                migrationCu.checksum.trim() !== checksum
            ) {
                throw new Error(
                    `Migration da bi thay doi: ${tenFile}`
                );
            }

            await client.query('COMMIT');

            daBatDauTransaction = false;

            return {
                tenFile,
                trangThai: 'BO_QUA'
            };
        }

        await client.query(noiDung);

        await client.query(
            `
                INSERT INTO public.lich_su_migration (
                    ten_file,
                    checksum
                )
                VALUES ($1, $2)
            `,
            [
                tenFile,
                checksum
            ]
        );

        await client.query('COMMIT');

        daBatDauTransaction = false;

        return {
            tenFile,
            trangThai: 'DA_CHAY'
        };
    } catch (error) {
        if (daBatDauTransaction) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error(
                    'ROLLBACK that bai:',
                    rollbackError.message
                );
            }
        }

        throw error;
    }
}

export async function chayTatCaMigration({
    pool,
    thuMuc = thuMucMigrationMacDinh
} = {}) {
    const poolSuDung = pool ?? ketNoiDatabase();

    const tuTaoPool = !pool;

    let client;

    try {
        const danhSach = layDanhSachMigration(
            thuMuc
        );

        if (danhSach.length === 0) {
            throw new Error(
                'Khong tim thay migration SQL'
            );
        }

        client = await poolSuDung.connect();

        const ketQua = [];

        for (const tenFile of danhSach) {
            const noiDung = readFileSync(
                join(thuMuc, tenFile),
                'utf8'
            );

            const ketQuaMigration =
                await chayMigration(
                    client,
                    {
                        tenFile,
                        noiDung
                    }
                );

            ketQua.push(ketQuaMigration);
        }

        return ketQua;
    } finally {
        client?.release();

        if (tuTaoPool) {
            await poolSuDung.end();
        }
    }
}

export async function main() {
    try {
        const ketQua =
            await chayTatCaMigration();

        for (const migration of ketQua) {
            console.log(
                `[${migration.trangThai}] ${migration.tenFile}`
            );
        }

        console.log(
            'F03 OK: migration hoan tat'
        );
    } catch (error) {
        console.error(
            'F03 ERROR:',
            error.message
        );

        process.exitCode = 1;
    }
}

const duongDanDuocChay = process.argv[1]
    ? pathToFileURL(
        resolve(process.argv[1])
    ).href
    : null;

if (
    duongDanDuocChay === import.meta.url
) {
    await main();
}