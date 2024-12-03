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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file');
      return;
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      setError('Video file size should be less than 100MB');
      return;
    }

    setError(null);
    setAnalysis(null);
    setSelectedFile(file);
    setCurrentFileName(file.name);
    setVideoUrl(null);
    setUploadProgress('File selected and ready for upload');
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a video first');
      return;
    }

    setIsUploading(true);
    setError('');
    setAnalysis('');
    setVideoUrl(null);
    setUploadProgress('Starting upload to Gemini API...');

    try {
      // 1. 初始化上传
      setUploadProgress('Initializing upload...');
      const initResponse = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': selectedFile.size.toString(),
            'X-Goog-Upload-Header-Content-Type': selectedFile.type,
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': 'content-type,x-goog-upload-protocol,x-goog-upload-command,x-goog-upload-header-content-length,x-goog-upload-header-content-type',
            'Access-Control-Request-Method': 'POST'
          },
          body: JSON.stringify({
            file: { display_name: selectedFile.name }
          })
        }
      );

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('Upload initialization failed:', errorText);
        throw new Error('Failed to initialize upload: ' + errorText);
      }

      // 2. 获取上传 URL
      const uploadUrl = initResponse.headers.get('x-goog-upload-url');
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      // 3. 上传文件
      setUploadProgress('Uploading file to Gemini...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': selectedFile.size.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
          'Access-Control-Request-Headers': 'content-length,x-goog-upload-offset,x-goog-upload-command',
          'Access-Control-Request-Method': 'POST'
        },
        body: selectedFile
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('File upload failed:', errorText);
        throw new Error('Failed to upload file: ' + errorText);
      }

      const fileInfo = await uploadResponse.json();
      const fileUri = fileInfo.file.uri;
      const fileName = fileInfo.file.name;

      // 4. 等待文件处理完成
      setUploadProgress('Waiting for file processing...');
      let state = fileInfo.file.state;
      while (state.includes('PROCESSING')) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
        const stateResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Request-Headers': 'content-type',
              'Access-Control-Request-Method': 'GET'
            }
          }
        ).catch(error => {
          console.error('State check request failed:', error);
          // 如果请求失败，我们假设文件已经处理完成
          return new Response(JSON.stringify({ file: { state: 'PROCESSED' } }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
        
        const stateInfo = await stateResponse.json();
        state = stateInfo.file.state;
        setUploadProgress(`File processing: ${state}`);
      }

      // 5. 生成内容描述
      setUploadProgress('Analyzing video content...');
      const generateResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': 'content-type',
            'Access-Control-Request-Method': 'POST'
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt || '请用中文描述这个视频片段' },
                { 
                  file_data: {
                    mime_type: 'video/mp4',
                    file_uri: fileUri
                  }
                }
              ]
            }]
          })
        }
      );

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error('Content generation failed:', errorText);
        throw new Error('Failed to analyze video: ' + errorText);
      }

      const generateResult = await generateResponse.json();
      const analysisText = generateResult.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!analysisText) {
        throw new Error('No analysis result received');
      }

      setUploadProgress('Analysis complete!');
      setAnalysis(analysisText);

    } catch (error: any) {
      console.error('Error in video analysis:', error);
      setError(error.message || 'Failed to analyze video');
      setUploadProgress('Process failed');
    } finally {
      setIsUploading(false);
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
                onChange={handleFileSelect}
                disabled={isUploading || isAnalyzing}
              />
            </label>
          </div>
          {uploadProgress && (
            <div className="mt-2 text-sm text-gray-600 text-center">
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
              disabled={isAnalyzing || isUploading}
            />
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || isUploading || isAnalyzing || !prompt.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
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
        {(isUploading || isAnalyzing) ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
              <p className="text-gray-600">{isUploading ? 'Uploading video...' : 'Analyzing video content...'}</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
            </div>
          </div>
        ) : analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-sm rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Analysis Result</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{analysis}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
