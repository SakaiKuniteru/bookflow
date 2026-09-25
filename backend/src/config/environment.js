function chuoiBatBuoc(env, ten) {
    const giaTri = env[ten];
    if (typeof giaTri !== 'string' || !giaTri.trim()) throw new Error(`Thiếu biến môi trường: ${ten}`);
    return giaTri.trim();
}
function congHopLe(env, ten, macDinh) {
    const giaTri = Number(env[ten] ?? macDinh);
    if (!Number.isInteger(giaTri) || giaTri < 1 || giaTri > 65535) throw new Error(`${ten} không hợp lệ`);
    return giaTri;
}
function urlHttp(env, ten) {
    const giaTri = chuoiBatBuoc(env, ten);
    let url;
    try { url = new URL(giaTri); } catch { throw new Error(`${ten} không phải là URL hợp lệ`); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${ten} phải là HTTP hoặc HTTPS`);
    return url.toString();
}
export function docMoiTruong(env = process.env) {
    return {
        appEnv: env.APP_ENV ?? 'dev',
        port: congHopLe(env, 'PORT', 3001),
        database: {
            host: chuoiBatBuoc(env, 'DB_HOST'),
            port: congHopLe(env, 'DB_PORT', 15432),
            user: chuoiBatBuoc(env, 'POSTGRES_USER'),
            password: chuoiBatBuoc(env, 'POSTGRES_PASSWORD'),
            name: chuoiBatBuoc(env, 'POSTGRES_DB')
        },
        redis: {
            host: chuoiBatBuoc(env, 'REDIS_HOST'),
            port: congHopLe(env, 'REDIS_PORT', 16379),
            password: chuoiBatBuoc(env, 'REDIS_PASSWORD')
        },
        storage: {
            endpoint: urlHttp(env, 'STORAGE_ENDPOINT'),
            healthUrl: urlHttp(env, 'STORAGE_HEALTH_URL')
        }
    };
}