import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const QWEN_API_KEY = process.env.QWEN_API_KEY || 'sk-xlndenigzaoyatyrfqrdspdzqvymzlfwtdbmmbxqxgzeyyoa';
const GEMINI_API_KEY = 'AIzaSyCZ4FSL7P_bL2fL_F53fBcSskpJCydJbEM';
const HTTPS_PROXY = process.env.HTTPS_PROXY;

const proxyAgent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined;

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  httpAgent: proxyAgent,
});

interface TranslationRequest {
  text: string;
  targetLang: string;
  systemPrompt: string;
  model: string;
  context?: {
    text: string;
    translation: string;
  } | null;
}

interface QwenAPIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface GeminiAPIResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

// 设置统一的超时时间常量
const API_TIMEOUT = 270000; // 270 秒，给网络延迟和处理时间留出 30 秒的缓冲

async function translateWithClaude(text: string, targetLang: string, systemPrompt: string, context?: { text: string; translation: string; } | null): Promise<string> {
  const claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxRetries: 0, // 禁用自动重试
  });

  // 创建一个带超时的 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    let prompt = `Translate the following text to ${targetLang}:\n\n${text}`;
    
    if (context) {
      prompt = `Context:\nOriginal: ${context.text}\nTranslation: ${context.translation}\n\nNow translate the following text to ${targetLang}, maintaining consistency with the context above:\n\n${text}`;
    }

    const response = await claude.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      system: systemPrompt,
    }, {
      signal: controller.signal,
      timeout: API_TIMEOUT
    });

    clearTimeout(timeoutId);

    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude API');
    }

    // Extract text from the response content
    const translatedText = response.content
      .map(block => {
        if (block.type === 'text') {
          return block.text;
        }
        return '';
      })
      .join('');

    if (!translatedText.trim()) {
      throw new Error('Empty translation result');
    }

    return translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Translation request timed out after 270 seconds');
      }
      if (error.message.includes('status code')) {
        throw new Error(`Claude API error: ${error.message}`);
      }
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
        'Authorization': `Bearer ${process.env.QWEN_API_KEY || ''}`,
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
      timeout: API_TIMEOUT
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

async function translateWithGemini(text: string, targetLang: string, systemPrompt: string): Promise<string> {
  // 创建一个带超时的 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY || '',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nTranslate the following text to ${targetLang}:\n\n${text}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
      signal: controller.signal,
      agent: proxyAgent,
      timeout: API_TIMEOUT
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as GeminiAPIResponse;
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini API Response:', data);
      throw new Error('Empty response from Gemini API');
    }

    const translatedText = data.candidates[0].content.parts[0].text.trim();
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
        throw new Error('Network error: Unable to connect to Gemini API');
      }
    }
    
    throw new Error('Translation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang, model = 'claude-3-sonnet-20240229', systemPrompt, context } = await request.json() as TranslationRequest;

    // Create a new TransformStream for streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start the streaming response
    const response = new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Prepare the messages array
    const messages = [];
    
    // Add system message if provided
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    // Add context if provided
    if (context) {
      messages.push({
        role: 'user',
        content: `Previous translation example:\nOriginal: ${context.text}\nTranslation: ${context.translation}`
      });
      messages.push({
        role: 'assistant',
        content: 'I understand the translation style from the example.'
      });
    }
    
    // Add the current text to translate
    messages.push({
      role: 'user',
      content: `Translate the following text to ${targetLang}:\n${text}`
    });

    // Start the streaming request to Claude
    const stream_response = await anthropic.messages.create({
      messages: messages,
      model: model,
      max_tokens: 1024,
      stream: true,
    });

    // Process the stream
    for await (const chunk of stream_response) {
      if (chunk.type === 'content_block_delta') {
        const text = chunk.delta.text;
        if (text) {
          // Write each chunk to the stream
          await writer.write(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
        }
      }
    }

    // Close the stream
    await writer.close();
    return response;

  } catch (error) {
    console.error('Streaming error:', error);
    return NextResponse.json(
      { error: 'An error occurred during translation' },
      { status: 500 }
    );
  }
}
