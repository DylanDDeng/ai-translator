const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com';

export async function uploadAndAnalyzeVideo(file: File, prompt: string): Promise<string> {
  try {
    // 1. 初始化上传
    const initResponse = await fetch(`${BASE_URL}/upload/v1beta/files?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': file.size.toString(),
        'X-Goog-Upload-Header-Content-Type': file.type,
      },
      body: JSON.stringify({
        file: { display_name: file.name }
      })
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initialize upload');
    }

    // 2. 获取上传 URL
    const uploadUrl = initResponse.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error('Failed to get upload URL');
    }

    // 3. 上传文件
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': file.size.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    const fileInfo = await uploadResponse.json();
    const fileUri = fileInfo.file.uri;

    // 4. 等待处理完成
    let state = fileInfo.file.state;
    const name = fileInfo.file.name;
    
    while (state === 'PROCESSING') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusResponse = await fetch(
        `${BASE_URL}/v1beta/files/${name}?key=${GOOGLE_API_KEY}`
      );
      const statusInfo = await statusResponse.json();
      state = statusInfo.file.state;
    }

    // 5. 生成内容描述
    const analysisResponse = await fetch(
      `${BASE_URL}/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { file_data: { mime_type: "video/mp4", file_uri: fileUri } }
            ]
          }]
        })
      }
    );

    if (!analysisResponse.ok) {
      throw new Error('Failed to analyze video');
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!analysisText) {
      throw new Error('No analysis result received');
    }

    return analysisText;
  } catch (error: any) {
    console.error('Error in uploadAndAnalyzeVideo:', error);
    throw new Error(error.message || 'Failed to process video');
  }
}
