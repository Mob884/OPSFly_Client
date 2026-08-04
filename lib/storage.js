import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

if (!hasAwsCredentials) {
  console.warn('[Storage] AWS not configured — using mock storage. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY to enable real S3 uploads.');
}

const s3Client = hasAwsCredentials
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

// TENANT ISOLATION: organizationId is ALWAYS part of the path.
// This makes it impossible to access another org's files.
function buildFileKey(organizationId, locationId, folder, extension) {
  return `orgs/${organizationId}/locations/${locationId || 'general'}/${folder}/${uuidv4()}.${extension}`;
}

export async function uploadFile(organizationId, locationId, folder, fileBuffer, mimeType, extension) {
  const fileKey = buildFileKey(organizationId, locationId, folder, extension);

  if (!hasAwsCredentials) {
    console.warn(`[Storage] [MOCK UPLOAD] fileKey: ${fileKey} (${mimeType}, ${fileBuffer?.length || 0} bytes) — not actually stored.`);
    return { fileKey, mocked: true };
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    })
  );

  return { fileKey, mocked: false };
}

export async function getSignedFileUrl(fileKey, expiresIn = 3600) {
  // Validate fileKey starts with orgs/ for safety
  if (!fileKey.startsWith('orgs/')) {
    throw new Error('Invalid file key');
  }

  if (!hasAwsCredentials) {
    console.warn(`[Storage] [MOCK SIGNED URL] fileKey: ${fileKey}`);
    return `https://mock-storage.opsfly.local/${fileKey}?mock=true&expiresIn=${expiresIn}`;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(fileKey) {
  if (!fileKey.startsWith('orgs/')) {
    throw new Error('Invalid file key');
  }

  if (!hasAwsCredentials) {
    console.warn(`[Storage] [MOCK DELETE] fileKey: ${fileKey} — not actually stored, nothing to delete.`);
    return { deleted: true, mocked: true };
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
    })
  );

  return { deleted: true, mocked: false };
}

// Validate that a fileKey belongs to an organization.
// Use this before serving any file to prevent cross-tenant access.
export function validateFileOwnership(fileKey, organizationId) {
  return fileKey.startsWith(`orgs/${organizationId}/`);
}
