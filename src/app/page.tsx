'use client';

import { useState, FormEvent } from 'react';

interface ChunkStatus {
  originalText: string;
  translatedText: string;
  isTranslating: boolean;
  partialTranslation: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<ChunkStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [targetLang, setTargetLang] = useState('zh');
  const [selectedModel, setSelectedModel] = useState('claude-3-sonnet-20240229');
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
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      description: 'Anthropic的Claude 3 Sonnet模型，擅长多语言翻译'
    },
    { 
      id: 'qwen',
      name: 'Qwen2.5-72B',
      description: '通义千问72B大模型，支持多语言翻译'
    },
    {
      id: 'gemini',
      name: 'Gemini 1.5 Pro',
      description: 'Google的Gemini 1.5 Pro模型，支持多语言翻译'
    }
  ];

  const splitTextIntoChunks = (text: string, chunkSize: number = 2000): string[] => {
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = text.split(/(?<=[.!?。！？])\s+/);
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
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
          partialTranslation: ''
        })));
      } catch (err) {
        setError('Error reading file');
        setFile(null);
      }
    } else {
      setError('Please select a valid .txt file');
      setFile(null);
    }
  };

  const translateChunk = async (chunkIndex: number) => {
    if (!chunks[chunkIndex]) return;

    const currentChunk = chunks[chunkIndex];
    const previousChunk = chunkIndex > 0 ? chunks[chunkIndex - 1] : null;

    setChunks(prev => prev.map((chunk, idx) => 
      idx === chunkIndex ? { ...chunk, isTranslating: true, partialTranslation: '' } : chunk
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;
            
            try {
              const parsedData = JSON.parse(data);
              
              if (parsedData.error) {
                throw new Error(parsedData.error);
              }
              
              if (parsedData.text) {
                setChunks(prev => prev.map((chunk, idx) => 
                  idx === chunkIndex ? {
                    ...chunk,
                    partialTranslation: parsedData.text,
                    translatedText: parsedData.text
                  } : chunk
                ));
              }
            } catch (err) {
              console.error('Error parsing stream data:', err);
            }
          }
        }
      }

      // 确保在流结束时更新状态
      setChunks(prev => prev.map((chunk, idx) => 
        idx === chunkIndex ? {
          ...chunk,
          translatedText: chunk.partialTranslation || chunk.translatedText,
          partialTranslation: '',
          isTranslating: false
        } : chunk
      ));

    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setChunks(prev => prev.map((chunk, idx) => 
        idx === chunkIndex ? { ...chunk, isTranslating: false, partialTranslation: '' } : chunk
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

            {chunks.map((chunk, index) => (
              <div key={index} className="mb-8 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-700">
                    Chunk {index + 1}
                  </h3>
                  {chunk.isTranslating && (
                    <div className="flex items-center text-xs text-indigo-600">
                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
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
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/50 rounded-lg border border-slate-200 backdrop-blur-sm">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {chunk.originalText}
                    </p>
                  </div>

                  {(chunk.translatedText || chunk.partialTranslation) && (
                    <div className={`p-4 bg-white/50 rounded-lg border backdrop-blur-sm transition-all duration-200 ${
                      chunk.isTranslating ? 'border-indigo-200 shadow-indigo-100' : 'border-slate-200'
                    }`}>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {chunk.translatedText || chunk.partialTranslation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {file && chunks.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Download Translation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
