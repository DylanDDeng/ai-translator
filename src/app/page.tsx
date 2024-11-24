'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setError('');
      setTranslatedText('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    if (file.type !== 'text/plain') {
      setError('只支持 .txt 文件');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('翻译请求失败');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : '翻译过程中出现错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!translatedText) return;

    const blob = new Blob([translatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translated-document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          文档翻译工具
        </h1>
        
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-4 text-gray-500"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 16"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">点击上传</span> 或拖拽文件到这里
                </p>
                <p className="text-xs text-gray-500">仅支持 TXT 文件</p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {file && (
            <p className="text-sm text-gray-600">
              已选择文件: {file.name}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '翻译中...' : '开始翻译'}
          </button>

          {translatedText && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">翻译结果：</h2>
                <p className="whitespace-pre-wrap">{translatedText}</p>
              </div>
              
              <button
                onClick={handleDownload}
                className="w-full px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                下载翻译结果
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
