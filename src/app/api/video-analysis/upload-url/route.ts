import { NextResponse } from 'next/server';
import { generateUploadSignedUrl } from '@/lib/gcs';

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and content type are required' },
        { status: 400 }
      );
    }

    if (!contentType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid content type. Only video files are allowed.' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const uniqueFilename = `videos/${timestamp}-${randomString}-${filename}`;

    // 获取上传 URL
    const uploadUrl = await generateUploadSignedUrl(uniqueFilename, contentType);

    return NextResponse.json({
      uploadUrl,
      filename: uniqueFilename
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
