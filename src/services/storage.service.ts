import { Storage } from '@google-cloud/storage';

let storage: Storage;
const bucketName = process.env.GCS_BUCKET_NAME || 'talksy-media-noticeboard';

if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
  try {
    const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
    storage = new Storage({
      projectId: credentials.project_id,
      credentials
    });
  } catch (err) {
    console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY env var:', err);
    storage = new Storage();
  }
} else {
  storage = new Storage();
}

/**
 * Uploads a buffer to Google Cloud Storage and returns the public URL.
 */
export async function uploadFile(filename: string, buffer: Buffer, contentType: string): Promise<string> {
  const bucket = storage.bucket(bucketName);
  
  // Ensure the bucket exists or create it if missing
  try {
    const [exists] = await bucket.exists();
    if (!exists) {
      await storage.createBucket(bucketName, {
        location: 'asia-south1',
        regional: true
      });
      console.log(`Created GCS bucket: ${bucketName}`);
    }
  } catch (err) {
    console.warn(`Bucket check/creation warning (might already exist or permission restricted):`, err);
  }

  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000',
    },
    resumable: false
  });

  return `https://storage.googleapis.com/${bucketName}/${filename}`;
}

/**
 * Deletes a file from Google Cloud Storage based on its URL.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl.includes(`storage.googleapis.com/${bucketName}/`)) return;
  const filename = fileUrl.split(`storage.googleapis.com/${bucketName}/`)[1];
  if (!filename) return;

  try {
    const bucket = storage.bucket(bucketName);
    await bucket.file(filename).delete();
    console.log(`Deleted file from GCS: ${filename}`);
  } catch (err) {
    console.error(`Failed to delete file from GCS:`, err);
  }
}
