'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Download, Send, Code2, Wand2, Play } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Checkbox } from '@/components/ui/checkbox'
import {
  SandpackProvider,
  SandpackPreview,
} from '@codesandbox/sandpack-react/unstyled'

const AVAILABLE_MODELS = [
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct',
    name: 'Qwen Coder',
    description: 'Specialized in code generation and understanding'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient, good for simpler tasks'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude-3 Opus',
    description: 'Excellent at following detailed instructions'
  },
] as const

interface CodeOptions {
  typescript: boolean
  tailwind: boolean
  responsive: boolean
  animation: boolean
  accessibility: boolean
  darkMode: boolean
}

const sandpackConfig = {
  template: "react-ts" as const,
  files: {
    "/App.tsx": "",
    "/index.html": `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>React App</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>`,
    "/index.tsx": `import { StrictMode } from "react";
      import { createRoot } from "react-dom/client";
      import App from "./App";
      
      const rootElement = document.getElementById("root");
      if (!rootElement) {
        throw new Error("Root element not found");
      }
      const root = createRoot(rootElement);
      
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );`
  },
  customSetup: {
    dependencies: {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0"
    }
  },
  options: {
    autorun: true,
    showNavigator: true,
    showRefreshButton: true,
    showLineNumbers: true,
    showInlineErrors: true,
    recompileMode: "immediate",
    recompileDelay: 300
  }
} as const;

export default function AICoder() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id)
  const [showPreview, setShowPreview] = useState(false)
  const [options, setOptions] = useState<CodeOptions>({
    typescript: true,
    tailwind: true,
    responsive: true,
    animation: false,
    accessibility: true,
    darkMode: false,
  })

  const generateCode = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          options,
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

  const toggleOption = (option: keyof CodeOptions) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-5 gap-6">
        {/* Input Section - 2 columns */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2"
        >
          <Card className="backdrop-blur-sm bg-white/80 shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 ring-1 ring-black/5">
            <CardContent className="p-6 space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 animate-gradient flex items-center gap-2">
                  <Wand2 className="w-6 h-6" />
                  AI Model
                </h3>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Code Options */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 animate-gradient flex items-center gap-2">
                  <Code2 className="w-6 h-6" />
                  Code Options
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="typescript"
                      checked={options.typescript}
                      onCheckedChange={() => toggleOption('typescript')}
                    />
                    <label htmlFor="typescript" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      TypeScript
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="tailwind"
                      checked={options.tailwind}
                      onCheckedChange={() => toggleOption('tailwind')}
                    />
                    <label htmlFor="tailwind" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Tailwind CSS
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="responsive"
                      checked={options.responsive}
                      onCheckedChange={() => toggleOption('responsive')}
                    />
                    <label htmlFor="responsive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Responsive
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="animation"
                      checked={options.animation}
                      onCheckedChange={() => toggleOption('animation')}
                    />
                    <label htmlFor="animation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Animations
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="accessibility"
                      checked={options.accessibility}
                      onCheckedChange={() => toggleOption('accessibility')}
                    />
                    <label htmlFor="accessibility" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Accessibility
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="darkMode"
                      checked={options.darkMode}
                      onCheckedChange={() => toggleOption('darkMode')}
                    />
                    <label htmlFor="darkMode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Dark Mode
                    </label>
                  </div>
                </div>
              </div>

              {/* Code Request */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 animate-gradient">
                  Your Request
                </h3>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what code you want to generate... (e.g., 'Create a responsive navigation bar with a logo, links, and a mobile menu')"
                  className="w-full h-48 p-4 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                />
                <Button
                  onClick={generateCode}
                  disabled={loading || !prompt.trim()}
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

        {/* Output Section - 3 columns */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-3"
        >
          <Card className="backdrop-blur-sm bg-white/80 shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 ring-1 ring-black/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 animate-gradient">
                  {showPreview ? 'Preview Result' : 'Generated Code'}
                </h3>
                <div className="flex gap-2">
                  {response && (
                    <>
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      <Button
                        onClick={() => setShowPreview(!showPreview)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {showPreview ? 'Show Code' : 'Preview'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {showPreview ? (
                <div className="h-[800px]">
                  <SandpackProvider
                    {...sandpackConfig}
                    files={{
                      ...sandpackConfig.files,
                      "/App.tsx": response
                    }}
                  >
                    <SandpackPreview
                      className="h-full w-full"
                      showNavigator
                      showRefreshButton
                    />
                  </SandpackProvider>
                </div>
              ) : (
                <div className="h-[800px] bg-gray-50 rounded-lg overflow-auto">
                  {response ? (
                    <ReactMarkdown className="prose prose-sm max-w-none p-4">
                      {`\`\`\`typescript\n${response}\n\`\`\``}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-gray-400 text-center mt-20">
                      Your generated code will appear here...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
