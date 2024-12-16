import { NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com';

// 临时文件存储路径
const TEMP_DIR = join(process.cwd(), 'public', 'temp');

// 缓冲时间配置
const MINIMUM_BUFFER_TIME = 8; // 基础缓冲时间（秒）
const DIALOGUE_BUFFER_TIME = 12; // 对话场景缓冲时间（秒）
const PLOT_BUFFER_TIME = 10; // 情节转折缓冲时间（秒）
const HIGHLIGHT_BUFFER_TIME = 8; // 高能场景缓冲时间（秒）
const CLOSEUP_BUFFER_TIME = 8; // 人物特写缓冲时间（秒）

// 根据片段类型获取缓冲时间
function getBufferTimeByType(segmentType: string): number {
  switch (segmentType) {
    case '精彩对白':
      return DIALOGUE_BUFFER_TIME;
    case '情节转折':
      return PLOT_BUFFER_TIME;
    case '高能场景':
      return HIGHLIGHT_BUFFER_TIME;
    case '人物特写':
      return CLOSEUP_BUFFER_TIME;
    default:
      return MINIMUM_BUFFER_TIME;
  }
}

// 确保 FFmpeg 命令可用
async function ensureFfmpeg() {
  try {
    await execAsync('which ffmpeg');
    return true;
  } catch (error) {
    console.error('FFmpeg is not installed:', error);
    return false;
  }
}

// 使用 FFmpeg 剪辑视频片段
async function clipVideoSegment(
  inputPath: string,
  outputPath: string,
  startTime: string,
  duration: string,
  segmentType: string
): Promise<void> {
  try {
    // 首先获取视频总时长
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    );
    const totalDuration = parseFloat(durationOutput.trim());
    
    // 计算实际的开始时间（秒）
    const startSeconds = timeToSeconds(startTime);
    const durationSeconds = parseFloat(duration);
    
    // 获取基于片段类型的动态缓冲时间
    const bufferTime = getBufferTimeByType(segmentType);
    
    // 计算目标结束时间（包含缓冲）
    const targetEndSeconds = Math.min(startSeconds + durationSeconds + bufferTime, totalDuration);
    
    // 确保持续时间是正数
    if (targetEndSeconds <= startSeconds) {
      throw new Error('Invalid clip duration: duration must be positive');
    }
    
    // 使用改进的 FFmpeg 命令，使用 -to 参数代替 -t 参数
    const command = `ffmpeg -ss ${startTime} -i "${inputPath}" -to ${targetEndSeconds} -avoid_negative_ts 1 -map 0:v -map 0:a -c:v libx264 -c:a aac -vsync vfr "${outputPath}"`;
    
    console.log('Executing FFmpeg command:', command);
    console.log('Clip details:', {
      startTime,
      startSeconds,
      originalDuration: durationSeconds,
      bufferTime,
      targetEndSeconds,
      totalDuration,
      segmentType
    });
    
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error('FFmpeg stderr:', stderr);
    }
    if (stdout) {
      console.log('FFmpeg stdout:', stdout);
    }
  } catch (error) {
    console.error('FFmpeg error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  let tempDir = '';
  try {
    // 检查 FFmpeg 是否可用
    if (!await ensureFfmpeg()) {
      return NextResponse.json(
        { error: 'FFmpeg is not installed' },
        { status: 500 }
      );
    }

    // 确保临时目录存在
    await mkdir(TEMP_DIR, { recursive: true }).catch(err => {
      console.error('Error creating temp directory:', err);
      throw new Error('Failed to create temp directory');
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const preferences = JSON.parse(formData.get('preferences') as string);

    if (!file) {
      console.error('No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.type.startsWith('video/')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json(
        { error: '请上传视频文件' },
        { status: 400 }
      );
    }

    // 验证偏好设置
    if (!preferences || typeof preferences !== 'object') {
      console.error('Invalid preferences:', preferences);
      return NextResponse.json(
        { error: '请选择至少一个剪辑偏好' },
        { status: 400 }
      );
    }

    // 验证是否选择了至少一个偏好
    if (!Object.values(preferences).some(v => v)) {
      console.error('No preferences selected');
      return NextResponse.json(
        { error: '请选择至少一个剪辑偏好' },
        { status: 400 }
      );
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // 创建临时目录
    tempDir = await fs.mkdtemp(join(os.tmpdir(), 'video-clip-'));
    console.log('Created temp directory:', tempDir);
    
    const videoPath = join(tempDir, file.name);
    
    // 将上传的文件写入临时文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(videoPath, buffer);
    console.log('Wrote file to temp directory:', videoPath);

    // 构建提示词
    let prompt = '请分析这个视频，为每种类型找出最精彩的一个片段（每种类型仅需一个）。\n\n';
    prompt += '请严格按照以下格式输出每个片段信息：\n';
    prompt += '1. 时间戳格式：00:00:00 - 00:00:00（使用24小时制，包含小时、分钟、秒，用横杠分隔）\n';
    prompt += '2. 每个片段必须包含：\n';
    prompt += '   - 时间戳\n';
    prompt += '   - 片段类型（使用指定的类型名称）\n';
    prompt += '   - 内容描述\n\n';
    prompt += '输出示例：\n';
    prompt += '00:01:23 - 00:01:45\n';
    prompt += '精彩对白：这是一段精彩的对话场景\n\n';
    prompt += '02:15:30 - 02:16:00\n';
    prompt += '情节转折：这里出现了重要的情节转折\n\n';
    prompt += '需要分析的片段类型：\n';
    
    if (preferences.dialogue) prompt += '- 精彩对白（寻找对白完整、情感充沛的场景）\n';
    if (preferences.plot) prompt += '- 情节转折（寻找剧情发生重要转折的场景）\n';
    if (preferences.highlight) prompt += '- 高能场景（寻找剧情紧张或高潮的场景）\n';
    if (preferences.closeup) prompt += '- 人物特写（寻找表情或动作特写的场景）\n';
    
    prompt += '\n注意事项：\n';
    prompt += '1. 每个片段的时间戳必须准确，确保场景完整\n';
    prompt += '2. 每个类型只需要找出最精彩的一个片段\n';
    prompt += '3. 每个片段的描述要简洁明确\n';
    prompt += '4. 严格按照示例格式输出，不要添加多余的文字';

    // 处理 prompt 中的特殊字符
    prompt = prompt.replace(/'/g, "'\\''");  // 转义单引号
    prompt = prompt.replace(/"/g, '\\"');    // 转义双引号
    prompt = prompt.replace(/\n/g, ' ');     // 替换换行符为空格
    prompt = prompt.replace(/\r/g, '');

    // 创建请求配置文件
    const requestConfigPath = join(tempDir, 'request.json');
    const requestConfig = {
      contents: [{
        parts: [
          { text: prompt },
          { file_data: { mime_type: file.type, file_uri: "PLACEHOLDER_URI" } }
        ]
      }]
    };
    await fs.writeFile(requestConfigPath, JSON.stringify(requestConfig, null, 2));

    // 准备 curl 命令
    const commands = [
      // 设置代理
      'export https_proxy=http://127.0.0.1:9788',
      'export http_proxy=http://127.0.0.1:9788',
      
      // 获取文件信息
      'MIME_TYPE="video/mp4"',
      `NUM_BYTES=$(wc -c < "${videoPath}")`,
      `DISPLAY_NAME="${file.name}"`,
      
      // 上传请求
      'echo "上传视频中..."',
      `curl -s "${BASE_URL}/upload/v1beta/files?key=${GOOGLE_API_KEY}" \\
        -D ${join(tempDir, 'upload-header.tmp')} \\
        -H "X-Goog-Upload-Protocol: resumable" \\
        -H "X-Goog-Upload-Command: start" \\
        -H "X-Goog-Upload-Header-Content-Length: \${NUM_BYTES}" \\
        -H "X-Goog-Upload-Header-Content-Type: \${MIME_TYPE}" \\
        -H "Content-Type: application/json" \\
        -d "{\\"file\\": {\\"display_name\\": \\"\${DISPLAY_NAME}\\"}}"`,
      
      // 获取上传 URL
      'echo "获取上传 URL..."',
      `upload_url=$(grep -i "x-goog-upload-url: " ${join(tempDir, 'upload-header.tmp')} | cut -d" " -f2 | tr -d "\\r")`,
      'echo "Upload URL: ${upload_url}"',
      
      // 上传文件
      'echo "开始传输文件..."',
      `curl -s "\${upload_url}" \\
        -H "Content-Length: \${NUM_BYTES}" \\
        -H "X-Goog-Upload-Offset: 0" \\
        -H "X-Goog-Upload-Command: upload, finalize" \\
        --data-binary "@${videoPath}" > ${join(tempDir, 'file_info.json')}`,
      
      // 获取文件信息
      'echo "获取文件信息..."',
      `cat ${join(tempDir, 'file_info.json')}`,
      `file_uri=$(jq -r ".file.uri" ${join(tempDir, 'file_info.json')})`,
      `state=$(jq -r ".file.state" ${join(tempDir, 'file_info.json')})`,
      `name=$(jq -r ".file.name" ${join(tempDir, 'file_info.json')})`,
      
      'echo "文件 URI: ${file_uri}"',
      'echo "状态: ${state}"',
      
      // 等待处理完成
      'echo "等待处理完成..."',
      `while [[ "\${state}" == *"PROCESSING"* ]]; do
        echo "处理中..."
        sleep 5
        curl -s "${BASE_URL}/v1beta/files/\${name}?key=${GOOGLE_API_KEY}" > ${join(tempDir, 'file_info.json')}
        state=$(jq -r ".file.state" ${join(tempDir, 'file_info.json')})
      done`,
      
      // 更新请求配置文件中的 URI
      `sed -i '' "s|PLACEHOLDER_URI|\${file_uri}|" ${requestConfigPath}`,
      
      // 验证请求配置文件
      'echo "验证请求配置..."',
      `cat ${requestConfigPath}`,
      `if ! jq empty ${requestConfigPath}; then
        echo "请求配置验证失败"
        exit 1
      fi`,
      
      // 生成内容描述
      'echo "生成内容描述..."',
      `curl -s "${BASE_URL}/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}" \\
        -H 'Content-Type: application/json' \\
        -X POST \\
        --data-binary "@${requestConfigPath}" > ${join(tempDir, 'response.json')}`,
      
      'echo "API 响应"',
      `if ! jq empty ${join(tempDir, 'response.json')}; then
        echo "响应不是有效的 JSON"
        cat ${join(tempDir, 'response.json')}
        exit 1
      fi`,
      `cat ${join(tempDir, 'response.json')}`,
      
      'echo "结果："',
      `jq -r ".candidates[].content.parts[].text" ${join(tempDir, 'response.json')} || cat ${join(tempDir, 'response.json')}`
    ];

    // 执行命令
    console.log('Executing commands...');
    const { stdout, stderr } = await execAsync(commands.join('\n'), { 
      shell: '/bin/bash',
      maxBuffer: 50 * 1024 * 1024  // 增加冲区大小到 50MB
    });
    console.log('Command output:', stdout);
    if (stderr) console.error('Command errors:', stderr);

    // 读取结果
    console.log('Reading response file...');
    const responseJson = await fs.readFile(join(tempDir, 'response.json'), 'utf-8');
    console.log('Response JSON:', responseJson);
    
    let response;
    try {
      response = JSON.parse(responseJson);
      console.log('Parsed response:', response);
      
      // 检查是否有错误响应
      if (response.error) {
        throw new Error(response.error.message || 'API returned an error');
      }
      
      // 如果没有candidates，也抛���错误
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No analysis results returned from the API');
      }

      // 解析时间和描述
      const text = response.candidates[0].content.parts[0].text;
      console.log('AI Response text:', text);
      
      const segments = parseVideoSegments(text);
      console.log('Parsed segments:', segments);

      if (segments.length === 0) {
        throw new Error('No valid segments found in AI response');
      }

      // 为每个片段创建剪辑
      console.log('Starting video clipping...');
      const clippedSegments = await Promise.all(
        segments.map(async (segment, index) => {
          console.log(`Processing segment ${index + 1}/${segments.length}:`, segment);
          
          const outputFileName = `${randomUUID()}.mp4`;
          const outputPath = join(TEMP_DIR, outputFileName);
          
          // 计算持续时间（秒）
          const duration = (segment.end - segment.start).toString();
          console.log('Segment duration:', duration, 'seconds');
          
          try {
            // 剪辑视频片段
            await clipVideoSegment(
              videoPath,
              outputPath,
              segment.startTime,
              duration,
              segment.type
            );
            console.log(`Successfully clipped segment to ${outputPath}`);

            return {
              ...segment,
              url: `/temp/${outputFileName}`
            };
          } catch (error) {
            console.error(`Error clipping segment ${index + 1}:`, error);
            throw error;
          }
        })
      );

      console.log('All segments processed successfully');
      console.log('Final response:', {
        segments: clippedSegments,
        analysis: text
      });

      // 返回结果
      return NextResponse.json({
        segments: clippedSegments,
        analysis: text
      });

    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    } finally {
      // 清理临时文件
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log('Cleaned up temp directory');
      }
    }

  } catch (error: any) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process video' },
      { status: 500 }
    );
  }
}

// 辅助函数：解析视频片段
function parseVideoSegments(text: string) {
  const segments = [];
  const lines = text.split('\n');
  
  let currentSegment: any = {};
  
  console.log('Starting to parse text:', text); // 更详细的日志
  
  for (const line of lines) {
    console.log('Processing line:', line);
    
    // 更灵活的时间格式匹配
    // 支持多种格式：
    // 00:01:23 - 00:01:45
    // 1:23 - 1:45
    // 00:01:23-00:01:45
    // 1:23-1:45
    const timeMatch = line.match(/(\d{1,2}(?::\d{1,2}){1,2})\s*-\s*(\d{1,2}(?::\d{1,2}){1,2})/);
    if (timeMatch) {
      console.log('Found time match:', timeMatch);
      
      try {
        // 标准化时间格式
        const startTime = normalizeTimeFormat(timeMatch[1]);
        const endTime = normalizeTimeFormat(timeMatch[2]);
        
        // 验证时间格式
        if (!startTime || !endTime) {
          console.error('Invalid time format:', { start: timeMatch[1], end: timeMatch[2] });
          continue;
        }
        
        currentSegment = {
          start: timeToSeconds(startTime),
          end: timeToSeconds(endTime),
          startTime,
          endTime,
          type: '',
          description: ''
        };
        
        // 验证时间的有效性
        if (currentSegment.end <= currentSegment.start) {
          console.error('Invalid time range:', currentSegment);
          continue;
        }
        
        segments.push(currentSegment);
        console.log('Added new segment:', currentSegment);
      } catch (error) {
        console.error('Error processing time format:', error);
        continue;
      }
    }
    
    // 提取片段类型和描述
    // 如果当前行包含类型关键词
    const typeMatches = [
      { keywords: ['精彩对白', '对白场景'], type: '精彩对白' },
      { keywords: ['情节转折', '转折点'], type: '情节转折' },
      { keywords: ['高能场景', '高能片段'], type: '高能场景' },
      { keywords: ['人物特写', '特写镜头'], type: '人物特写' }
    ];
    
    for (const { keywords, type } of typeMatches) {
      if (keywords.some(keyword => line.includes(keyword))) {
        if (currentSegment.type === '') {
          currentSegment.type = type;
          currentSegment.description = line.replace(new RegExp(`.*?(${keywords.join('|')})[：:]*\\s*`), '').trim();
          console.log('Added type and description:', { type, description: currentSegment.description });
          break;
        }
      }
    }
    
    // 如果当前行包含描述信息
    if (currentSegment.type && line.trim() && !timeMatch && 
        !typeMatches.some(({ keywords }) => keywords.some(keyword => line.includes(keyword)))) {
      currentSegment.description = line.trim();
      console.log('Updated description:', currentSegment.description);
    }
  }
  
  // 过滤掉无效的片段
  const validSegments = segments.filter(segment => {
    const isValid = segment.type && segment.description && segment.start < segment.end;
    if (!isValid) {
      console.log('Filtered out invalid segment:', segment);
    }
    return isValid;
  });
  
  console.log('Final parsed segments:', validSegments);
  return validSegments;
}

// 辅助函数：标准化时间格式
function normalizeTimeFormat(time: string): string {
  try {
    const parts = time.split(':').map(Number);
    if (parts.some(isNaN)) {
      console.error('Invalid time parts:', parts);
      return '';
    }
    
    if (parts.length === 2) {
      // 如果只有分:秒，添加小时
      return `00:${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}`;
    } else if (parts.length === 3) {
      // 如果是时:分:秒，标准化格式
      return parts.map(n => n.toString().padStart(2, '0')).join(':');
    }
    console.error('Unsupported time format:', time);
    return '';
  } catch (error) {
    console.error('Error normalizing time format:', error);
    return '';
  }
}

// 辅助函数：将时间字符串转换为秒数
function timeToSeconds(timeStr: string): number {
  try {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    if ([hours, minutes, seconds].some(isNaN)) {
      throw new Error('Invalid time components');
    }
    return hours * 3600 + minutes * 60 + seconds;
  } catch (error) {
    console.error('Error converting time to seconds:', error);
    throw error;
  }
} 