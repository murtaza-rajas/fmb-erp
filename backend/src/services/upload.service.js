const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { getPresignedUploadUrl, getPresignedViewUrl } = require('../config/s3');
const ApiError = require('../utils/ApiError');
const { aws } = require('../config/env');

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_MODULES = ['invoice', 'grn', 'debit_note', 'vendor'];

function assertStorageConfigured() {
  if (!aws.accessKeyId || !aws.secretAccessKey || !aws.s3Bucket) {
    // Unlike email/push (best-effort side channels), there's no meaningful
    // "skip and continue" for a file upload — surface a clear, actionable
    // error rather than letting the AWS SDK's raw credential error (a
    // generic 500) reach the client.
    throw ApiError.internal('File storage is not configured — set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET');
  }
}

// Presigned direct-to-S3 upload — the API never receives the file body (see
// docs/architecture/api-design.md § Uploads). The key is namespaced by
// module and date so objects are easy to browse/lifecycle-manage in the bucket.
async function createPresignedUpload({ module: moduleName, fileName, contentType }) {
  assertStorageConfigured();
  if (!ALLOWED_MODULES.includes(moduleName)) {
    throw ApiError.badRequest(`Unsupported upload module "${moduleName}"`);
  }
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw ApiError.badRequest(`Unsupported content type "${contentType}"`);
  }

  const datePath = dayjs().format('YYYY/MM');
  const fileKey = `${moduleName}/${datePath}/${uuidv4()}-${fileName}`;

  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey, expiresIn: aws.presignExpirySeconds };
}

async function getViewUrl(fileKey) {
  assertStorageConfigured();
  const viewUrl = await getPresignedViewUrl(fileKey);
  return { viewUrl, expiresIn: aws.presignExpirySeconds };
}

module.exports = { createPresignedUpload, getViewUrl };
