import { NextResponse } from 'next/server';
import { FormData } from 'formdata-node';
import { Blob } from 'buffer';

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

    // Create a new FormData instance for the Dify API
    const difyFormData = new FormData();
    difyFormData.append('file', file);
    difyFormData.append('user', 'abc-123');

    const response = await fetch('https://api.dify.ai/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer app-0DAT6RnS9HsMg9Kup83MUdlL',
      },
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
