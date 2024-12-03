import { createPresignedUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing filename or contentType' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const { url: uploadUrl, blob } = await createPresignedUrl(
      filename,
      {
        contentType,
        access: 'public',
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );

    return new NextResponse(
      JSON.stringify({ 
        uploadUrl,
        blobUrl: blob.url,
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: any) {
    console.error('Error creating presigned URL:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Failed to create upload URL' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
