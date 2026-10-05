const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let client = null;
let bucketReadyPromise = null;
function cauHinh() {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const bucket = process.env.STORAGE_BUCKET;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error('Chưa cấu hình STORAGE_ENDPOINT, STORAGE_BUCKET hoặc thông tin truy cập storage');
    if (!client) client = new S3Client({ endpoint, region: process.env.STORAGE_REGION || 'us-east-1', forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
    return { client, bucket };
}
async function damBaoBucket(client, bucket) {
    if (!bucketReadyPromise) {
        bucketReadyPromise = (async () => {
            try {
                await client.send(new HeadBucketCommand({ Bucket: bucket }));
            } catch (error) {
                const bucketChuaTonTai = error?.name === 'NotFound' || error?.name === 'NoSuchBucket' || error?.$metadata?.httpStatusCode === 404;
                if (!bucketChuaTonTai) throw error;
                try {
                    await client.send(new CreateBucketCommand({ Bucket: bucket }));
                } catch (loiTaoBucket) {
                    if (!['BucketAlreadyExists', 'BucketAlreadyOwnedByYou'].includes(loiTaoBucket?.name)) throw loiTaoBucket;
                    await client.send(new HeadBucketCommand({ Bucket: bucket }));
                }
            }
        })().catch(error => {
            bucketReadyPromise = null;
            throw error;
        });
    }
    await bucketReadyPromise;
}
async function taiLen(key, buffer, mimeType) {
    const { client, bucket } = cauHinh();
    await damBaoBucket(client, bucket);
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType, ServerSideEncryption: undefined }));
    return { bucket, key };
}
async function xoa(key, bucket) {
    const cauHinhStorage = cauHinh();
    await cauHinhStorage.client.send(new DeleteObjectCommand({ Bucket: bucket || cauHinhStorage.bucket, Key: key }));
}
async function layNoiDung(key, bucket) {
    const { client } = cauHinh();
    return client.send(new GetObjectCommand({ Bucket: bucket || cauHinh().bucket, Key: key }));
}
async function taoUrlDoc(key, bucket, mimeType, id, duoiTep, expiresIn = 60) {
    const { client } = cauHinh();
    const laAnh = mimeType.startsWith('image/');
    const tenTaiVe = `bookflow-${id}.${duoiTep || 'bin'}`;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: `${laAnh ? 'inline' : 'attachment'}; filename="${tenTaiVe}"`, ResponseContentType: mimeType });
    return getSignedUrl(client, command, { expiresIn });
}
module.exports = { taiLen, xoa, layNoiDung, taoUrlDoc };
