const { createHash, randomBytes } = require('node:crypto');
const { SignJWT, jwtVerify } = require('jose');
const { AppError } = require('../errors/AppError.js');
const { docCauHinhToken } = require('../../config/environment.js');

const thoiHan = docCauHinhToken();
const ISSUER = 'bookflow-backend';
const AUDIENCE = 'bookflow-api';
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const REFRESH_TOKEN = /^[A-Za-z0-9_-]{43}$/;

class TokenService {
    ACCESS_TOKEN_TTL = thoiHan.accessTtlSeconds;
    REFRESH_TOKEN_TTL_MINUTES = thoiHan.refreshTtlMinutes;

    khoaJwt() {
        const { jwtAccessSecret } = docCauHinhToken();
        return Buffer.from(jwtAccessSecret, 'hex');
    }

    loiAccessToken(message = 'Access Token không hợp lệ', code = 'ACCESS_TOKEN_INVALID') {
        return new AppError({ code, message, status: 401 });
    }

    taoRefreshToken() {
        return randomBytes(32).toString('base64url');
    }

    refreshTokenHopLe(token) {
        return typeof token === 'string' && REFRESH_TOKEN.test(token);
    }

    bamRefreshToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }

    async taoAccessToken({ taiKhoanId, phienId, phienBan }) {
        return new SignJWT({ loai: 'access', sid: phienId, pv: Number(phienBan) })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setIssuer(ISSUER)
            .setAudience(AUDIENCE)
            .setSubject(taiKhoanId)
            .setIssuedAt()
            .setExpirationTime(`${this.ACCESS_TOKEN_TTL}s`)
            .sign(this.khoaJwt());
    }

    async xacMinhAccessToken(token) {
        if (typeof token !== 'string' || token.length > 4096) throw this.loiAccessToken();
        let payload;
        try {
            const ketQua = await jwtVerify(token, this.khoaJwt(), {
                issuer: ISSUER,
                audience: AUDIENCE,
                algorithms: ['HS256']
            });
            payload = ketQua.payload;
        } catch (error) {
            if (error.code === 'ERR_JWT_EXPIRED') throw this.loiAccessToken('Access Token đã hết hạn', 'ACCESS_TOKEN_EXPIRED');
            throw this.loiAccessToken();
        }
        const hopLe = payload.loai === 'access'
            && typeof payload.sub === 'string'
            && typeof payload.sid === 'string'
            && UUID.test(payload.sub)
            && UUID.test(payload.sid)
            && Number.isSafeInteger(payload.pv)
            && payload.pv >= 1
            && Number.isInteger(payload.iat)
            && Number.isInteger(payload.exp)
            && payload.exp > payload.iat
            && payload.exp - payload.iat <= this.ACCESS_TOKEN_TTL;
        if (!hopLe) throw this.loiAccessToken();
        return { taiKhoanId: payload.sub, phienId: payload.sid, phienBan: payload.pv };
    }
}

module.exports = new TokenService();