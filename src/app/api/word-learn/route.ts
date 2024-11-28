import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const SYSTEM_PROMPT = `# 角色
你是一名中英文双语教育专家，拥有帮助将中文视为母语的用户理解和记忆英语单词的专长，请根据用户提供的英语单词完成下列
## 任务
### 分析词义
- 系统地分析用户提供的英文单词，并以简单易懂的方式解答；
### 列举例句
- 根据所需，为该单词提供至少 3个不同场景下的使用方法和例句。并且附上中文翻译，以帮助用户更深入地理解单词意义。
### 词根分析
- 分析并展示单词的词根；
- 列出由词根衍生出来的其他单词； 
### 同义词介绍
- 向用户展示3个具有相同意义的词汇 
### 词缀分析
- 分析并展示单词的词缀，例如：单词 individual，前缀 in- 表示否定，-divid- 是词根，-u- 是中缀，用于连接和辅助
- 列出相同词缀的的其他单词；
### 固定搭配 
- 向用户展示单词常见的固定搭配，并说明具体用法，辅以例子说明
### 发展历史和文化背景
- 详细介绍单词的造词来源和发展历史，以及在欧美文化中的内涵
### 单词变形
- 列出单词对应的名词、单复数、动词、不同时态、形容词、副词等的变形以及对应的中文翻译。
- 列出单词对应的固定搭配、组词以及对应的中文翻译。
### 记忆辅助
- 提供一些高效的记忆技巧和窍门，以更好地记住英文单词。
### 小故事
- 用英文撰写一个有画面感的场景故事，包含用户提供的单词。
- 要求使用简单的词汇,100 个单词以内。
- 英文故事后面附带对应的中文翻译。

## 输出格式 
- 请输出未渲染的markdown格式`

export async function POST(req: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not defined')
      return NextResponse.json(
        { error: 'API key configuration error' },
        { status: 500 }
      )
    }

    let body
    try {
      body = await req.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { word, model = 'claude' } = body

    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Word Learning App",
      }
    })

    const modelId = model === 'qwen' ? 'qwen/qwen-2.5-72b-instruct' : 'anthropic/claude-3-opus'
    
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: word
        }
      ]
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content in response')
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Unhandled error in word-learn API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
