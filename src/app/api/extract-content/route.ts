import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.dify.ai/v1/workflows/run', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer app-mBYfnWgr3DxeIjwzYtVci1rg',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          URL: url
        },
        response_mode: "blocking",
        user: "abc-123"
      })
    });

    const data = await response.json();
    
    // 提取文本内容
    const text = data.data?.outputs?.text || '';
    
    // 处理 Unicode 转义序列
    const decodedText = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => 
      String.fromCharCode(parseInt(hex, 16))
    );

    return NextResponse.json({ 
      summary: decodedText,
      taskId: data.task_id
    });
  } catch (error: any) {
    console.error('Error extracting content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract content' },
      { status: 500 }
    );
  }
}
