import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;

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
    console.log('Starting video analysis request');
    
    // 验证环境变量
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not set');
      return new NextResponse(
        JSON.stringify({ error: 'Server configuration error: BLOB_READ_WRITE_TOKEN missing' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prompt = formData.get('prompt') as string;

    if (!file) {
      console.error('No file provided');
      return new NextResponse(
        JSON.stringify({ error: 'No file provided' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // 验证文件类型和大小
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    if (!file.type.startsWith('video/')) {
      console.error('Invalid file type:', file.type);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid file type. Please upload a video file.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB
      console.error('File too large:', file.size);
      return new NextResponse(
        JSON.stringify({ error: 'File too large. Maximum size is 100MB.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Upload to Vercel Blob
    console.log('Uploading to Vercel Blob...');
    try {
      const blob = await put(file.name, file, {
        access: 'public',
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (!blob || !blob.url) {
        throw new Error('Failed to get blob URL');
      }

      console.log('Upload successful, blob URL:', blob.url);

      // Call Google API with the video URL
      console.log('Calling Google API...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt || 'Please analyze this video and describe what you see.' },
                { file_data: { mime_type: file.type, file_uri: blob.url } }
              ]
            }]
          })
        }
      );

      const responseText = await response.text();
      console.log('Google API response:', responseText);

      if (!response.ok) {
        return new NextResponse(
          JSON.stringify({ error: `Failed to analyze video: ${responseText}` }),
          { 
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }

      try {
        const data = JSON.parse(responseText);
        console.log('Analysis successful');
        return new NextResponse(
          JSON.stringify(data),
          { 
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      } catch (parseError) {
        console.error('Failed to parse Google API response:', parseError);
        return new NextResponse(
          JSON.stringify({ error: 'Invalid response from analysis service' }),
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
    } catch (uploadError: any) {
      console.error('Blob upload error:', uploadError);
      return new NextResponse(
        JSON.stringify({ error: `Failed to upload video: ${uploadError.message}` }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
  } catch (error: any) {
    console.error('General error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
