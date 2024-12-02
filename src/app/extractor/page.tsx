'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ContentExtractor() {
  const [url, setUrl] = useState('')
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const extractContent = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');

    try {
      const response = await fetch('/api/extract-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSummary(data.summary);
    } catch (error) {
      setError('Failed to extract content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            Web Content Extractor
          </h1>
          <p className="text-gray-600">
            Enter a URL to extract and summarize its content using AI
          </p>
        </div>

        {/* 输入卡片 */}
        <Card className="p-6 backdrop-blur-lg bg-white/30 border border-white/50">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL..."
                className="flex-1 bg-white/50 border-white/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    extractContent();
                  }
                }}
              />
              <Button
                onClick={extractContent}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 transition-opacity"
              >
                {isLoading ? 'Extracting...' : 'Extract'}
              </Button>
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </Card>

        {/* 结果卡片 */}
        {summary && (
          <Card className="p-6 backdrop-blur-lg bg-white/30 border border-white/50">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              Summary
            </h2>
            <div className="prose prose-blue max-w-none">
              {summary.split('\n').map((paragraph, index) => (
                paragraph && <p key={index} className="text-gray-700">{paragraph}</p>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
