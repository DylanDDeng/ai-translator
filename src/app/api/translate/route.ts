import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '没有提供文本内容' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          "role": "system",
          "content": "你是一个专业的翻译助手，请将用户提供的文本翻译成中文。保持原文的格式和段落结构。"
        },
        {
          "role": "user",
          "content": text
        }
      ]
    });

    const translatedText = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: '翻译过程中出现错误' },
      { status: 500 }
    );
  }
}
