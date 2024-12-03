import { Storage } from '@google-cloud/storage';

if (!process.env.GOOGLE_CLOUD_PROJECT || !process.env.GOOGLE_CLOUD_BUCKET) {
  throw new Error('Google Cloud credentials are not properly configured');
}

// 创建 Storage 客户端
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

export const generateUploadSignedUrl = async (filename: string, contentType: string) => {
  const [url] = await bucket.file(filename).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  });

  return url;
};

export const generateReadSignedUrl = async (filename: string) => {
  const [url] = await bucket.file(filename).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return url;
};
