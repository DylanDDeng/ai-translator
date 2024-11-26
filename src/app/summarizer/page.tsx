'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Download, Upload, Image as ImageIcon } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'
import { motion } from 'framer-motion'

// 定义可用的模型
const AVAILABLE_MODELS = [
  { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision', provider: 'OpenRouter' },
  { id: 'google/gemini-flash-1.5-8b', name: 'Gemini Flash', provider: 'OpenRouter' },
] as const

export default function ImageToText() {
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)
      setError(null)

      // Create image preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const extractText = async () => {
    if (!image || !imagePreview) return

    setLoading(true)
    setError(null)
    try {
      const base64Image = imagePreview.split(',')[1]

      if (!base64Image) {
        throw new Error('Failed to process image')
      }

      const response = await fetch('/api/image-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          model: selectedModel
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }
        throw new Error(data.error || 'Failed to extract text')
      }

      setExtractedText(data.text)
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Failed to extract text')
      setExtractedText('')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (!extractedText) return

    try {
      const element = document.createElement('a')
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(extractedText)
      )
      element.setAttribute('download', 'extracted-text.txt')
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaff] p-6 relative overflow-hidden">
      {/* 更现代的背景效果 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(120,119,198,0.15),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(193,193,255,0.15),transparent_50%)]" />
      <div className="fixed top-0 left-0 w-full h-full">
        <div className="absolute top-20 -left-32 w-64 h-64 bg-purple-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute bottom-32 right-32 w-64 h-64 bg-yellow-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-20 w-64 h-64 bg-pink-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* 内容区域 */}
      <div className="relative z-10 container mx-auto max-w-6xl">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-center mb-8"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
            Image Text Extractor
          </span>
        </motion.h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左侧列 - 上传和预览 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="backdrop-blur-sm bg-white/80 shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 ring-1 ring-black/5">
              <CardContent className="p-6 space-y-6">
                {/* 模型选择 */}
                <div className="space-y-2">
                  <label htmlFor="model-select" className="block text-sm font-medium text-gray-700">
                    AI Model
                  </label>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 文件上传区域 */}
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white/50 border-2 border-gray-200 border-dashed rounded-lg cursor-pointer hover:bg-gray-50/50 hover:border-purple-500"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </label>
                  </div>

                  <Button
                    onClick={extractText}
                    disabled={!image || loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 py-5"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Extract Text
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                    <p className="font-medium">Error</p>
                    <p>{error}</p>
                  </div>
                )}

                {/* 图片预览 */}
                {imagePreview && (
                  <div className="mt-4 space-y-2">
                    <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                    <div className="relative w-full h-[300px] rounded-lg overflow-hidden bg-gray-100/50 backdrop-blur-sm">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 右侧列 - 提取的文本 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="backdrop-blur-sm bg-white/80 shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 ring-1 ring-black/5">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Extracted Text</h3>
                  {extractedText && (
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 hover:bg-purple-50 border-purple-200 text-purple-700"
                    >
                      <Download className="h-4 w-4" />
                      Download TXT
                    </Button>
                  )}
                </div>
                <div className="h-[600px] overflow-y-auto rounded-lg bg-white/50 backdrop-blur-sm">
                  {extractedText ? (
                    <div className="p-4 prose prose-sm max-w-none">
                      <ReactMarkdown>{extractedText}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <ImageIcon className="h-12 w-12 mb-4 text-gray-400" />
                      <p className="text-center">
                        Upload an image and click "Extract Text" to see the results here
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
