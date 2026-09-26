const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let client = null;
function cauHinh() {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const bucket = process.env.STORAGE_BUCKET;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error('Chưa cấu hình STORAGE_ENDPOINT, STORAGE_BUCKET hoặc thông tin truy cập storage');
    if (!client) client = new S3Client({ endpoint, region: process.env.STORAGE_REGION || 'us-east-1', forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
    return { client, bucket };
}
async function taiLen(key, buffer, mimeType) {
    const { client, bucket } = cauHinh();
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType, ServerSideEncryption: undefined }));
    return { bucket, key };
}
async function xoa(key, bucket) {
    const cauHinhStorage = cauHinh();
    await cauHinhStorage.client.send(new DeleteObjectCommand({ Bucket: bucket || cauHinhStorage.bucket, Key: key }));
}
async function taoUrlDoc(key, bucket, mimeType, id, duoiTep, expiresIn = 60) {
    const { client } = cauHinh();
    const laAnh = mimeType.startsWith('image/');
    const tenTaiVe = `bookflow-${id}.${duoiTep || 'bin'}`;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: `${laAnh ? 'inline' : 'attachment'}; filename="${tenTaiVe}"`, ResponseContentType: mimeType });
    return getSignedUrl(client, command, { expiresIn });
}
module.exports = { taiLen, xoa, taoUrlDoc };