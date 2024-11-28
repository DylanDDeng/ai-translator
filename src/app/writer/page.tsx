'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Book, Volume2, Download, FileDown } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Trash2 } from "lucide-react"

export default function WordLearner() {
  const [word, setWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('claude')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [customFileName, setCustomFileName] = useState('')
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set())
  const [wordAnalyses, setWordAnalyses] = useState<Array<{
    word: string;
    content: string;
    model: string;
    timestamp: number;
    pronunciations?: {
      uk?: string;
      us?: string;
    };
  }>>([])

  const playAudio = async (url: string) => {
    try {
      console.log('Playing audio from URL:', url);
      const audio = new Audio(url);
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play pronunciation');
    }
  };

  const analyzeWord = async () => {
    if (!word.trim()) return

    setLoading(true)
    setError(null)

    try {
      const [analysisResponse, pronResponse] = await Promise.all([
        fetch('/api/word-learn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            word: word.trim(),
            model: selectedModel 
          }),
        }),
        fetch(`/api/pronunciation?word=${encodeURIComponent(word.trim())}`)
      ]);

      const [analysisData, pronData] = await Promise.all([
        analysisResponse.json(),
        pronResponse.json()
      ]);

      if (!analysisResponse.ok) {
        throw new Error(analysisData.error || 'Failed to analyze word')
      }

      setWordAnalyses(prev => [{
        word: word.trim(),
        content: analysisData.content,
        model: selectedModel,
        timestamp: Date.now(),
        pronunciations: pronResponse.ok ? pronData.pronunciations : undefined
      }, ...prev])
      
      setWord('')
    } catch (error) {
      console.error('Error analyzing word:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleWordSelection = (timestamp: number) => {
    const newSelection = new Set(selectedWords);
    if (newSelection.has(timestamp)) {
      newSelection.delete(timestamp);
    } else {
      newSelection.add(timestamp);
    }
    setSelectedWords(newSelection);
  };

  const selectAllWords = () => {
    const allTimestamps = new Set(wordAnalyses.map(analysis => analysis.timestamp));
    setSelectedWords(allTimestamps);
  };

  const deselectAllWords = () => {
    setSelectedWords(new Set());
  };

  const exportAnalyses = (format: 'markdown' | 'txt') => {
    if (wordAnalyses.length === 0) {
      setError('No analyses to export');
      return;
    }

    if (selectedWords.size === 0) {
      setError('Please select at least one word to export');
      return;
    }

    let content = '';
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = customFileName.trim() || `word-analyses-${timestamp}`;

    const selectedAnalyses = wordAnalyses.filter(analysis => 
      selectedWords.has(analysis.timestamp)
    );

    if (format === 'markdown') {
      content = selectedAnalyses.map(analysis => {
        return `# ${analysis.word}\n\n` +
               `*Analyzed with ${analysis.model} on ${new Date(analysis.timestamp).toLocaleString()}*\n\n` +
               `${analysis.content}\n\n` +
               `---\n\n`;
      }).join('');
      filename = filename.endsWith('.md') ? filename : `${filename}.md`;
    } else {
      content = selectedAnalyses.map(analysis => {
        return `${analysis.word.toUpperCase()}\n` +
               `Analyzed with ${analysis.model} on ${new Date(analysis.timestamp).toLocaleString()}\n\n` +
               `${analysis.content}\n\n` +
               `----------------------------------------\n\n`;
      }).join('');
      filename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
    setCustomFileName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title Section */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-transparent bg-clip-text">
            Word Learner
          </h1>
          <p className="text-gray-600">
            Enter a word to get detailed analysis, examples, and memory tips.
          </p>
        </div>

        {/* Search Section */}
        <div className="relative backdrop-blur-sm bg-white/30 p-6 rounded-2xl shadow-lg border border-white/50">
          <div className="flex gap-4 mb-6">
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/50 backdrop-blur-sm border-white/50 hover:bg-white/60 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="claude">Claude</option>
              <option value="qwen">Qwen</option>
            </select>
            
            <div className="relative flex-1">
              <Input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Enter a word..."
                className="w-full bg-white/50 backdrop-blur-sm border-white/50 focus:border-blue-400 focus:ring-blue-400 pl-4 pr-10 py-2 rounded-lg transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    analyzeWord()
                  }
                }}
              />
              <Button
                onClick={analyzeWord}
                disabled={loading || !word.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-white/20 text-gray-500 hover:text-gray-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}

          {wordAnalyses.length > 0 && (
            <Button
              onClick={() => setShowExportDialog(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Export Selected Words
            </Button>
          )}
        </div>

        {/* Word Analyses List */}
        <div className="space-y-4">
          {wordAnalyses.map((analysis, index) => (
            <motion.div
              key={analysis.timestamp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="backdrop-blur-sm bg-white/40 p-6 rounded-2xl shadow-lg border border-white/50 transition-all hover:bg-white/50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedWords.has(analysis.timestamp)}
                    onChange={() => toggleWordSelection(analysis.timestamp)}
                    className="h-5 w-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <h3 className="text-xl font-semibold text-gray-800">{analysis.word}</h3>
                  {analysis.pronunciations && (
                    <div className="flex gap-2">
                      {analysis.pronunciations.uk && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playAudio(analysis.pronunciations!.uk!)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>UK</span>
                        </Button>
                      )}
                      {analysis.pronunciations.us && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playAudio(analysis.pronunciations!.us!)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>US</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Analyzed with {analysis.model} • {new Date(analysis.timestamp).toLocaleTimeString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setWordAnalyses(prev => prev.filter(a => a.timestamp !== analysis.timestamp))
                    }}
                    className="text-gray-500 hover:text-red-500"
                  >
                    Remove
                  </Button>
                </div>
              </div>
              
              <div className="prose prose-gray max-w-none">
                <ReactMarkdown>{analysis.content}</ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black opacity-60"></div>
          <div className="w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl relative z-50 mx-4 rounded-2xl border border-white/50">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                  Export Words
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExportDialog(false)}
                  className="text-gray-700 hover:text-black hover:bg-gray-100/50 rounded-full w-8 h-8 p-0 flex items-center justify-center"
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    File Name
                  </label>
                  <Input
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder="Enter custom file name (optional)"
                    className="w-full bg-white/70 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 text-gray-800 placeholder-gray-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-gray-800">
                      Select Words
                    </label>
                    <div className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllWords}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllWords}
                        className="text-sm font-semibold text-gray-600 hover:text-gray-700 hover:bg-gray-50/50"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm">
                    {wordAnalyses.map((analysis) => (
                      <div
                        key={analysis.timestamp}
                        className="flex items-center gap-3 p-2.5 hover:bg-gray-50/50 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWords.has(analysis.timestamp)}
                          onChange={() => toggleWordSelection(analysis.timestamp)}
                          className="h-4 w-4 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-gray-800 font-medium">{analysis.word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(false)}
                    className="bg-white/70 text-gray-800 hover:text-black hover:bg-gray-50 border-2 border-gray-200 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => exportAnalyses('markdown')}
                    disabled={selectedWords.size === 0}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 border-0 font-semibold"
                  >
                    Export as MD
                  </Button>
                  <Button
                    onClick={() => exportAnalyses('txt')}
                    disabled={selectedWords.size === 0}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 border-0 font-semibold"
                  >
                    Export as TXT
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
