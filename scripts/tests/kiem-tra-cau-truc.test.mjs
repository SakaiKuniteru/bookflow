import test from 'node:test';

import assert from 'node:assert/strict';

import { spawnSync } from 'node:child_process';

import { fileURLToPath } from 'node:url';

const thuMucGoc = fileURLToPath(
    new URL('../../', import.meta.url)
);

test(
    'F00: repository co cau truc bat buoc',
    () => {
        const ketQua = spawnSync(
            process.execPath,
            ['scripts/kiem-tra-cau-truc.mjs'],
            {
                cwd: thuMucGoc,
                encoding: 'utf8'
            }
        );

        assert.equal(
            ketQua.status,
            0,
            [
                'Kiem tra cau truc that bai:',
                ketQua.stdout,
                ketQua.stderr
            ].join('\n')
        );

        assert.match(
            ketQua.stdout,
            /F00 OK/
        );
    }
);