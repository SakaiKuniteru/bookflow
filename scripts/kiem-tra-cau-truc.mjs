import {
    existsSync,
    readFileSync,
    statSync
} from 'node:fs';

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const thuMucGoc = fileURLToPath(
    new URL('../', import.meta.url)
);

const thuMucBatBuoc = [
    'frontend',
    'backend',
    'ai-service',
    'database',
    'contracts',
    'infrastructure',
    'scripts',
    'docs',
    'docs/architecture',
    'docs/database',
    'docs/database/ban-goc',
    '.github',
    '.github/workflows'
];

const tepBatBuoc = [
    'README.md',
    '.gitignore',
    '.dockerignore',
    '.env.example',
    'package.json',
    'scripts/kiem-tra-cau-truc.mjs',
    'docs/architecture/tong-quan.md',
    'docs/architecture/ranh-gioi-phan-he.md',
    'docs/database/tu-dien-du-lieu.md',
    'docs/database/ban-goc/BookFlow_AI_Tu_Dien_Du_Lieu_Chi_Tiet.md'
];

function kiemTraDuongDan(
    duongDanTuongDoi,
    loai
) {
    const duongDan = resolve(
        thuMucGoc,
        duongDanTuongDoi
    );

    if (!existsSync(duongDan)) {
        throw new Error(
            `Thieu ${loai}: ${duongDanTuongDoi}`
        );
    }

    const thongTin = statSync(duongDan);

    if (
        loai === 'folder' &&
        !thongTin.isDirectory()
    ) {
        throw new Error(
            `Khong phai folder: ${duongDanTuongDoi}`
        );
    }

    if (
        loai === 'file' &&
        !thongTin.isFile()
    ) {
        throw new Error(
            `Khong phai file: ${duongDanTuongDoi}`
        );
    }
}

for (const thuMuc of thuMucBatBuoc) {
    kiemTraDuongDan(thuMuc, 'folder');
}

for (const tep of tepBatBuoc) {
    kiemTraDuongDan(tep, 'file');
}

const packageJson = JSON.parse(
    readFileSync(
        resolve(thuMucGoc, 'package.json'),
        'utf8'
    )
);

if (packageJson.private !== true) {
    throw new Error(
        'package.json phai co private: true'
    );
}

const scriptBatBuoc = {
    'kiem-tra:nen-tang':
        'node scripts/kiem-tra-cau-truc.mjs'
};

for (const [tenScript, lenh] of Object.entries(
    scriptBatBuoc
)) {
    if (packageJson.scripts?.[tenScript] !== lenh) {
        throw new Error(
            `Script khong hop le: ${tenScript}`
        );
    }
}

const gitignore = readFileSync(
    resolve(thuMucGoc, '.gitignore'),
    'utf8'
);

const quyTacGitignore = gitignore
    .split(/\r?\n/)
    .map((dong) => dong.trim());

if (!quyTacGitignore.includes('!.env.example')) {
    throw new Error(
        '.gitignore phai cho phep commit .env.example'
    );
}

console.log(
    'F00 OK: cau truc goc va package.json hop le'
);