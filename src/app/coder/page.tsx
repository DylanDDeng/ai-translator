'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Download, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const AVAILABLE_MODELS = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude-3 Opus',
  },
]

export default function AICoder() {
  const [code, setCode] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id)

  const generateCode = async () => {
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: code,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate code')
      }

      const data = await response.json()
      setResponse(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([response], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-code.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="backdrop-blur-sm bg-white/80 shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 ring-1 ring-black/5">
            <CardContent className="p-6 space-y-6">
              {/* Model Selection */}
              <div className="space-y-3 mb-6">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 animate-gradient">
                  AI Model
                </h3>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id} className="py-2">
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Select an AI model for code generation. Different models may have varying capabilities.
                </p>
              </div>

              {/* Code Input */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 animate-gradient">
                  Your Request
                </h3>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Describe what code you want to generate..."
                  className="w-full h-64 p-4 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                />
                <Button
                  onClick={generateCode}
                  disabled={loading || !code.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Send className="w-4 h-4 mr-2" />
                      Generate Code
                    </div>
                  )}
                </Button>
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Output Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="backdrop-blur-sm bg-white/80 shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 ring-1 ring-black/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 animate-gradient">
                  Generated Code
                </h3>
                {response && (
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                )}
              </div>
              <div className="relative min-h-[400px] bg-gray-50 rounded-lg p-4">
                {response ? (
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {response}
                  </ReactMarkdown>
                ) : (
                  <div className="text-gray-400 text-center mt-20">
                    Generated code will appear here...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
