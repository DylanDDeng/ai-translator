'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

// AI Tools data
const aiTools = [
  {
    id: 'translator',
    name: 'AI Translator',
    description: 'Translate documents and text using advanced AI models like Claude, Gemini, and more.',
    icon: '🌐',
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    path: '/translator'
  },
  {
    id: 'summarizer',
    name: 'AI Extractor',
    description: 'Extract information from Image using advanced AI models like Gemini, GPT and more',
    icon: '📝',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    path: '/summarizer'
  },
  {
    id: 'coder',
    name: 'AI Coder',
    description: 'Generate code snippets and solutions using AI assistance.',
    icon: '💻',
    gradient: 'from-yellow-500 via-orange-500 to-red-500',
    path: '/coder'
  },
  {
    id: 'writer',
    name: 'Word Learner',
    description: 'Master English vocabulary with AI-powered word analysis, examples, and memory tips.',
    icon: '📚',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    path: '/writer'
  },
  {
    id: 'doc-chat',
    name: 'Document Chat',
    description: 'Upload PDF documents and have interactive conversations about their contents with AI.',
    icon: '🤖',
    gradient: 'from-indigo-500 via-purple-500 to-pink-500',
    path: '/doc-chat'
  },
  {
    id: 'extractor',
    name: 'Web Extractor',
    description: 'Extract and summarize content from any webpage using AI technology.',
    icon: '🔍',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    path: '/extractor'
  },
  {
    id: 'assistant',
    name: 'AI Assistant',
    description: 'Your personal AI assistant for tasks, questions, and problem-solving.',
    icon: '🤖',
    gradient: 'from-green-500 via-teal-500 to-cyan-500',
    path: '/assistant'
  },
  {
    id: 'image-generator',
    name: 'AI Image Generator',
    description: 'Create unique images and artwork using AI models.',
    icon: '🎨',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    path: '/image-generator'
  },
  {
    id: 'video-analysis',
    name: 'Video Analysis',
    description: 'Upload and analyze videos using advanced AI models for detailed content understanding.',
    icon: '🎥',
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    path: '/video-analysis'
  }
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#fafaff] relative overflow-hidden w-full">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 bg-gradient-to-br from-pink-100/40 via-blue-100/40 to-purple-100/40" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      <div className="fixed top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-72 h-72 bg-pink-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-20 w-72 h-72 bg-purple-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-6">
              AI Sandbox
            </h1>
            <p className="text-xl text-gray-600">
              Your ultimate toolbox for AI-powered solutions. Explore our collection of powerful AI tools designed to enhance your productivity.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {aiTools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => router.push(tool.path)}
                className="group cursor-pointer perspective-1000"
              >
                <div className="relative transform-gpu transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-2">
                  <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r ${tool.gradient} opacity-70 blur group-hover:opacity-100 transition duration-500`} />
                  <div className="relative bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
                    <div className="text-4xl mb-4">{tool.icon}</div>
                    <h3 className={`text-xl font-semibold bg-gradient-to-r ${tool.gradient} bg-clip-text text-transparent mb-3`}>
                      {tool.name}
                    </h3>
                    <p className="text-gray-600">{tool.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="container mx-auto px-4 py-16 text-center relative">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">
              <span className="bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Unlock the Power of AI
              </span>
            </h2>
            <p className="text-gray-600 mb-8">
              Choose from our collection of AI tools and start exploring the possibilities. Each tool is designed to help you accomplish specific tasks with the power of artificial intelligence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
