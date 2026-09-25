import test from 'node:test';

import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';

import AjvModule from 'ajv/dist/2020.js';

const Ajv2020 = AjvModule.default ?? AjvModule;

const thuMucContracts = fileURLToPath(
    new URL('../', import.meta.url)
);

import { join } from 'node:path';

function docJson(duongDan) {
    return JSON.parse(
        readFileSync(
            join(thuMucContracts, duongDan),
            'utf8'
        )
    );
}

const ajv = new Ajv2020({
    allErrors: true
});

const schemaLoi = docJson(
    'schemas/loi-api.schema.json'
);

const kiemTraLoi = ajv.compile(schemaLoi);

test(
    'F01: response loi hop le',
    () => {
        const duLieu = docJson(
            'examples/loi-api.response.json'
        );

        assert.equal(
            kiemTraLoi(duLieu),
            true,
            JSON.stringify(kiemTraLoi.errors)
        );
    }
);

test(
    'F01: response thieu request_id bi tu choi',
    () => {
        const duLieu = docJson(
            'examples/loi-api-khong-hop-le.response.json'
        );

        assert.equal(
            kiemTraLoi(duLieu),
            false
        );

        assert.ok(
            kiemTraLoi.errors?.some(
                (loi) =>
                    loi.keyword === 'required' &&
                    loi.params?.missingProperty ===
                        'request_id'
            )
        );
    }
);

test(
    'F01: vi du health backend hop le',
    () => {
        const duLieu = docJson(
            'examples/health-backend.response.json'
        );

        assert.equal(duLieu.success, true);
        assert.equal(duLieu.data.status, 'ok');
        assert.equal(
            duLieu.data.service,
            'backend'
        );
    }
);

test(
    'F01: vi du health AI hop le',
    () => {
        const duLieu = docJson(
            'examples/health-ai.response.json'
        );

        assert.equal(duLieu.success, true);
        assert.equal(duLieu.data.status, 'ok');
        assert.equal(
            duLieu.data.service,
            'ai-api'
        );
    }
);

test(
    'F01: vi du tao job va lay trang thai hop le',
    () => {
        const yeuCau = docJson(
            'examples/tao-tac-vu-ai.request.json'
        );

        const taoJob = docJson(
            'examples/tao-tac-vu-ai.response.json'
        );

        const trangThai = docJson(
            'examples/trang-thai-tac-vu-ai.response.json'
        );

        assert.equal(
            yeuCau.loai_tac_vu,
            'LAP_CHI_MUC_SACH'
        );

        assert.equal(
            taoJob.data.trang_thai,
            'CHO_XU_LY'
        );

        assert.equal(
            trangThai.data.trang_thai,
            'HOAN_TAT'
        );

        assert.equal(
            taoJob.data.job_id,
            trangThai.data.job_id
        );
    }
);