import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const preferredRegion = 'hkg1';

const execAsync = promisify(exec);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com';
const IS_PRODUCTION = process.env.VERCEL_ENV === 'production';
const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '50000000', 10); // 50MB

export async function POST(request: NextRequest) {
  let tempDir = '';
  let tempFilePath = '';
  
  try {
    const formData = await request.formData();
    const chunk = formData.get('file') as File;
    const chunkIndex = parseInt(formData.get('chunk') as string, 10);
    const totalChunks = parseInt(formData.get('chunks') as string, 10);
    let prompt = formData.get('prompt') as string || '请用中文描述这个视频片段';

    if (!chunk) {
      return NextResponse.json({ error: 'No file chunk provided' }, { status: 400 });
    }

    // 创建临时目录
    if (chunkIndex === 0) {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-analysis-'));
      tempFilePath = path.join(tempDir, chunk.name);
    } else {
      // 使用已存在的临时目录
      const tempDirs = await fs.readdir(os.tmpdir());
      const videoDir = tempDirs.find(dir => dir.startsWith('video-analysis-'));
      if (!videoDir) {
        return NextResponse.json({ error: 'Temporary directory not found' }, { status: 400 });
      }
      tempDir = path.join(os.tmpdir(), videoDir);
      tempFilePath = path.join(tempDir, chunk.name);
    }

    // 将分块写入文件
    const buffer = Buffer.from(await chunk.arrayBuffer());
    const flags = chunkIndex === 0 ? 'w' : 'a';
    await fs.writeFile(tempFilePath, buffer, { flag: flags });

    // 如果不是最后一个分块，返回成功状态
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({ 
        status: 'chunk_uploaded',
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`
      });
    }

    // 检查文件类型
    if (chunk.type !== 'video/mp4') {
      return NextResponse.json({ error: 'Only MP4 videos are supported' }, { status: 400 });
    }

    // 处理 prompt 中的特殊字符
    prompt = prompt.replace(/'/g, "'\\''");  // 转义单引号
    prompt = prompt.replace(/"/g, '\\"');    // 转义双引号
    prompt = prompt.replace(/\n/g, ' ');     // 替换换行符为空格
    prompt = prompt.replace(/\r/g, '');      // 移除回车符

    console.log('Starting video analysis with prompt:', prompt);
    console.log('File path:', tempFilePath);
    console.log('File size:', chunk.size);
    console.log('File type:', chunk.type);

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
    await fs.writeFile(requestConfigPath, JSON.stringify(requestConfig, null, 2));

    // 准备 curl 命令
    const proxyCommand = IS_PRODUCTION ? '' : 'export https_proxy=http://127.0.0.1:9788\nexport http_proxy=http://127.0.0.1:9788\n';
    
    const commands = [
      // 设置代理（仅在非生产环境）
      proxyCommand,
      
      // 获取文件信息
      'MIME_TYPE="video/mp4"',
      `NUM_BYTES=$(wc -c < "${tempFilePath}")`,
      `DISPLAY_NAME="${chunk.name}"`,
      
      // 初始化上传请求
      'echo "上传视频中..."',
      `curl -s "${BASE_URL}/upload/v1beta/files?key=${GOOGLE_API_KEY}" \\
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
      `curl -s "\${upload_url}" \\
        -H "Content-Length: \${NUM_BYTES}" \\
        -H "X-Goog-Upload-Offset: 0" \\
        -H "X-Goog-Upload-Command: upload, finalize" \\
        --data-binary "@${tempFilePath}" > ${path.join(tempDir, 'file_info.json')}`,
      
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
      
      // 验证请求配置文件
      'echo "验证请求配置..."',
      `cat ${requestConfigPath}`,
      `if ! jq empty ${requestConfigPath} 2>/dev/null; then
        echo "请求配置验证失败"
        exit 1
      fi`,
      
      // 生成内容描述
      'echo "生成内容描述..."',
      `response=$(curl -s -w "\\n%{http_code}" "${BASE_URL}/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}" \\
        -H 'Content-Type: application/json' \\
        -X POST \\
        --data-binary "@${requestConfigPath}")`,
      
      'http_code=$(echo "$response" | tail -n1)',
      'body=$(echo "$response" | sed "$ d")',
      
      'echo "HTTP Status Code: $http_code"',
      'echo "Response Body: $body"',
      
      'if [ "$http_code" != "200" ]; then',
      '  echo "Error: Non-200 status code received"',
      `  echo "$body" > "${path.join(tempDir, "error.txt")}"`,
      '  exit 1',
      'fi',
      
      `echo "$body" > "${path.join(tempDir, "response.json")}"`,
      
      `if ! jq empty "${path.join(tempDir, "response.json")}" 2>/dev/null; then`,
      '  echo "Response is not valid JSON"',
      `  cat "${path.join(tempDir, "response.json")}"`,
      '  exit 1',
      'fi',
      
      'echo "API 响应："',
      `cat "${path.join(tempDir, "response.json")}"`,
      
      'echo "结果："',
      `jq -r ".candidates[].content.parts[].text" "${path.join(tempDir, "response.json")}" 2>/dev/null || cat "${path.join(tempDir, "response.json")}"`
    ];

    // 执行命令
    console.log('Executing commands...');
    const { stdout, stderr } = await execAsync(commands.join('\n'), { 
      shell: '/bin/bash',
      maxBuffer: 50 * 1024 * 1024  // 增加缓冲区大小到 50MB
    });
    console.log('Command output:', stdout);
    if (stderr) console.error('Command errors:', stderr);

    // 检查是否有错误文件
    try {
      await fs.access(path.join(tempDir, 'error.txt'));
      const errorMessage = await fs.readFile(path.join(tempDir, 'error.txt'), 'utf-8');
      console.error('Error from API:', errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    } catch (e) {
      // error.txt 不存在，继续处理
    }

    // 读取结果
    console.log('Reading response file...');
    let responseJson;
    try {
      responseJson = await fs.readFile(path.join(tempDir, 'response.json'), 'utf-8');
      console.log('Response JSON:', responseJson);
    } catch (e) {
      console.error('Error reading response file:', e);
      return NextResponse.json({ error: 'Failed to read response file' }, { status: 500 });
    }
    
    let response;
    try {
      response = JSON.parse(responseJson);
      console.log('Parsed response:', response);
      
      // 检查是否有错误响应
      if (response.error) {
        throw new Error(response.error.message || 'API returned an error');
      }
      
      // 如果没有candidates，也抛出错误
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No analysis results returned from the API');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      throw e;
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
          try {
            const content = await fs.readFile(path.join(tempDir, file), 'utf-8');
            console.log(`Content of ${file}:`, content);
          } catch (e) {
            console.error(`Error reading ${file}:`, e);
          }
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
