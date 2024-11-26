import { NextResponse } from 'next/server'

// 定义支持的模型配置
const MODEL_CONFIGS = {
  'gpt-4-vision-preview': {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: {
      'HTTP-Referer': process.env.APP_URL,
      'X-Title': 'AI Sandbox',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
    }
  },
  'google/gemini-flash-1.5-8b': {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: {
      'HTTP-Referer': process.env.APP_URL,
      'X-Title': 'AI Sandbox',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
    }
  }
} as const

export async function POST(req: Request) {
  try {
    const { image, model } = await req.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    if (!model || !MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      )
    }

    const modelConfig = MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS]

    // 构建请求体
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract all the text from this image and format it nicely. Return ONLY the extracted text, no additional comments.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${image}`
              }
            }
          ]
        }
      ]
    }

    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...modelConfig.headers
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('API Error:', error)
      return NextResponse.json(
        { error: 'Failed to process image' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const extractedText = data.choices[0].message.content

    return NextResponse.json({ text: extractedText })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
