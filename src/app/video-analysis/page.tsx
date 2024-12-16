'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoAnalysis() {
  // 第一次分析相关的状态
  const [file1, setFile1] = useState<File | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [result1, setResult1] = useState('');
  const [editableResult1, setEditableResult1] = useState('');
  const [prompt1, setPrompt1] = useState('');

  // 第二次分析相关的状态
  const [file2, setFile2] = useState<File | null>(null);
  const [loading2, setLoading2] = useState(false);
  const [result2, setResult2] = useState('');
  const [editableResult2, setEditableResult2] = useState('');
  const [prompt2, setPrompt2] = useState('');

  // 第三次分析相关的状态
  const [file3, setFile3] = useState<File | null>(null);
  const [loading3, setLoading3] = useState(false);
  const [result3, setResult3] = useState('');
  const [editableResult3, setEditableResult3] = useState('');
  const [prompt3, setPrompt3] = useState('');

  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(1);

  // 添加展开/收起状态
  const [expandedCards, setExpandedCards] = useState<number[]>([1]);

  // 文件输入引用
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const fileInput3Ref = useRef<HTMLInputElement>(null);

  // 新增：AI剪辑相关的状态
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipLoading, setClipLoading] = useState(false);
  const [clipPreview, setClipPreview] = useState<string | null>(null);
  const [clipPreferences, setClipPreferences] = useState({
    dialogue: false,
    plot: false,
    highlight: false,
    closeup: false
  });
  const [clipResult, setClipResult] = useState<{
    segments: Array<{
      start: number;
      end: number;
      startTime: string;
      endTime: string;
      type: string;
      description: string;
      url: string;
    }>;
    analysis: string;
  } | null>(null);
  const clipFileInputRef = useRef<HTMLInputElement>(null);

  // 新增：文件验证常量
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];

  // 添加轮播状态
  const [currentSlide, setCurrentSlide] = useState(0);

  // 添加轮播控制函数
  const nextSlide = () => {
    if (clipResult) {
      setCurrentSlide((prev) => (prev + 1) % clipResult.segments.length);
    }
  };

  const prevSlide = () => {
    if (clipResult) {
      setCurrentSlide((prev) => 
        prev === 0 ? clipResult.segments.length - 1 : prev - 1
      );
    }
  };

  // 处理卡片展开/收起
  const toggleCard = (step: number) => {
    setExpandedCards(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    );
  };

  // 处理文件上传区域点击
  const handleUploadAreaClick = (step: number) => {
    const refs = {
      1: fileInput1Ref,
      2: fileInput2Ref,
      3: fileInput3Ref
    };
    refs[step as keyof typeof refs]?.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, step: number) => {
    const file = e.target.files?.[0];
    if (file) {
      switch (step) {
        case 1:
          setFile1(file);
          setActiveStep(1);
          break;
        case 2:
          setFile2(file);
          setActiveStep(2);
          break;
        case 3:
          setFile3(file);
          setActiveStep(3);
          break;
      }
    }
  };

  const handleAnalyze = async (step: number) => {
    // 验证前置条件
    if (step > 1 && !result1) {
      setError('请先完成第一次分析');
      return;
    }
    if (step > 2 && !result2) {
      setError('请先完成第二次分析');
      return;
    }

    const files = { 1: file1, 2: file2, 3: file3 };
    const prompts = { 1: prompt1, 2: prompt2, 3: prompt3 };
    const setLoadings = { 
      1: setLoading1, 
      2: setLoading2, 
      3: setLoading3 
    };
    const setResults = { 
      1: setResult1, 
      2: setResult2, 
      3: setResult3 
    };
    const setEditableResults = { 
      1: setEditableResult1, 
      2: setEditableResult2, 
      3: setEditableResult3 
    };

    const currentFile = files[step as keyof typeof files];
    const currentPrompt = prompts[step as keyof typeof prompts];
    const setLoading = setLoadings[step as keyof typeof setLoadings];
    const setResult = setResults[step as keyof typeof setResults];
    const setEditableResult = setEditableResults[step as keyof typeof setEditableResults];

    if (!currentFile) {
      setError(`请先上传第${step}个视频文件`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('prompt', currentPrompt);
      
      // 添加前一次的分析结果作为上下文
      if (step > 1) {
        formData.append('previousResult', result1);
      }
      if (step > 2) {
        formData.append('previousResult2', result2);
      }

      const response = await fetch('/api/video-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('分析失败');
      }

      const data = await response.json();
      const analysisResult = data.candidates[0].content.parts[0].text;

      setResult(analysisResult);
      setEditableResult(analysisResult);
      
      // 自动进入下一步
      if (step < 3) {
        setActiveStep(step + 1);
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || '分析过程中出现错误');
    } finally {
      setLoading(false);
    }
  };

  // 添加导出功能
  const handleExport = (step: number) => {
    const results = {
      1: editableResult1,
      2: editableResult2,
      3: editableResult3
    };
    
    const result = results[step as keyof typeof results];
    if (!result) return;

    const titles = {
      1: '剧本分析',
      2: '拉片分析',
      3: '短剧评级'
    };

    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${titles[step as keyof typeof titles]}_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 动画变体
  const cardVariants = {
    active: { scale: 1, opacity: 1 },
    inactive: { scale: 0.95, opacity: 0.7 }
  };

  const contentVariants = {
    hidden: { 
      height: 0,
      opacity: 0,
      transition: { duration: 0.2 }
    },
    visible: { 
      height: "auto",
      opacity: 1,
      transition: { duration: 0.2 }
    }
  };

  // 渲染卡片标题
  const renderCardHeader = (step: number, title: string, hasFile: boolean, result: string) => (
    <div 
      onClick={() => toggleCard(step)}
      className={`flex items-center justify-between p-4 cursor-pointer transition-colors
        ${expandedCards.includes(step) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <div className="flex items-center space-x-3">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center
          ${activeStep === step 
            ? 'bg-blue-600 text-white' 
            : activeStep > step 
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'}`}
        >
          {activeStep > step ? '✓' : step}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hasFile && (
          <span className="text-sm text-green-600">
            ✓ 已上传视频
          </span>
        )}
        {result && (
          <span className="text-sm text-blue-600">
            ✓ 已完成分析
          </span>
        )}
      </div>
      <motion.div
        animate={{ rotate: expandedCards.includes(step) ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </div>
  );

  // 新增：处理剪辑文件上传
  const handleClipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('不支持的文件格式，请上传 MP4 或 MOV 格式的视频');
        return;
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        setError('文件大小超过限制（最大100MB）');
        return;
      }

      setError(''); // 清除之前的错误
      setClipFile(file);
      // 创建本地预览URL
      const url = URL.createObjectURL(file);
      setClipPreview(url);
    }
  };

  // 新增：处理剪辑偏好变更
  const handlePreferenceChange = (key: keyof typeof clipPreferences) => {
    setClipPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 新增：处理AI剪辑
  const handleClip = async () => {
    if (!clipFile) {
      setError('请先上传视频文件');
      return;
    }

    try {
      setClipLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', clipFile);
      formData.append('preferences', JSON.stringify(clipPreferences));

      const response = await fetch('/api/video-clip', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '剪辑失败');
      }

      const data = await response.json();
      if (!data.segments || !Array.isArray(data.segments)) {
        throw new Error('服务器返回数据格式错误');
      }

      setClipResult(data);
      
    } catch (error: any) {
      console.error('Error details:', error);
      setError(error.message || '剪辑过程中出现错误');
    } finally {
      setClipLoading(false);
    }
  };

  // 清理函数
  useEffect(() => {
    return () => {
      // 清理预览URL
      if (clipPreview) {
        URL.revokeObjectURL(clipPreview);
      }
    };
  }, [clipPreview]);

  // 添加 renderAnalysisCard 函数
  const renderAnalysisCard = (step: number, title: string, file: File | null, result: string) => {
    const fileInputRef = {
      1: fileInput1Ref,
      2: fileInput2Ref,
      3: fileInput3Ref
    }[step];

    const loading = {
      1: loading1,
      2: loading2,
      3: loading3
    }[step];

    const prompt = {
      1: prompt1,
      2: prompt2,
      3: prompt3
    }[step];

    const setPrompt = {
      1: setPrompt1,
      2: setPrompt2,
      3: setPrompt3
    }[step];

    const editableResult = {
      1: editableResult1,
      2: editableResult2,
      3: editableResult3
    }[step];

    const setEditableResult = {
      1: setEditableResult1,
      2: setEditableResult2,
      3: setEditableResult3
    }[step];

    const isDisabled = loading || !file || (step > 1 && !result1) || (step > 2 && !result2);

    return (
      <div className={`bg-white rounded-lg shadow-sm overflow-hidden p-4
        ${activeStep === step ? 'ring-2 ring-blue-500' : ''}`}>
        {/* 卡片头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3
              ${file ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              {step}
            </div>
            <h3 className="font-medium text-gray-800">{title}</h3>
          </div>
          {result && (
            <button
              onClick={() => handleExport(step)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出
            </button>
          )}
        </div>

        {/* 上传区域 */}
        <div 
          onClick={() => handleUploadAreaClick(step)}
          className={`cursor-pointer border-2 border-dashed rounded-lg p-4 mb-4 transition-colors
            ${file ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
        >
          <div className="flex flex-col items-center">
            {file ? (
              <>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-blue-600">{file.name}</p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">点击上传视频</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, step)}
            className="hidden"
          />
        </div>

        {/* 提示词输入 */}
        <div className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入分析提示词..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] resize-y"
          />
        </div>

        {/* 分析按钮 */}
        <button
          onClick={() => handleAnalyze(step)}
          disabled={isDisabled}
          className={`w-full py-2 px-4 rounded-lg transition-colors
            ${isDisabled
              ? 'bg-gray-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              分析中...
            </div>
          ) : '开始分析'}
        </button>

        {/* 分析结果 */}
        {result && (
          <div className="mt-4">
            <textarea
              value={editableResult}
              onChange={(e) => setEditableResult(e.target.value)}
              className="w-full p-4 border rounded-lg min-h-[200px] resize-y bg-white shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="分析结果..."
              style={{ fontSize: '0.95rem', lineHeight: '1.5' }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">短剧AI助手</h1>
          <p className="text-gray-600">上传短剧，让AI帮你看短剧👀</p>
        </motion.div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：三步分析区域 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                短剧分析流程
              </h2>
              <div className="space-y-4">
                {/* 三个分析卡片 */}
                <motion.div variants={cardVariants} animate={activeStep === 1 ? 'active' : 'inactive'}>
                  {renderAnalysisCard(1, '获取剧本', file1, result1)}
                </motion.div>
                <motion.div variants={cardVariants} animate={activeStep === 2 ? 'active' : 'inactive'}>
                  {renderAnalysisCard(2, '拉片分析', file2, result2)}
                </motion.div>
                <motion.div variants={cardVariants} animate={activeStep === 3 ? 'active' : 'inactive'}>
                  {renderAnalysisCard(3, '短剧评级', file3, result3)}
                </motion.div>
              </div>
            </div>
          </div>

          {/* 右侧：AI智能剪辑区域 */}
          <div>
            <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-purple-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-purple-700 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 10.5h2.5l2-4h-6l2 4h2.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15l4-8 4 8H4z" />
                  </svg>
                  AI智能剪辑
                </h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  Beta
                </span>
              </div>

              {/* 上传区域 */}
              <div 
                onClick={() => clipFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer mb-6
                  ${clipFile 
                    ? 'border-purple-300 bg-purple-50' 
                    : 'border-purple-200 hover:border-purple-400 bg-purple-50/50'}`}
              >
                {clipFile ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-purple-600">{clipFile.name}</p>
                    <p className="text-sm text-purple-500 mt-1">
                      {(clipFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-purple-600 font-medium">点击上传视频</p>
                    <p className="text-sm text-purple-500 mt-1">支持 MP4, MOV 格式</p>
                  </>
                )}
                <input
                  ref={clipFileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  onChange={handleClipFileChange}
                  className="hidden"
                />
              </div>

              {/* 视频预览 */}
              {clipPreview && (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-6">
                  <video
                    src={clipPreview}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* 剪辑偏好 */}
              <div className="space-y-4 mb-6">
                <h3 className="text-sm font-medium text-gray-700">选择剪辑偏好</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clipPreferences.dialogue}
                      onChange={() => handlePreferenceChange('dialogue')}
                      className="form-checkbox text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">精彩对白</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clipPreferences.plot}
                      onChange={() => handlePreferenceChange('plot')}
                      className="form-checkbox text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">情节转折</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clipPreferences.highlight}
                      onChange={() => handlePreferenceChange('highlight')}
                      className="form-checkbox text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">高能场景</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clipPreferences.closeup}
                      onChange={() => handlePreferenceChange('closeup')}
                      className="form-checkbox text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">人物特写</span>
                  </label>
                </div>
              </div>

              {/* 开始剪辑按钮 */}
              <button
                onClick={handleClip}
                disabled={clipLoading || !clipFile}
                className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center
                  ${clipLoading || !clipFile
                    ? 'bg-purple-200 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
              >
                {clipLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    处理中...
                  </>
                ) : '开始智能剪辑'}
              </button>

              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* 剪辑结果 */}
              {clipResult && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800">剪辑片段</h3>
                    <div className="text-sm text-gray-600">
                      {currentSlide + 1} / {clipResult.segments.length}
                    </div>
                  </div>
                  
                  <div className="relative">
                    {/* 轮播内容 */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-purple-100">
                      {/* 片段视频预览 */}
                      <div className="aspect-video bg-gray-100">
                        <video
                          key={clipResult.segments[currentSlide].url}
                          src={clipResult.segments[currentSlide].url}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {/* 片段信息 */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs">
                            {clipResult.segments[currentSlide].type}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{clipResult.segments[currentSlide].description}</p>
                        {/* 下载按钮 */}
                        <button
                          onClick={() => window.open(clipResult.segments[currentSlide].url, '_blank')}
                          className="mt-3 flex items-center text-sm text-purple-600 hover:text-purple-700"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          下载片段
                        </button>
                      </div>
                    </div>

                    {/* 轮播控制按钮 */}
                    {clipResult.segments.length > 1 && (
                      <>
                        <button
                          onClick={prevSlide}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 focus:outline-none"
                        >
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={nextSlide}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 focus:outline-none"
                        >
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* 缩略图导航 */}
                  <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
                    {clipResult.segments.map((segment, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                          ${currentSlide === index ? 'border-purple-500 scale-105' : 'border-transparent opacity-70'}`}
                      >
                        <video
                          src={segment.url}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
