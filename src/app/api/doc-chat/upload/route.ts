import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 创建一个新的 FormData 实例
    const difyFormData = new FormData();
    
    // 将文件转换为 Blob 并添加到 FormData
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    difyFormData.append('file', blob, file.name);
    difyFormData.append('user', 'abc-123');

    const response = await fetch('https://api.dify.ai/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer app-0DAT6RnS9HsMg9Kup83MUdlL',
      },
      // @ts-ignore - FormData 类型问题
      body: difyFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload file');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
