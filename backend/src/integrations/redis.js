const { createClient } = require('redis');

async function kiemTraRedis(cauHinh) {
    const client = createClient({
        socket: {
            host: cauHinh.host,
            port: cauHinh.port,
            connectTimeout: 3000,
            reconnectStrategy: false
        },
        password: cauHinh.password
    });
    client.on('error', () => {});
    try {
        await client.connect();
        if (await client.ping() !== 'PONG') throw new Error('Redis không trả PONG');
    } finally {
        if (client.isOpen) await client.quit().catch(() => client.destroy());
    }
}

module.exports = { kiemTraRedis };