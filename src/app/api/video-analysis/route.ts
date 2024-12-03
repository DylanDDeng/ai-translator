import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    console.log('Starting video analysis request');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prompt = formData.get('prompt') as string;

    if (!file) {
      console.error('No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Upload to Vercel Blob
    console.log('Uploading to Vercel Blob...');
    try {
      const { url } = await put(file.name, file, {
        access: 'public',
        addRandomSuffix: true,
      });
      console.log('Upload successful, blob URL:', url);

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
                { text: prompt },
                { file_data: { mime_type: file.type, file_uri: url } }
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google API error:', errorText);
        return NextResponse.json(
          { error: `Failed to analyze video: ${errorText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('Analysis successful');
      return NextResponse.json(data);
    } catch (uploadError: any) {
      console.error('Blob upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload video: ${uploadError.message}` },
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
