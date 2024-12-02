import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { fileId, query } = await req.json();

    if (!fileId || !query) {
      return NextResponse.json(
        { error: 'File ID and query are required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.dify.ai/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer app-0DAT6RnS9HsMg9Kup83MUdlL',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          document: {
            type: 'document',
            transfer_method: 'local_file',
            upload_file_id: fileId,
          },
        },
        query: query,
        response_mode: 'blocking',
        user: 'abc-123',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get response');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error chatting with document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to chat' },
      { status: 500 }
    );
  }
}
