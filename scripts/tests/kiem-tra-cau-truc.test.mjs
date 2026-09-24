import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const thuMucTest = dirname(fileURLToPath(import.meta.url));
const thuMucGoc = resolve(thuMucTest, '../..');
const duongDanScript = resolve(thuMucGoc, 'scripts/kiem-tra-cau-truc.mjs');

test('F00.1: cau truc BookFlow dat yeu cau', () => {
  const ketQua = spawnSync(process.execPath, [duongDanScript], {
    cwd: thuMucGoc,
    encoding: 'utf8',
  });

  assert.equal(
    ketQua.status,
    0,
    `Kiem tra cau truc that bai:\n${ketQua.stdout}\n${ketQua.stderr}`,
  );

  assert.match(ketQua.stdout, /\[F00\.1\] DAT:/);
});
