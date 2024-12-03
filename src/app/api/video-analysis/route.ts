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
    const { filename, prompt } = await req.json();

    if (!filename) {
      return NextResponse.json(
        { error: 'No filename provided' },
        { status: 400 }
      );
    }

    try {
      // 获取视频的访问 URL
      const videoUrl = await generateReadSignedUrl(filename);

      // 调用 Gemini API 分析视频
      const result = await model.generateContent([
        prompt || 'Please analyze this video and describe what you see.',
        {
          inlineData: {
            mimeType: 'video/mp4',
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
