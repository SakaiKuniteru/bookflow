import test from 'node:test';

import assert from 'node:assert/strict';

import {
    copyFileSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs';

import {
    tmpdir
} from 'node:os';

import {
    join,
    resolve,
    dirname
} from 'node:path';

import {
    fileURLToPath
} from 'node:url';

import {
    ketNoiDatabase,
    chayTatCaMigration
} from '../scripts/migrate.js';

const thuMucHienTai = dirname(
    fileURLToPath(import.meta.url)
);

const thuMucMigration = resolve(
    thuMucHienTai,
    '../migrations'
);

const thuMucSeed = resolve(
    thuMucHienTai,
    '../seeds'
);

const databaseTest = 'bookflow_test';

test(
    'F03: migration, checksum, rollback va seed',
    async () => {
        if (
            process.env.POSTGRES_DB === databaseTest
        ) {
            throw new Error(
                'POSTGRES_DB khong duoc la bookflow_test'
            );
        }

        if (
            process.env.DB_HOST !== '127.0.0.1'
        ) {
            throw new Error(
                'Test F03 chi duoc chay voi DB local'
            );
        }

        const pool = ketNoiDatabase({
            tenDatabase: databaseTest
        });

        try {
            // 1. Chay migration tren database test.
            const lanDau =
                await chayTatCaMigration({
                    pool
                });

            assert.equal(
                lanDau.length,
                3
            );

            const lichSuLanDau =
                await pool.query(`
                    SELECT ten_file, checksum
                    FROM public.lich_su_migration
                    ORDER BY ten_file
                `);

            assert.equal(
                lichSuLanDau.rows.length,
                3
            );

            // 2. Chay lai: khong duoc tao lich su trung.
            const lanHai =
                await chayTatCaMigration({
                    pool
                });

            assert.ok(
                lanHai.every(
                    (item) =>
                        item.trangThai === 'BO_QUA'
                )
            );

            const lichSuLanHai =
                await pool.query(`
                    SELECT COUNT(*)::int AS tong
                    FROM public.lich_su_migration
                `);

            assert.equal(
                lichSuLanHai.rows[0].tong,
                3
            );

            // 3. Kiem tra extension va bang nen.
            const vector = await pool.query(`
                SELECT extname
                FROM pg_extension
                WHERE extname = 'vector'
            `);

            assert.equal(
                vector.rows[0]?.extname,
                'vector'
            );

            const bang = await pool.query(`
                SELECT to_regclass('public.tai_khoan')
                    AS ten_bang
            `);

            assert.equal(
                bang.rows[0].ten_bang,
                'tai_khoan'
            );

            // 4. Tao migration loi trong thu muc tam.
            const thuMucTam = mkdtempSync(
                join(tmpdir(), 'bookflow-f03-')
            );

            try {
                for (const item of lanDau) {
                    copyFileSync(
                        join(
                            thuMucMigration,
                            item.tenFile
                        ),
                        join(
                            thuMucTam,
                            item.tenFile
                        )
                    );
                }

                writeFileSync(
                    join(
                        thuMucTam,
                        '004_kiem-tra-rollback.sql'
                    ),
                    `
                    CREATE TABLE f03_rollback_probe (
                        id INTEGER PRIMARY KEY
                    );

                    SELECT 1 / 0;
                    `,
                    'utf8'
                );

                await assert.rejects(
                    chayTatCaMigration({
                        pool,
                        thuMuc: thuMucTam
                    })
                );

                const bangLoi =
                    await pool.query(`
                        SELECT to_regclass(
                            'public.f03_rollback_probe'
                        ) AS ten_bang
                    `);

                assert.equal(
                    bangLoi.rows[0].ten_bang,
                    null
                );

                const lichSuSauLoi =
                    await pool.query(`
                        SELECT COUNT(*)::int AS tong
                        FROM public.lich_su_migration
                    `);

                assert.equal(
                    lichSuSauLoi.rows[0].tong,
                    3
                );

                // 5. Sua noi dung migration da chay:
                // runner phai phat hien checksum thay doi.
                const fileCanSua = join(
                    thuMucTam,
                    '002_nen-tang.sql'
                );

                const noiDungCu = readFileSync(
                    fileCanSua,
                    'utf8'
                );

                writeFileSync(
                    fileCanSua,
                    `${noiDungCu}\n-- da sua sau khi chay\n`,
                    'utf8'
                );

                await assert.rejects(
                    chayTatCaMigration({
                        pool,
                        thuMuc: thuMucTam
                    }),
                    /Migration da bi thay doi/
                );
            } finally {
                rmSync(
                    thuMucTam,
                    {
                        recursive: true,
                        force: true
                    }
                );
            }

            // 6. Tao mot don vi test.
            await pool.query(`
                INSERT INTO don_vi (
                    ma_don_vi,
                    ten_hien_thi,
                    email_lien_he
                )
                VALUES (
                    'TEST_F03',
                    'Don vi kiem thu F03',
                    'f03@example.test'
                )
                ON CONFLICT (ma_don_vi)
                DO NOTHING
            `);

            const seedQuyen = readFileSync(
                join(
                    thuMucSeed,
                    'quyen.sql'
                ),
                'utf8'
            );

            const seedVaiTro = readFileSync(
                join(
                    thuMucSeed,
                    'vai-tro-mac-dinh.sql'
                ),
                'utf8'
            );

            // 7. Chay seed hai lan.
            for (let lan = 0; lan < 2; lan++) {
                await pool.query(seedQuyen);
                await pool.query(seedVaiTro);
            }

            const tongQuyen =
                await pool.query(`
                    SELECT COUNT(*)::int AS tong
                    FROM quyen
                    WHERE ma_quyen IN (
                        'books.read',
                        'books.create',
                        'loans.return',
                        'payments.refund'
                    )
                `);

            assert.equal(
                tongQuyen.rows[0].tong,
                4
            );

            const tongVaiTro =
                await pool.query(`
                    SELECT COUNT(*)::int AS tong
                    FROM vai_tro
                    WHERE don_vi_id = (
                        SELECT id
                        FROM don_vi
                        WHERE ma_don_vi = 'TEST_F03'
                    )
                    AND ma_vai_tro IN (
                        'QUAN_TRI',
                        'NHAN_VIEN',
                        'THU_THU'
                    )
                `);

            assert.equal(
                tongVaiTro.rows[0].tong,
                3
            );
        } finally {
            await pool.end();
        }
    }
);