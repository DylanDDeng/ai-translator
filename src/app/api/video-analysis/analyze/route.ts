import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { blobUrl, prompt } = await request.json();

    if (!blobUrl) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing blob URL' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Call Google API with the video URL
    console.log('Calling Google API with blob URL:', blobUrl);
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
              { file_data: { mime_type: 'video/mp4', file_uri: blobUrl } }
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
