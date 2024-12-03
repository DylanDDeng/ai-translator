import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS credentials are not properly configured');
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const generateUploadURL = async (key: string) => {
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: process.env.AWS_S3_BUCKET || '',
    Key: key,
    Conditions: [
      ['content-length-range', 0, 104857600], // up to 100 MB
      ['starts-with', '$Content-Type', 'video/'],
    ],
    Expires: 600, // URL expires in 10 minutes
  });

  return { url, fields };
};
