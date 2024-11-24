import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const QWEN_API_KEY = 'sk-xlndenigzaoyatyrfqrdspdzqvymzlfwtdbmmbxqxgzeyyoa';
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

async function translateWithClaude(text: string, targetLang: string, systemPrompt: string, context?: { text: string; translation: string; } | null): Promise<string> {
  const claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });

  try {
    let prompt = `Translate the following text to ${targetLang}:\n\n${text}`;
    
    if (context) {
      prompt = `Context:\nOriginal: ${context.text}\nTranslation: ${context.translation}\n\nNow translate the following text to ${targetLang}, maintaining consistency with the context above:\n\n${text}`;
    }

    const response = await claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      system: systemPrompt,
    });

    if (!response.content || response.content.length === 0) {
      throw new Error('No translation result');
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

    return translatedText;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error('Translation failed');
  }
}

async function translateWithQwen(text: string, targetLang: string, systemPrompt: string, context?: { text: string; translation: string; } | null): Promise<string> {
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
      })
    });

    if (!response.ok) {
      throw new Error('Qwen API request failed');
    }

    const data = await response.json() as QwenAPIResponse;
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Qwen API Error:', error);
    throw new Error('Translation failed');
  }
}

async function translateWithGemini(text: string, targetLang: string, systemPrompt: string): Promise<string> {
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
          maxOutputTokens: 2048,
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
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as GeminiAPIResponse;
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Translation failed');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang, systemPrompt, model, context }: TranslationRequest = await request.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let translatedText: string;

    if (model === 'qwen2.5-72b-Instruct-128k') {
      translatedText = await translateWithQwen(text, targetLang, systemPrompt, context);
    } else if (model === 'gemini-1.5-pro-002') {
      translatedText = await translateWithGemini(text, targetLang, systemPrompt);
    } else {
      translatedText = await translateWithClaude(text, targetLang, systemPrompt, context);
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}
