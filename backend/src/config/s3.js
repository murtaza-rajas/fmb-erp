const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { aws } = require('./env');

const s3Client = new S3Client({
  region: aws.region,
  credentials: aws.accessKeyId
    ? { accessKeyId: aws.accessKeyId, secretAccessKey: aws.secretAccessKey }
    : undefined,
});

async function getPresignedUploadUrl(fileKey, contentType) {
  const command = new PutObjectCommand({
    Bucket: aws.s3Bucket,
    Key: fileKey,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: aws.presignExpirySeconds });
}

async function getPresignedViewUrl(fileKey) {
  const command = new GetObjectCommand({ Bucket: aws.s3Bucket, Key: fileKey });
  return getSignedUrl(s3Client, command, { expiresIn: aws.presignExpirySeconds });
}

module.exports = { s3Client, getPresignedUploadUrl, getPresignedViewUrl };
