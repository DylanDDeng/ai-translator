import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { put } from '@vercel/blob';
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
  let blobUrl = '';
  try {
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    let prompt = formData.get('prompt') as string || '请用中文描述这个视频片段';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 413 });
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY is not configured' }, { status: 500 });
    }

    // 检查文件类型
    if (file.type !== 'video/mp4') {
      return NextResponse.json({ error: 'Only MP4 videos are supported' }, { status: 400 });
    }

    // 上传到 Vercel Blob
    console.log('Uploading to Vercel Blob...');
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true
    });
    blobUrl = blob.url;
    console.log('File uploaded to:', blobUrl);

    // 处理 prompt 中的特殊字符
    prompt = prompt.replace(/'/g, "'\\''");  // 转义单引号
    prompt = prompt.replace(/"/g, '\\"');    // 转义双引号
    prompt = prompt.replace(/\n/g, ' ');     // 替换换行符为空格
    prompt = prompt.replace(/\r/g, '');      // 移除回车符

    console.log('Starting video analysis with prompt:', prompt);
    console.log('File name:', file.name);
    console.log('File size:', file.size);
    console.log('File type:', file.type);

    // 创建临时目录来存储响应
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-analysis-'));
    console.log('Created temp directory:', tempDir);

    // 创建请求配置文件
    const requestConfigPath = path.join(tempDir, 'request.json');
    const requestConfig = {
      contents: [{
        parts: [
          { text: prompt },
          { file_data: { mime_type: "video/mp4", file_uri: blobUrl } }
        ]
      }]
    };
    await fs.writeFile(requestConfigPath, JSON.stringify(requestConfig, null, 2));

    // 准备 curl 命令
    const proxyCommand = IS_PRODUCTION ? '' : 'export https_proxy=http://127.0.0.1:9788\nexport http_proxy=http://127.0.0.1:9788\n';
    
    const commands = [
      // 设置代理（仅在非生产环境）
      proxyCommand,
      
      // 生成内容描述
      'echo "生成内容描述..."',
      `curl -s "${BASE_URL}/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}" \\
        -H 'Content-Type: application/json' \\
        -X POST \\
        --data-binary "@${requestConfigPath}" > ${path.join(tempDir, 'response.json')}`,
      
      'echo "API 响应："',
      `if ! jq empty ${path.join(tempDir, 'response.json')} 2>/dev/null; then
        echo "响应不是有效的 JSON"
        cat ${path.join(tempDir, 'response.json')}
        exit 1
      fi`,
      `cat ${path.join(tempDir, 'response.json')}`,
      
      'echo "结果："',
      `jq -r ".candidates[].content.parts[].text" ${path.join(tempDir, 'response.json')} 2>/dev/null || cat ${path.join(tempDir, 'response.json')}`
    ];

    // 执行命令
    console.log('Executing commands...');
    const { stdout, stderr } = await execAsync(commands.join('\n'), { 
      shell: '/bin/bash',
      maxBuffer: 50 * 1024 * 1024  // 增加缓冲区大小到 50MB
    });
    console.log('Command output:', stdout);
    if (stderr) console.error('Command errors:', stderr);

    // 读取结果
    console.log('Reading response file...');
    const responseJson = await fs.readFile(path.join(tempDir, 'response.json'), 'utf-8');
    console.log('Response JSON:', responseJson);
    
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

      // 添加视频 URL 到响应中
      response.videoUrl = blobUrl;
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
