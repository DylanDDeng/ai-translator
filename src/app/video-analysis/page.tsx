'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function VideoAnalysis() {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('请用中文描述这个视频片段');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型和大小
      if (!file.type.startsWith('video/')) {
        setError('Please upload a valid video file');
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }

      setSelectedFile(file);
      setCurrentFileName(file.name);
      setError('');
      setUploadProgress('File selected and ready for upload');
      setVideoUrl(null);
      setAnalysis(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a video file first');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysis('');
    setVideoUrl(null);
    setUploadProgress('Starting upload...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('prompt', prompt || 'Please analyze this video and describe what you see.');

      setUploadProgress('Uploading to server...');
      const response = await fetch('/api/video-analysis', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setUploadProgress('Processing video...');
      
      if (!data.analysis) {
        throw new Error('No analysis result received from the server');
      }

      setUploadProgress('Analysis complete!');
      setAnalysis(data.analysis);
      setVideoUrl(data.videoUrl);
    } catch (error: any) {
      console.error('Error in video analysis:', error);
      setError(error.message || 'Failed to analyze video');
      setUploadProgress('Upload failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Video Analysis
          </h1>
          <p className="text-gray-600">
            Upload a video and let AI analyze its content
          </p>
        </div>

        {/* File Upload Section */}
        <div className="mb-8">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white/50 backdrop-blur-sm border-gray-300 hover:bg-white/60 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                ) : currentFileName ? (
                  <>
                    <svg className="w-8 h-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-gray-600">{currentFileName}</p>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">Video files only (max 100MB)</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="video/*"
                onChange={handleVideoUpload}
                disabled={isUploading || isAnalyzing}
              />
            </label>
          </div>
          {uploadProgress && (
            <div className="mt-2 text-sm text-gray-600">
              {uploadProgress}
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Analysis Prompt
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your analysis prompt..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isAnalyzing}
            />
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing || !prompt.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            {error}
          </motion.div>
        )}

        {/* Analysis Result */}
        {isAnalyzing ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
              <p className="text-gray-600">Analyzing video content...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
            </div>
          </div>
        ) : (analysis || videoUrl) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-sm rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Analysis Result</h2>
            
            {/* Video Preview */}
            {videoUrl && (
              <div className="mb-6">
                <video
                  controls
                  className="w-full rounded-lg shadow-lg"
                  src={videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            
            {/* Analysis Text */}
            {analysis && (
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{analysis}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
