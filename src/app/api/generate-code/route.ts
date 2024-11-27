import { NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const SYSTEM_PROMPT = `
You are an expert frontend React engineer who is also a great UI/UX designer. Follow these instructions carefully:

1. Code Generation Guidelines:
- Generate a complete, self-contained React component that can run in a CodeSandbox environment
- The component should be the default export in App.tsx
- Include all necessary imports at the top of the file
- Make the component interactive and functional with proper state management
- Use TypeScript for type safety
- Add helpful comments to explain complex logic
- Ensure proper function declaration order (declare functions before they are used)
- Use proper dependency arrays in useEffect and useCallback hooks
- Ensure all referenced functions and variables are properly defined before use

2. Styling Guidelines:
- Use Tailwind CSS for styling when requested
- Use consistent color schemes
- Ensure proper spacing
- Make the UI responsive
- Add hover and focus states for interactive elements
- Add smooth animations for better UX

3. Component Features:
- Add proper type definitions
- Include error boundaries where needed
- Add loading states for async operations
- Make components accessible
- Add proper aria labels
- Ensure keyboard navigation works
- Add proper form validation when needed

4. Best Practices:
- Follow React best practices
- Use proper semantic HTML
- Ensure code is clean and well-organized
- Add proper TypeScript types
- Use proper naming conventions
- Follow modern React patterns
- Implement proper error handling
- Properly handle circular dependencies in hooks
- Declare all functions before they are used in hooks

5. Sandbox Compatibility:
- Do not use external APIs or backend calls
- Use mock data for demonstrations
- Keep dependencies minimal
- Ensure all imports are from supported packages
- Make the component work in an isolated environment

Please ONLY return the complete React code starting with imports. Do not include any markdown code blocks or explanations.
`

export async function POST(req: Request) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'OpenRouter API key is not configured' },
      { status: 500 }
    )
  }

  try {
    const { prompt, model, options = {} } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'No prompt provided' },
        { status: 400 }
      )
    }

    // 构建完整的提示
    const fullPrompt = `
${prompt}

Additional Requirements:
${options.typescript ? '- Use TypeScript' : '- Use JavaScript'}
${options.tailwind ? '- Use Tailwind CSS for styling' : '- Use inline styles'}
${options.responsive ? '- Make the component fully responsive' : ''}
${options.animation ? '- Add smooth animations and transitions' : ''}
${options.accessibility ? '- Ensure the component is fully accessible' : ''}
${options.darkMode ? '- Add dark mode support' : ''}

Important Implementation Rules:
- DO NOT use any external dependencies beyond React itself
- DO NOT import any external files (images, CSS, etc.)
- Keep all code in a single file
- Use only React's built-in features
- Generate all content programmatically
- For games or interactive components:
  - Ensure the game area automatically gets focus on mount
  - Add clear click-to-start mechanics
  - Add proper keyboard event listeners with useEffect
  - Show clear game status and instructions
  - Handle component unmounting properly
  - Add proper error boundaries
  - Ensure game loop runs correctly with useEffect
  - Add proper loading and error states
  - Make sure all event listeners are cleaned up

Please provide a complete, self-contained implementation that works in a basic React sandbox environment.
`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate code')
    }

    const data = await response.json()
    let content = data.choices[0].message.content
    
    // 清理代码，移除markdown标记
    if (content.includes('```')) {
      content = content.split('```')[1].replace(/^(typescript|jsx|tsx)\n/, '')
    }
    
    // 清理代码中的注释和说明
    content = content
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // 移除注释
      .replace(/^\s*[\r\n]/gm, '') // 移除空行
      .trim()
    
    // 确保代码以分号结尾
    if (!content.endsWith(';')) {
      content += ';'
    }
    
    // 确保导入语句正确
    if (!content.includes('import React')) {
      content = 'import React from "react";\n' + content
    }
    
    // 确保有默认导出
    if (!content.includes('export default')) {
      content = content.replace(/const App[^{]*{/, 'const App: React.FC = () => {')
      content += '\nexport default App;'
    }
    
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error generating code:', error)
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    )
  }
}

export const runtime = 'edge'
