import { NextResponse } from 'next/server';
import { generateUploadSignedUrl, generateReadSignedUrl } from '@/lib/gcs';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 300;

// 初始化 Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prompt = formData.get('prompt') as string || 'Please analyze this video and describe what you see.';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 验证文件类型和大小
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filename = `videos/${timestamp}-${randomString}-${file.name}`;

    try {
      // 获取上传 URL
      const uploadUrl = await generateUploadSignedUrl(filename, file.type);

      // 上传文件
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to Google Cloud Storage');
      }

      // 获取视频的访问 URL
      const videoUrl = await generateReadSignedUrl(filename);

      // 调用 Gemini API 分析视频
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: file.type,
            data: videoUrl
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      return NextResponse.json({
        analysis: text,
        videoUrl: videoUrl
      });

    } catch (error: any) {
      console.error('Error processing video:', error);
      return NextResponse.json(
        { error: `Failed to process video: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('General error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
