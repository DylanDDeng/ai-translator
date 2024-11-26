'use client';

import { useState, FormEvent } from 'react';

interface ChunkStatus {
  originalText: string;
  translatedText: string;
  isTranslating: boolean;
  isEditing: boolean;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<ChunkStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [targetLang, setTargetLang] = useState('zh');
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20241022');
  const [systemPrompt, setSystemPrompt] = useState(`You are a professional translator specialized in accurate and natural translation.
Follow these translation principles:
1. Maintain the original meaning and context
2. Preserve the original formatting and paragraph structure
3. Use natural and idiomatic expressions in the target language
4. Keep any technical terms, proper nouns, or special formatting intact
5. Ensure consistency in terminology throughout the translation
6. If there are any ambiguous terms or cultural references, translate them appropriately
7. Return only the translated text without any explanations or notes`);

  const languages = [
    { code: 'zh', name: 'Chinese (中文)' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'ja', name: 'Japanese (日本語)' },
    { code: 'ko', name: 'Korean (한국어)' },
    { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  ];

  const models = [
    { 
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude-3.5-Sonnet-20241022',
      description: 'Anthropic的Claude-3.5-Sonnet模型，擅长多语言翻译'
    },
    { 
      id: 'qwen2.5-72b-Instruct-128k',
      name: 'Qwen2.5-72B-Instruct-128K',
      description: '通义千问72B大模型，支持多语言翻译'
    },
    {
      id: 'gemini-1.5-pro-002',
      name: 'Gemini-1.5-Pr-002',
      description: 'Google的Gemini-1.5-Pro-002模型，支持多语言翻译'
    },
    {
      id: 'deepseek-chat',
      name: 'Deepseek-Chat',
      description: 'Deepseek大语言模型，支持多语言翻译'
    }
  ];

  const splitTextIntoChunks = (text: string, chunkSize: number = 1000): string[] => {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);
      
      if (end < text.length) {
        // 在当前块中寻找最后一个句子结束符号
        const segment = text.slice(start, end);
        const lastPeriod = Math.max(
          segment.lastIndexOf('。'),
          segment.lastIndexOf('！'),
          segment.lastIndexOf('？'),
          segment.lastIndexOf('!'),
          segment.lastIndexOf('?')
        );
        
        if (lastPeriod !== -1) {
          // 在句子结束符号处断开
          end = start + lastPeriod + 1;
        } else {
          // 如果没找到句子结束符号，向前查找最后一个逗号或分号
          const lastPunct = Math.max(
            segment.lastIndexOf('，'),
            segment.lastIndexOf('；'),
            segment.lastIndexOf(','),
            segment.lastIndexOf(';')
          );
          
          if (lastPunct !== -1) {
            end = start + lastPunct + 1;
          } else {
            // 如果连逗号分号都没有，就在500字符处截断（保守处理）
            end = start + Math.min(500, segment.length);
          }
        }
      }
      
      chunks.push(text.slice(start, end));
      start = end;
    }
    
    return chunks;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/plain') {
      setFile(selectedFile);
      setError('');
      
