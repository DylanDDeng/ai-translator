import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// 添加延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 添加重试函数
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  delayMs: number,
  operationName: string
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.log(`${operationName} failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      
      // 检查是否是速率限制错误
      if (error.message?.includes('rate limit exceeded')) {
        console.log('Rate limit exceeded, waiting longer...');
        await delay(delayMs * 2); // 速率限制错误等待更长时间
      } else {
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

export async function POST(request: NextRequest) {
  let tempDir = '';
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    let prompt = formData.get('prompt') as string || '请用中文描述这个视频片段';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 处理 prompt 中的特殊字符
    prompt = prompt.replace(/'/g, "'\\''");  // 转义单引号
    prompt = prompt.replace(/"/g, '\\"');    // 转义双引号
    prompt = prompt.replace(/\n/g, ' ');     // 替换换行符为空格
    prompt = prompt.replace(/\r/g, '');      // 移除回车符

    console.log('Starting video analysis with prompt:', prompt);
    console.log('File name:', file.name);
    console.log('File size:', file.size);
    console.log('File type:', file.type);

    // 创建临时目录来存储文件和响应
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-analysis-'));
    console.log('Created temp directory:', tempDir);
    
    const videoPath = path.join(tempDir, file.name);
    
    // 将上传的文件写入临时文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(videoPath, buffer);
    console.log('Wrote file to temp directory:', videoPath);

    // 创建请求配置文件
    const requestConfigPath = path.join(tempDir, 'request.json');
    const requestConfig = {
      contents: [{
        parts: [
          { text: prompt },
          { file_data: { mime_type: "video/mp4", file_uri: "PLACEHOLDER_URI" } }
        ]
      }]
    };
    await fs.writeFile(requestConfigPath, JSON.stringify(requestConfig));

    // 准备 curl 命令
    const commands = [
      // 设置代理
      'export https_proxy=http://127.0.0.1:9788',
      'export http_proxy=http://127.0.0.1:9788',
      
      // 获取文件信息
      'MIME_TYPE="video/mp4"',
      `NUM_BYTES=$(wc -c < "${videoPath}")`,
      `DISPLAY_NAME="${file.name}"`,
      
      // 初始化上传请求
      'echo "上传视频中..."',
      `curl "${BASE_URL}/upload/v1beta/files?key=${GOOGLE_API_KEY}" \\
        -D ${path.join(tempDir, 'upload-header.tmp')} \\
        -H "X-Goog-Upload-Protocol: resumable" \\
        -H "X-Goog-Upload-Command: start" \\
        -H "X-Goog-Upload-Header-Content-Length: \${NUM_BYTES}" \\
        -H "X-Goog-Upload-Header-Content-Type: \${MIME_TYPE}" \\
        -H "Content-Type: application/json" \\
        -d "{\\"file\\": {\\"display_name\\": \\"\${DISPLAY_NAME}\\"}}"`,
      
      // 获取上传 URL
      'echo "获取上传 URL..."',
      `upload_url=$(grep -i "x-goog-upload-url: " ${path.join(tempDir, 'upload-header.tmp')} | cut -d" " -f2 | tr -d "\\r")`,
      'echo "Upload URL: ${upload_url}"',
      
      // 上传文件
      'echo "开始传输文件..."',
      `curl "\${upload_url}" \\
        -H "Content-Length: \${NUM_BYTES}" \\
        -H "X-Goog-Upload-Offset: 0" \\
        -H "X-Goog-Upload-Command: upload, finalize" \\
        --data-binary "@${videoPath}" > ${path.join(tempDir, 'file_info.json')}`,
      
      // 获取文件信息
      'echo "获取文件信息..."',
      `cat ${path.join(tempDir, 'file_info.json')}`,
      `file_uri=$(jq -r ".file.uri" ${path.join(tempDir, 'file_info.json')})`,
      `state=$(jq -r ".file.state" ${path.join(tempDir, 'file_info.json')})`,
      `name=$(jq -r ".file.name" ${path.join(tempDir, 'file_info.json')})`,
      
      'echo "文件 URI: ${file_uri}"',
      'echo "状态: ${state}"',
      
      // 等待处理完成
      'echo "等待处理完成..."',
      `while [[ "\${state}" == *"PROCESSING"* ]]; do
        echo "处理中..."
        sleep 5
        curl -s "${BASE_URL}/v1beta/files/\${name}?key=${GOOGLE_API_KEY}" > ${path.join(tempDir, 'file_info.json')}
        state=$(jq -r ".file.state" ${path.join(tempDir, 'file_info.json')})
      done`,
      
      // 更新请求配置文件中的 URI
      `sed -i '' "s|PLACEHOLDER_URI|\${file_uri}|" ${requestConfigPath}`,
      
      // 生成内容描述
      'echo "生成内容描述..."',
      `response=$(curl -s -w "\\n%{http_code}" "${BASE_URL}/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}" \\
        -H 'Content-Type: application/json' \\
        -X POST \\
        --data-binary "@${requestConfigPath}")`,
      
      'echo "API 响应："',
      
      // 分离响应内容和状态码
      'http_code=$(echo "$response" | tail -n1)',
      'content=$(echo "$response" | sed "$ d")',
      
      'echo "HTTP 状态码: $http_code"',
      'echo "响应内容:"',
      'echo "$content"',
      
      // 检查 HTTP 状态码
      'if [ "$http_code" != "200" ]; then',
      '  echo "API 返回错误状态码: $http_code"',
      '  echo "$content" > ${path.join(tempDir, "error.txt")}',
      '  exit 1',
      'fi',
      
      // 保存响应内容
      'echo "$content" > ${path.join(tempDir, "response.json")}',
      
      'echo "检查响应格式..."',
      'if echo "$content" | jq -e . >/dev/null 2>&1; then',
      '  echo "响应是有效的 JSON"',
      '  echo "$content" | jq -r ".candidates[].content.parts[].text" || echo "$content"',
      'else',
      '  echo "警告：响应不是有效的 JSON 格式"',
      '  echo "$content" > ${path.join(tempDir, "error.txt")}',
      '  exit 1',
      'fi'
    ];

    // 执行命令
    console.log('Executing commands...');
    const { stdout, stderr } = await retryOperation(
      async () => await execAsync(commands.join('\n'), { shell: '/bin/bash' }),
      MAX_RETRIES,
      RETRY_DELAY,
      'Executing commands'
    );
    console.log('Command output:', stdout);
    if (stderr) console.error('Command errors:', stderr);

    // 读取结果
    console.log('Reading response file...');
    let responseContent;
    try {
      responseContent = await fs.readFile(path.join(tempDir, 'response.json'), 'utf-8');
    } catch (e) {
      // 如果 response.json 不存在，尝试读取 error.txt
      try {
        const errorContent = await fs.readFile(path.join(tempDir, 'error.txt'), 'utf-8');
        console.error('Error content:', errorContent);
        
        // 处理常见的错误消息
        if (errorContent.includes('Request Entity Too Large')) {
          return NextResponse.json(
            { error: '视频文件太大，请上传小于 4MB 的视频' },
            { status: 413 }
          );
        }
        if (errorContent.includes('rate limit exceeded')) {
          return NextResponse.json(
            { error: 'API 调用次数超限，请稍后再试' },
            { status: 429 }
          );
        }
        if (errorContent.includes('Request failed')) {
          return NextResponse.json(
            { error: '请求失败，请检查网络连接后重试' },
            { status: 500 }
          );
        }
        
        return NextResponse.json(
          { error: `API 错误: ${errorContent}` },
          { status: 500 }
        );
      } catch (err) {
        console.error('Error reading error file:', err);
        throw new Error('Failed to read response or error file');
      }
    }
    
    console.log('Response content:', responseContent);
    
    let response;
    try {
      // 检查响应是否为空或无效
      if (!responseContent || responseContent.trim() === '') {
        throw new Error('Empty response from API');
      }

      response = JSON.parse(responseContent);
      console.log('Parsed response:', response);
      
      // 检查是否有错误响应
      if (response.error) {
        const errorMessage = response.error.message || 'API returned an error';
        if (errorMessage.includes('rate limit exceeded')) {
          return NextResponse.json(
            { error: 'API 调用次数超限，请稍后再试' },
            { status: 429 }
          );
        }
        throw new Error(errorMessage);
      }
      
      // 如果没有candidates，也抛出错误
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No analysis results returned from the API');
      }

      // 确保返回的是正确格式的响应
      if (!response.candidates[0]?.content?.parts) {
        throw new Error('Invalid response format from API');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      return NextResponse.json(
        { error: '处理视频时出错，请重试' },
        { status: 500 }
      );
    }

    // 清理临时文件
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('Cleaned up temp directory');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error processing video:', error);
    // 尝试读取和记录相关文件内容
    if (tempDir) {
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          const content = await fs.readFile(path.join(tempDir, file), 'utf-8');
          console.log(`Content of ${file}:`, content);
        }
      } catch (e) {
        console.error('Error reading debug files:', e);
      }
      // 清理临时文件
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Error cleaning up temp directory:', e);
      }
    }
    return NextResponse.json(
      { error: error.message || 'Failed to process video' },
      { status: 500 }
    );
  }
}
