'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#fafaff] relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100/40 via-blue-100/40 to-purple-100/40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-72 h-72 bg-pink-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-20 w-72 h-72 bg-purple-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Text Content */}
            <div className="flex-1 text-center md:text-left">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 rounded-lg blur opacity-20"></div>
                <h1 className="relative text-5xl font-bold bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-6">
                  AI-Powered Document Translation
                </h1>
              </div>
              <p className="text-xl text-gray-600 mb-8">
                Translate your documents with advanced AI models. Fast, accurate, and secure.
              </p>
              <button
                onClick={() => router.push('/translator')}
                className="bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 hover:from-pink-600 hover:via-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                Start Translating
              </button>
            </div>
            
            {/* Hero Image */}
            <div className="flex-1 relative w-full max-w-lg">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 rounded-lg blur opacity-20"></div>
              <div className="relative w-full h-[400px] bg-white/50 backdrop-blur-sm rounded-lg p-2">
                <Image
                  src="/ai-translator.png"
                  alt="AI Translator Interface"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                  className="drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative bg-white/60 backdrop-blur-sm py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Key Features
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title="Multiple AI Models"
                description="Choose from various AI models including Claude, Gemini, and more for optimal translation results."
                icon="🤖"
              />
              <FeatureCard
                title="Context-Aware"
                description="Maintains translation consistency with context-aware processing."
                icon="🔄"
              />
              <FeatureCard
                title="Real-time Translation"
                description="Experience fast, streaming translations with real-time progress updates."
                icon="⚡"
              />
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="container mx-auto px-4 py-16 text-center relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 rounded-lg blur opacity-10"></div>
          <h2 className="relative text-3xl font-bold mb-6">
            <span className="bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Ready to translate your documents?
            </span>
          </h2>
          <button
            onClick={() => router.push('/translator')}
            className="bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 hover:from-pink-600 hover:via-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          >
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-300"></div>
      <div className="relative bg-white/50 backdrop-blur-sm p-6 rounded-lg text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
