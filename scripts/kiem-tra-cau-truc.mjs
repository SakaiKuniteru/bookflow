import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const thuMucScript = dirname(fileURLToPath(import.meta.url));
const thuMucGoc = resolve(thuMucScript, '..');

const thuMucBatBuoc = [
  'frontend',
  'backend',
  'ai-service',
  'database',
  'contracts',
  'infrastructure',
  'scripts',
  'scripts/tests',
  'docs',
  'docs/architecture',
  'docs/database',
  'docs/database/ban-goc',
  '.github',
  '.github/workflows',
];

const tepBatBuoc = [
  'README.md',
  '.gitignore',
  '.dockerignore',
  '.env.example',
  'package.json',
  'scripts/kiem-tra-cau-truc.mjs',
  'scripts/tests/kiem-tra-cau-truc.test.mjs',
  'docs/architecture/tong-quan.md',
  'docs/architecture/ranh-gioi-phan-he.md',
  'docs/database/tu-dien-du-lieu.md',
  'docs/database/ban-goc/BookFlow_AI_Tu_Dien_Du_Lieu_Chi_Tiet.md',
];

const loi = [];

function kiemTraDuongDan(duongDanTuongDoi, loai) {
  const duongDan = join(thuMucGoc, duongDanTuongDoi);

  if (!existsSync(duongDan)) {
    loi.push(`Thieu ${loai}: ${duongDanTuongDoi}`);
    return;
  }

  const thongTin = statSync(duongDan);
  const hopLe = loai === 'folder' ? thongTin.isDirectory() : thongTin.isFile();

  if (!hopLe) {
    loi.push(`Sai loai ${loai}: ${duongDanTuongDoi}`);
  }
}

for (const thuMuc of thuMucBatBuoc) {
  kiemTraDuongDan(thuMuc, 'folder');
}

for (const tep of tepBatBuoc) {
  kiemTraDuongDan(tep, 'file');
}

const duongDanPackage = join(thuMucGoc, 'package.json');

if (existsSync(duongDanPackage)) {
  try {
    const packageJson = JSON.parse(readFileSync(duongDanPackage, 'utf8'));

    if (packageJson.private !== true) {
      loi.push('package.json phai co "private": true');
    }

    if (packageJson.scripts?.['kiem-tra:cau-truc']
      !== 'node scripts/kiem-tra-cau-truc.mjs') {
      loi.push('Thieu hoac sai script "kiem-tra:cau-truc"');
    }

    if (packageJson.scripts?.['test:f00']
      !== 'node --test scripts/tests/kiem-tra-cau-truc.test.mjs') {
      loi.push('Thieu hoac sai script "test:f00"');
    }
  } catch (error) {
    loi.push(`Khong doc duoc package.json: ${error.message}`);
  }
}

const duongDanGitignore = join(thuMucGoc, '.gitignore');

if (existsSync(duongDanGitignore)) {
  const noiDung = readFileSync(duongDanGitignore, 'utf8');

  if (!noiDung.split(/\r?\n/).includes('!.env.example')) {
    loi.push('.gitignore phai cho phep commit .env.example');
  }
}

if (loi.length > 0) {
  console.error('[F00.1] Kiem tra KHONG DAT:');

  for (const chiTiet of loi) {
    console.error(`  - ${chiTiet}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `[F00.1] DAT: ${thuMucBatBuoc.length} folder, `
    + `${tepBatBuoc.length} file va package.json hop le.`,
  );
}
