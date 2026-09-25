async function kiemTraStorage(cauHinh) {
    const response = await fetch(cauHinh.healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) throw new Error('Storage healthcheck thất bại');
}

module.exports = { kiemTraStorage };