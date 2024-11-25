import { NextRequest, NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const HTTPS_PROXY = process.env.HTTPS_PROXY;

const proxyAgent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined;

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Translation App",
  }
});

const API_TIMEOUT = 270000; // 270 秒，给网络延迟和处理时间留出 30 秒的缓冲

async function translateWithClaude(text: string, targetLang: string, systemPrompt: string, context?: { text: string; translation: string; } | null): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: context 
          ? `Context:\nOriginal: ${context.text}\nTranslation: ${context.translation}\n\nNow translate the following text to ${targetLang}, maintaining consistency with the context above:\n\n${text}`
          : `Translate the following text to ${targetLang}:\n\n${text}`
      }
    ];

    const stream = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: messages,
      stream: true,
    });

    let translatedText = '';
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        translatedText += chunk.choices[0].delta.content;
      }
    }

    clearTimeout(timeoutId);

    if (!translatedText.trim()) {
      throw new Error('Empty translation result from Claude');
    }

    return translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Translation request timed out after 270 seconds');
      }
      console.error('Claude translation error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    throw new Error('Translation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function translateWithQwen(text: string, targetLang: string, systemPrompt: string, context?: { text: string; translation: string; } | null): Promise<string> {
  // 创建一个带超时的 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    let prompt = `${systemPrompt}\n\nTranslate the following text to ${targetLang}:\n\n${text}`;
    
    if (context) {
      prompt = `${systemPrompt}\n\nContext:\nOriginal: ${context.text}\nTranslation: ${context.translation}\n\nNow translate the following text to ${targetLang}, maintaining consistency with the context above:\n\n${text}`;
    }

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct-128K",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false,
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        frequency_penalty: 0.5,
        n: 1,
        response_format: {
          type: "text"
        }
      }),
      signal: controller.signal,
      agent: proxyAgent, // 添加代理支持
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Qwen API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Qwen API request failed: ${response.status} - ${errorText}`);
    }

    let data: QwenAPIResponse;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse Qwen API response:', jsonError);
      throw new Error('Invalid JSON response from Qwen API');
    }
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid Qwen API Response:', data);
      throw new Error('Empty response from Qwen API');
    }

    const translatedText = data.choices[0].message.content.trim();
    if (!translatedText) {
      throw new Error('Empty translation result');
    }

    return translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Translation request timed out after 270 seconds');
      }
      if (error.message.includes('fetch failed')) {
        throw new Error('Network error: Unable to connect to Qwen API');
      }
      // 更详细的错误日志
      console.error('Qwen translation error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    throw new Error('Translation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function translateWithGemini(text: string, targetLang: string, systemPrompt: string, context?: { text: string; translation: string; } | null): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const completion = await openai.chat.completions.create({
      model: "google/gemini-pro-1.5",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to ${targetLang}. Keep the original formatting and maintain the meaning and tone of the source text.`
        },
        {
          role: "user",
          content: text
        }
      ],
      stream: true
    }, { signal: controller.signal });

    let translatedText = '';
    for await (const chunk of completion) {
      if (chunk.choices[0]?.delta?.content) {
        translatedText += chunk.choices[0].delta.content;
      }
    }

    clearTimeout(timeoutId);

    if (!translatedText.trim()) {
      throw new Error('Empty translation result from Gemini');
    }

    return translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Gemini translation error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Translation request timed out after 270 seconds');
      }
    }
    throw error;
  }
}

async function translateWithDeepseek(text: string, targetLang: string, systemPrompt: string, context?: { text: string; translation: string; } | null): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: DEEPSEEK_API_KEY
    });

    let prompt = `${systemPrompt}\n\nTranslate the following text to ${targetLang}:\n\n${text}`;
    
    if (context) {
      prompt = `${systemPrompt}\n\nContext:\nOriginal: ${context.text}\nTranslation: ${context.translation}\n\nNow translate the following text to ${targetLang}, maintaining consistency with the context above:\n\n${text}`;
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }, { signal: controller.signal });

    let translatedText = '';
    for await (const chunk of completion) {
      if (chunk.choices[0]?.delta?.content) {
        translatedText += chunk.choices[0].delta.content;
      }
    }

    clearTimeout(timeoutId);

    if (!translatedText.trim()) {
      throw new Error('Empty translation result from Deepseek');
    }

    return translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Translation request timed out after 270 seconds');
      }
    }
    throw new Error('Translation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Translation App",
  }
});

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang, systemPrompt, model, context } = await request.json();

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const writeChunk = async (content: string) => {
      const data = {
        content
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    (async () => {
      try {
        let translatedText;
        switch (model) {
          case 'claude-3-5-sonnet-20241022':
            translatedText = await translateWithClaude(text, targetLang, systemPrompt, context);
            break;
          case 'qwen2.5-72b-Instruct-128k':
            translatedText = await translateWithQwen(text, targetLang, systemPrompt, context);
            break;
          case 'gemini-1.5-pro-002':
            translatedText = await translateWithGemini(text, targetLang, systemPrompt, context);
            break;
          case 'deepseek-chat':
            translatedText = await translateWithDeepseek(text, targetLang, systemPrompt, context);
            break;
          default:
            throw new Error(`Unsupported model: ${model}`);
        }

        await writeChunk(translatedText);
        await writer.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await writeChunk(`Error: ${errorMessage}`);
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process translation request' },
      { status: 500 }
    );
  }
}
