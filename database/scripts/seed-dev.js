const { Client } = require('pg');
const { createHash, randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { bamMatKhau } = require('../../backend/src/common/security/mat-khau.js');

async function mot(client, sql, params = []) {
    const { rows } = await client.query(sql, params);
    if (!rows[0]) throw new Error('Không tạo được bản ghi seed');
    return rows[0];
}

async function main() {
    const {
        DB_HOST,
        DB_PORT,
        POSTGRES_USER,
        POSTGRES_PASSWORD,
        POSTGRES_DB,
        BOOKFLOW_SEED_PASSWORD
    } = process.env;

    if (
        DB_HOST !== '127.0.0.1' ||
        Number(DB_PORT) !== 5432 ||
        POSTGRES_DB !== 'bookflow_dev'
    ) {
        throw new Error(
            'Chỉ cho phép seed bookflow_dev trên Postgres.app 127.0.0.1:5432'
        );
    }

    if (
        !BOOKFLOW_SEED_PASSWORD ||
        BOOKFLOW_SEED_PASSWORD.length < 8
    ) {
        throw new Error('Chưa nhập BOOKFLOW_SEED_PASSWORD hợp lệ');
    }

    const matKhauBam = bamMatKhau(BOOKFLOW_SEED_PASSWORD);

    if (typeof matKhauBam !== 'string') {
        throw new Error('Hàm băm mật khẩu phải trả về chuỗi');
    }

    const client = new Client({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: POSTGRES_USER,
        password: POSTGRES_PASSWORD,
        database: POSTGRES_DB
    });

    await client.connect();

    let dangGiaoDich = false;

    try {
        const { rows: [db] } = await client.query(`
            SELECT
                current_database() AS ten,
                inet_server_port() AS cong,
                to_regclass('public.lich_su_migration') IS NOT NULL
                    AS da_migrate
        `);

        if (
            db.ten !== 'bookflow_dev' ||
            db.cong !== 5432 ||
            !db.da_migrate
        ) {
            throw new Error('Database không đúng hoặc chưa migrate');
        }

        const { rows: migration } = await client.query(`
            SELECT 1
            FROM lich_su_migration
            WHERE ten_file = '013_chuyen_sang_access_refresh_token.sql'
        `);

        if (!migration.length) {
            throw new Error(
                'Chưa migrate xong 001–013. Chạy migration trước.'
            );
        }

        const { rows: [cotId] } = await client.query(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'tai_khoan'
              AND column_name = 'id'
        `);

        if (cotId?.data_type !== 'integer') {
            throw new Error(
                'tai_khoan.id chưa là INTEGER, không chạy seed'
            );
        }

        const emails = [
            'contact.pqh@gmail.com',
            'huyylksnb@gmail.com',
            'khoicanhoiylks@gmail.com'
        ];

        const { rows: [du] } = await client.query(`
            SELECT COUNT(*)::int AS so
            FROM tai_khoan
            WHERE lower(email) <> ALL($1::text[])
        `, [emails]);

        if (du.so) {
            throw new Error(
                `Database còn ${du.so} tài khoản khác. ` +
                'Script sẽ không tự xóa dữ liệu.'
            );
        }

        await client.query('BEGIN');
        dangGiaoDich = true;

        for (const ten of ['quyen.sql', 'quyen-f05.sql']) {
            const noiDung = readFileSync(
                join(__dirname, '../seeds', ten),
                'utf8'
            );

            await client.query(noiDung);
        }

        const taiKhoan = [];

        for (const [tenDangNhap, email, hoTen] of [
            [
                'admin',
                'contact.pqh@gmail.com',
                'Quản trị BookFlow'
            ],
            [
                'huy.pq',
                'huyylksnb@gmail.com',
                'Nhân viên Huy'
            ],
            [
                'pqhuy',
                'khoicanhoiylks@gmail.com',
                'Người dùng PQ Huy'
            ]
        ]) {
            const row = await mot(client, `
                INSERT INTO tai_khoan (
                    ten_dang_nhap,
                    email,
                    ho_ten,
                    mat_khau_bam,
                    email_da_xac_minh,
                    trang_thai,
                    bat_buoc_doi_mat_khau
                )
                VALUES (
                    $1, $2, $3, $4,
                    TRUE, 'DANG_DUNG', FALSE
                )
                ON CONFLICT ((lower(email)))
                DO UPDATE SET
                    ten_dang_nhap = EXCLUDED.ten_dang_nhap,
                    ho_ten = EXCLUDED.ho_ten,
                    mat_khau_bam = EXCLUDED.mat_khau_bam,
                    email_da_xac_minh = TRUE,
                    trang_thai = 'DANG_DUNG',
                    bat_buoc_doi_mat_khau = FALSE,
                    mat_khau_tam_het_han = NULL,
                    don_vi_kich_hoat_id = NULL,
                    so_lan_dang_nhap_sai = 0,
                    khoa_den = NULL,
                    ngay_dong_tai_khoan = NULL,
                    phien_ban_xac_thuc =
                        tai_khoan.phien_ban_xac_thuc + 1
                RETURNING id, ten_dang_nhap, email
            `, [
                tenDangNhap,
                email,
                hoTen,
                matKhauBam
            ]);

            taiKhoan.push(row);
        }

        const [admin, nhanVien, nguoiDung] = taiKhoan;

        await client.query(`
            UPDATE phien_dang_nhap
            SET
                ngay_thu_hoi = now(),
                ly_do_thu_hoi = 'DEV_SEED'
            WHERE tai_khoan_id = ANY($1::integer[])
              AND ngay_thu_hoi IS NULL
        `, [taiKhoan.map(item => item.id)]);

        const donVi = await mot(client, `
            INSERT INTO don_vi (
                ma_don_vi,
                ten_hien_thi,
                email_lien_he,
                ngay_kich_hoat,
                trang_thai
            )
            VALUES (
                'BOOKFLOW_DEMO',
                'Nhà sách BookFlow',
                $1,
                now(),
                'DANG_DUNG'
            )
            ON CONFLICT (ma_don_vi)
            DO UPDATE SET
                ten_hien_thi = EXCLUDED.ten_hien_thi,
                email_lien_he = EXCLUDED.email_lien_he,
                trang_thai = 'DANG_DUNG',
                ngay_kich_hoat =
                    COALESCE(don_vi.ngay_kich_hoat, now())
            RETURNING id, ma_don_vi
        `, [admin.email]);

        const chiNhanh = [];

        for (const [ma, ten, loai] of [
            [
                'CS01',
                'Chi nhánh trung tâm',
                'KET_HOP'
            ],
            [
                'CS02',
                'Chi nhánh số 2',
                'NHA_SACH'
            ]
        ]) {
            const row = await mot(client, `
                INSERT INTO chi_nhanh (
                    don_vi_id,
                    ma_chi_nhanh,
                    ten_chi_nhanh,
                    loai_chi_nhanh,
                    nguoi_tao_id,
                    trang_thai
                )
                VALUES ($1, $2, $3, $4, $5, 'DANG_DUNG')
                ON CONFLICT (don_vi_id, ma_chi_nhanh)
                DO UPDATE SET
                    ten_chi_nhanh = EXCLUDED.ten_chi_nhanh,
                    loai_chi_nhanh = EXCLUDED.loai_chi_nhanh,
                    trang_thai = 'DANG_DUNG'
                RETURNING id, ma_chi_nhanh
            `, [
                donVi.id,
                ma,
                ten,
                loai,
                admin.id
            ]);

            chiNhanh.push(row);
        }

        const vaiTro = {};

        for (const [ma, ten] of [
            ['QUAN_TRI', 'Quản trị đơn vị'],
            ['NHAN_VIEN', 'Nhân viên'],
            ['THU_THU', 'Thủ thư']
        ]) {
            vaiTro[ma] = await mot(client, `
                INSERT INTO vai_tro (
                    don_vi_id,
                    ma_vai_tro,
                    ten_vai_tro,
                    la_vai_tro_he_thong,
                    nguoi_tao_id
                )
                VALUES ($1, $2, $3, TRUE, $4)
                ON CONFLICT (don_vi_id, ma_vai_tro)
                DO UPDATE SET
                    ten_vai_tro = EXCLUDED.ten_vai_tro,
                    trang_thai = 'DANG_DUNG'
                RETURNING id, ma_vai_tro
            `, [
                donVi.id,
                ma,
                ten,
                admin.id
            ]);
        }

        // Admin nhận toàn bộ quyền đang hoạt động của đơn vị.
        await client.query(`
            INSERT INTO vai_tro_quyen (
                don_vi_id,
                vai_tro_id,
                quyen_id,
                pham_vi,
                nguoi_tao_id
            )
            SELECT
                $1,
                $2,
                id,
                'DON_VI',
                $3
            FROM quyen
            WHERE trang_thai = 'DANG_DUNG'
            ON CONFLICT (
                don_vi_id,
                vai_tro_id,
                quyen_id,
                pham_vi
            )
            DO NOTHING
        `, [
            donVi.id,
            vaiTro.QUAN_TRI.id,
            admin.id
        ]);

        // Nhân viên và thủ thư chỉ nhận quyền theo chi nhánh.
        for (const [maVaiTro, maQuyen] of [
            ['NHAN_VIEN', 'books.read'],
            ['THU_THU', 'books.read'],
            ['THU_THU', 'loans.return']
        ]) {
            await client.query(`
                INSERT INTO vai_tro_quyen (
                    don_vi_id,
                    vai_tro_id,
                    quyen_id,
                    pham_vi,
                    nguoi_tao_id
                )
                SELECT
                    $1,
                    $2,
                    id,
                    'CHI_NHANH',
                    $3
                FROM quyen
                WHERE ma_quyen = $4
                ON CONFLICT (
                    don_vi_id,
                    vai_tro_id,
                    quyen_id,
                    pham_vi
                )
                DO NOTHING
            `, [
                donVi.id,
                vaiTro[maVaiTro].id,
                admin.id,
                maQuyen
            ]);
        }

        const thanhVien = [];

        for (const [
            taiKhoan,
            ma,
            chucDanh,
            nguoiMoiId
        ] of [
            [
                admin,
                'ADM001',
                'Quản trị đơn vị',
                null
            ],
            [
                nhanVien,
                'NV001',
                'Nhân viên nhà sách',
                undefined
            ]
        ]) {
            const row = await mot(client, `
                INSERT INTO thanh_vien_don_vi (
                    don_vi_id,
                    tai_khoan_id,
                    ma_nhan_vien,
                    chuc_danh,
                    email_cong_viec,
                    nguoi_tao_id,
                    nguoi_moi_id,
                    ngay_gia_nhap,
                    trang_thai
                )
                VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, now(), 'DANG_LAM'
                )
                ON CONFLICT (don_vi_id, tai_khoan_id)
                DO UPDATE SET
                    ma_nhan_vien = EXCLUDED.ma_nhan_vien,
                    chuc_danh = EXCLUDED.chuc_danh,
                    email_cong_viec =
                        EXCLUDED.email_cong_viec,
                    trang_thai = 'DANG_LAM',
                    ngay_nghi_viec = NULL,
                    ngay_gia_nhap = COALESCE(
                        thanh_vien_don_vi.ngay_gia_nhap,
                        now()
                    )
                RETURNING id, tai_khoan_id
            `, [
                donVi.id,
                taiKhoan.id,
                ma,
                chucDanh,
                taiKhoan.email,
                admin.id,
                nguoiMoiId === undefined
                    ? thanhVien[0].id
                    : nguoiMoiId
            ]);

            thanhVien.push(row);
        }

        // Admin quản lý cả hai chi nhánh.
        await client.query(`
            UPDATE chi_nhanh
            SET
                quan_ly_thanh_vien_id = $1,
                nguoi_cap_nhat_id = $2
            WHERE don_vi_id = $3
              AND id = ANY($4::integer[])
        `, [
            thanhVien[0].id,
            admin.id,
            donVi.id,
            chiNhanh.map(item => item.id)
        ]);

        // Admin ở CS01 và CS02; nhân viên chỉ ở CS01.
        for (const [
            thanhVienId,
            chiNhanhId,
            laChinh
        ] of [
            [
                thanhVien[0].id,
                chiNhanh[0].id,
                true
            ],
            [
                thanhVien[0].id,
                chiNhanh[1].id,
                false
            ],
            [
                thanhVien[1].id,
                chiNhanh[0].id,
                true
            ]
        ]) {
            await client.query(`
                INSERT INTO thanh_vien_chi_nhanh (
                    don_vi_id,
                    thanh_vien_don_vi_id,
                    chi_nhanh_id,
                    la_chi_nhanh_chinh,
                    ngay_bat_dau,
                    trang_thai,
                    nguoi_tao_id
                )
                VALUES (
                    $1, $2, $3, $4,
                    CURRENT_DATE, 'HIEU_LUC', $5
                )
                ON CONFLICT DO NOTHING
            `, [
                donVi.id,
                thanhVienId,
                chiNhanhId,
                laChinh,
                admin.id
            ]);
        }

        // Gán vai trò theo đúng phạm vi.
        for (const [
            thanhVienId,
            vaiTroId,
            chiNhanhId
        ] of [
            [
                thanhVien[0].id,
                vaiTro.QUAN_TRI.id,
                null
            ],
            [
                thanhVien[1].id,
                vaiTro.NHAN_VIEN.id,
                chiNhanh[0].id
            ]
        ]) {
            await client.query(`
                INSERT INTO thanh_vien_vai_tro (
                    don_vi_id,
                    thanh_vien_don_vi_id,
                    vai_tro_id,
                    chi_nhanh_id,
                    nguoi_tao_id,
                    nguoi_cap_id
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `, [
                donVi.id,
                thanhVienId,
                vaiTroId,
                chiNhanhId,
                admin.id,
                thanhVien[0].id
            ]);
        }

        // Lượt phê duyệt mẫu đã dùng để tạo đơn vị.
        await client.query(`
            INSERT INTO phep_tao_don_vi (
                tai_khoan_id,
                ma_phieu_duyet,
                ngay_het_han,
                ngay_su_dung,
                don_vi_da_tao_id
            )
            VALUES (
                $1,
                'DEV_BOOKFLOW_DEMO',
                now() + interval '1 day',
                now(),
                $2
            )
            ON CONFLICT (ma_phieu_duyet)
            DO UPDATE SET
                tai_khoan_id =
                    EXCLUDED.tai_khoan_id,
                don_vi_da_tao_id =
                    EXCLUDED.don_vi_da_tao_id,
                ngay_su_dung = now()
        `, [admin.id, donVi.id]);

        // Phiên mẫu: đã thu hồi và hết hạn, không thể đăng nhập.
        const { rows: phienMau } = await client.query(`
            SELECT id
            FROM phien_dang_nhap
            WHERE tai_khoan_id = $1
              AND thiet_bi = 'BOOKFLOW_DEV_SEED'
            LIMIT 1
        `, [admin.id]);

        if (!phienMau.length) {
            const maPhienBam = createHash('sha256')
                .update(randomBytes(32))
                .digest('hex');

            const phien = await mot(client, `
                INSERT INTO phien_dang_nhap (
                    tai_khoan_id,
                    ma_phien_bam,
                    thiet_bi,
                    ngay_tao,
                    ngay_het_han,
                    ngay_thu_hoi,
                    ly_do_thu_hoi,
                    phien_ban_xac_thuc,
                    don_vi_dang_chon_id,
                    chi_nhanh_dang_chon_id
                )
                VALUES (
                    $1, $2, 'BOOKFLOW_DEV_SEED',
                    now() - interval '2 days',
                    now() - interval '1 day',
                    now() - interval '1 day',
                    'DEV_SEED',
                    $3, $4, $5
                )
                RETURNING id
            `, [
                admin.id,
                maPhienBam,
                1,
                donVi.id,
                chiNhanh[0].id
            ]);

            await client.query(`
                INSERT INTO nhat_ky_dang_nhap (
                    tai_khoan_id,
                    email_da_nhap,
                    ket_qua,
                    ma_ly_do,
                    user_agent,
                    phien_dang_nhap_id
                )
                VALUES (
                    $1,
                    $2,
                    'THANH_CONG',
                    'DEV_SEED_FIXTURE',
                    'Du lieu mau, khong phai lan dang nhap that',
                    $3
                )
            `, [
                admin.id,
                admin.email,
                phien.id
            ]);
        }

        // OTP mẫu: đã sử dụng và hết hạn, không thể xác minh.
        const { rows: otpMau } = await client.query(`
            SELECT id
            FROM ma_xac_minh
            WHERE tai_khoan_id = $1
              AND muc_dich = 'DANG_KY'
              AND ngay_su_dung IS NOT NULL
            LIMIT 1
        `, [admin.id]);

        if (!otpMau.length) {
            const maBam = createHash('sha256')
                .update(randomBytes(32))
                .digest('hex');

            await client.query(`
                INSERT INTO ma_xac_minh (
                    tai_khoan_id,
                    dia_chi_dich,
                    muc_dich,
                    ma_bam,
                    ngay_tao,
                    ngay_het_han,
                    ngay_su_dung,
                    ngay_gui_cuoi,
                    so_lan_thu
                )
                VALUES (
                    $1,
                    $2,
                    'DANG_KY',
                    $3,
                    now() - interval '3 hours',
                    now() - interval '1 hour',
                    now() - interval '2 hours',
                    now() - interval '3 hours',
                    1
                )
            `, [
                admin.id,
                admin.email,
                maBam
            ]);
        }

        await client.query(`
            INSERT INTO nhat_ky_he_thong (
                don_vi_id,
                tai_khoan_id,
                hanh_dong,
                doi_tuong_loai,
                doi_tuong_id,
                ket_qua,
                ly_do,
                nguon
            )
            VALUES (
                $1,
                $2,
                'dev.seed',
                'don_vi',
                $1,
                'THANH_CONG',
                'Dữ liệu mẫu phát triển BookFlow',
                'WORKER'
            )
        `, [
            donVi.id,
            admin.id
        ]);

        // Kiểm tra admin có đủ tất cả quyền đang hoạt động.
        const { rows: [soQuyen] } = await client.query(`
            SELECT
                (
                    SELECT COUNT(*)
                    FROM quyen
                    WHERE trang_thai = 'DANG_DUNG'
                ) AS tong,
                (
                    SELECT COUNT(*)
                    FROM vai_tro_quyen
                    WHERE don_vi_id = $1
                      AND vai_tro_id = $2
                      AND pham_vi = 'DON_VI'
                ) AS da_gan
        `, [
            donVi.id,
            vaiTro.QUAN_TRI.id
        ]);

        if (
            Number(soQuyen.tong) !==
            Number(soQuyen.da_gan)
        ) {
            throw new Error(
                'Quản trị chưa có đủ quyền của đơn vị'
            );
        }

        const tenBang = [
            'tai_khoan',
            'don_vi',
            'chi_nhanh',
            'thanh_vien_don_vi',
            'thanh_vien_chi_nhanh',
            'vai_tro',
            'quyen',
            'vai_tro_quyen',
            'thanh_vien_vai_tro',
            'phep_tao_don_vi',
            'nhat_ky_he_thong',
            'phien_dang_nhap',
            'ma_xac_minh',
            'nhat_ky_dang_nhap'
        ];

        const soBanGhi = {};

        for (const ten of tenBang) {
            const { rows: [item] } = await client.query(
                `SELECT COUNT(*)::int AS so FROM public.${ten}`
            );

            soBanGhi[ten] = item.so;

            if (!item.so) {
                throw new Error(
                    `Chưa có dữ liệu trong bảng ${ten}`
                );
            }
        }

        await client.query('COMMIT');
        dangGiaoDich = false;

        console.log('SEED OK:', {
            taiKhoan,
            donVi,
            chiNhanh,
            soQuyenAdmin: Number(soQuyen.da_gan),
            soBanGhi
        });

        console.log(
            'Phiên và OTP mẫu đã hết hạn/thu hồi; ' +
            'không dùng chúng để đăng nhập thật.'
        );
    } catch (error) {
        if (dangGiaoDich) {
            await client.query('ROLLBACK').catch(() => {});
        }

        throw error;
    } finally {
        await client.end();
    }
}

main().catch(error => {
    console.error('SEED ERROR:', error.message);
    process.exitCode = 1;
});