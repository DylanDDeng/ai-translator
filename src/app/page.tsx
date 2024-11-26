'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          AI-Powered Document Translation
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Translate your documents with advanced AI models. Fast, accurate, and secure.
        </p>
        <button
          onClick={() => router.push('/translator')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors duration-200"
        >
          Start Translating
        </button>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Key Features
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
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Ready to translate your documents?
        </h2>
        <button
          onClick={() => router.push('/translator')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors duration-200"
        >
          Get Started Now
        </button>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg text-center hover:shadow-lg transition-shadow duration-200">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