      try {
        const text = await selectedFile.text();
        const textChunks = splitTextIntoChunks(text);
        setChunks(textChunks.map(chunk => ({
          originalText: chunk,
          translatedText: '',
          isTranslating: false,
          isEditing: false
        })));
      } catch (err) {
        setError('无法读取文件内容，请确保文件格式正确且未损坏');
        setFile(null);
      }
    } else {
      setError('请选择有效的.txt文本文件');
      setFile(null);
    }
  };

  const translateChunk = async (chunkIndex: number) => {
    if (!chunks[chunkIndex]) return;

    const currentChunk = chunks[chunkIndex];
    const previousChunk = chunkIndex > 0 ? chunks[chunkIndex - 1] : null;

    setChunks(prev => prev.map((chunk, idx) => 
      idx === chunkIndex ? { ...chunk, isTranslating: true } : chunk
    ));

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentChunk.originalText,
          targetLang,
          systemPrompt,
          model: selectedModel,
          context: previousChunk ? {
            text: previousChunk.originalText,
            translation: previousChunk.translatedText
          } : null
        }),
      });

      if (!response.ok) {
        throw new Error(`翻译请求失败 (状态码: ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let translatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              translatedText += data.content;
            } catch (e) {
              throw new Error('翻译响应格式错误，请重试');
            }
          }
        }
      }

      if (!translatedText.trim()) {
        throw new Error('翻译结果为空，请重试');
      }

      setChunks(prev => prev.map((chunk, idx) => 
        idx === chunkIndex ? {
          ...chunk,
          translatedText,
          isTranslating: false
        } : chunk
      ));

    } catch (err) {
      console.error('Translation error:', err);
      let errorMessage = '';
      
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = '网络连接错误，请检查网络连接后重试';
        } else if (err.message.includes('timeout')) {
          errorMessage = '请求超时，请重试';
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = '发生未知错误，请重试';
      }
      
      setError(errorMessage);
      setChunks(prev => prev.map((chunk, idx) => 
        idx === chunkIndex ? { ...chunk, isTranslating: false } : chunk
      ));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || chunks.length === 0) return;

    setIsLoading(true);
    setError('');
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        await translateChunk(i);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (chunks.length === 0) return;
    
    const translatedText = chunks.map(chunk => chunk.translatedText).join('\n\n');
    const blob = new Blob([translatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${file?.name || 'text'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditClick = (index: number) => {
    setChunks(prev => prev.map((chunk, idx) => 
      idx === index ? { ...chunk, isEditing: true } : chunk
    ));
  };

  const handleTranslationChange = (index: number, newText: string) => {
    setChunks(prev => prev.map((chunk, idx) => 
      idx === index ? { ...chunk, translatedText: newText } : chunk
    ));
  };

  const handleEditComplete = (index: number) => {
    setChunks(prev => prev.map((chunk, idx) => 
      idx === index ? { ...chunk, isEditing: false } : chunk
    ));
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-[1920px] mx-8 animate-fade-in">
        <div className="flex flex-col items-start mb-8">
          <h1 className="logo-text">Document Translator</h1>
          <div className="designer-text mt-2">Designed by Chengsheng</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-8">
          {/* Left Column - Input Section */}
          <div className="space-y-6">
            <div className="input-section rounded-xl p-6 shadow-soft animate-slide-up">
              <div className="flex flex-col items-center justify-center w-full">
                <label
                  htmlFor="file"
                  className="w-full cursor-pointer"
                >
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-500 transition-colors">
                    {file ? (
                      <div className="text-center">
                        <p className="text-sm text-slate-600">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Click to change file
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-slate-600">
                          Drop your file here or click to select
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports .txt files
                        </p>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="file"
                  id="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="mt-6 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Translation Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-2.5 bg-white/50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 custom-scrollbar backdrop-blur-sm"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Target Language
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full p-2.5 bg-white/50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 custom-scrollbar backdrop-blur-sm"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!file || isLoading}
                  className={`w-full px-4 py-2.5 text-white rounded-lg shadow-sm transition-all duration-300 ${
                    !file || isLoading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Translating...
                    </span>
                  ) : (
                    'Translate'
                  )}
                </button>
              </div>
            </div>

            {/* System Prompt Section */}
            <div className="prompt-section rounded-xl p-6 shadow-soft">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-[calc(100vh-600px)] min-h-[300px] p-2.5 bg-white/50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 custom-scrollbar backdrop-blur-sm resize-none"
              />
            </div>
          </div>

          {/* Right Column - Translation Section */}
          <div className="translation-section rounded-xl p-6 shadow-soft h-[calc(100vh-140px)] overflow-auto custom-scrollbar">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {chunks.length > 0 && (
              <div className="space-y-6">
                {chunks.map((chunk, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">原文：</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{chunk.originalText}</p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500">译文：</h3>
                        <div className="space-x-2">
                          {!chunk.isEditing ? (
                            <button
                              onClick={() => handleEditClick(index)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              编辑
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEditComplete(index)}
                              className="text-sm text-green-600 hover:text-green-800"
                            >
                              完成
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {chunk.isTranslating ? (
                        <div className="animate-pulse bg-gray-100 h-20 rounded"></div>
                      ) : chunk.isEditing ? (
                        <textarea
                          value={chunk.translatedText}
                          onChange={(e) => handleTranslationChange(index, e.target.value)}
                          className="w-full h-32 p-2 border rounded-md focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">{chunk.translatedText}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* 下载按钮 */}
                <button
                  onClick={handleDownload}
                  disabled={chunks.some(chunk => chunk.isTranslating)}
                  className={`w-full mt-4 py-3 px-6 rounded-md text-white font-medium 
                    transform transition-all duration-200 ease-in-out
                    shadow-lg hover:shadow-xl active:scale-95
                    ${chunks.some(chunk => chunk.isTranslating)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-600 hover:via-indigo-600 hover:to-blue-600 hover:-translate-y-0.5'
                    }
                    relative overflow-hidden
                    before:absolute before:inset-0 
                    before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
                    before:translate-x-[-200%] hover:before:translate-x-[200%]
                    before:transition-transform before:duration-700
                    active:before:duration-0
                  `}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    下载翻译结果
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
