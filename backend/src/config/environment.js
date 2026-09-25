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
    try { url = new URL(giaTri); }
    catch { throw new Error(`${ten} không phải là URL hợp lệ`); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${ten} phải là HTTP hoặc HTTPS`);
    return url.toString();
}

function docMoiTruong(env = process.env) {
    return {
        appEnv: env.APP_ENV ?? 'dev',
        port: congHopLe(env, 'PORT', 3001),
        database: {
            host: chuoiBatBuoc(env, 'DB_HOST'),
            port: congHopLe(env, 'DB_PORT', 5432),
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
        },
        email: docCauHinhEmail(env),
        token: docCauHinhToken(env)
    };
}

function docCauHinhEmail(env = process.env) {
    const otpSecret = chuoiBatBuoc(env, 'OTP_SECRET');
    if (!/^[0-9a-fA-F]{64,}$/.test(otpSecret)) throw new Error('OTP_SECRET phải là chuỗi hex ít nhất 32 byte');
    return {
        host: chuoiBatBuoc(env, 'SMTP_HOST'),
        port: congHopLe(env, 'SMTP_PORT', 587),
        user: chuoiBatBuoc(env, 'SMTP_USER'),
        password: chuoiBatBuoc(env, 'SMTP_PASSWORD'),
        from: chuoiBatBuoc(env, 'SMTP_FROM'),
        fromName: env.SMTP_FROM_NAME?.trim() || 'BookFlow',
        loginUrl: urlHttp(env, 'PUBLIC_LOGIN_URL'),
        otpSecret
    };
}

function docCauHinhToken(env = process.env) {
    const jwtAccessSecret = chuoiBatBuoc(env, 'JWT_ACCESS_SECRET');
    const accessMinutes = Number(env.THOI_GIAN_ACCESS_TOKEN ?? 10);
    const refreshMinutes = Number(env.THOI_GIAN_REFRESH_TOKEN ?? 120);
    if (!/^[0-9a-fA-F]{64,}$/.test(jwtAccessSecret) || jwtAccessSecret.length % 2 !== 0) throw new Error('JWT_ACCESS_SECRET phải là chuỗi hex ít nhất 32 byte');
    if (!Number.isInteger(accessMinutes) || accessMinutes < 1 || accessMinutes > 60 || !Number.isInteger(refreshMinutes) || refreshMinutes <= accessMinutes || refreshMinutes > 43200) {
        throw new Error('Thời hạn Access Token hoặc Refresh Token không hợp lệ');
    }
    return { jwtAccessSecret, accessTtlSeconds: accessMinutes * 60, refreshTtlMinutes: refreshMinutes };
}

module.exports = { docMoiTruong, docCauHinhEmail, docCauHinhToken };