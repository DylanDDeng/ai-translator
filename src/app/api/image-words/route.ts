import { NextResponse } from "next/server";

const MODEL_CONFIG = {
  url: 'https://openrouter.ai/api/v1/chat/completions',
  headers: {
    'HTTP-Referer': process.env.APP_URL,
    'X-Title': 'AI Sandbox',
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
  }
};

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get("image") as unknown as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Convert the file to base64
    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    // Create the request body
    const requestBody = {
      model: "google/gemini-flash-1.5-8b",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and identify objects, scenes, or elements present in it. Label each identified item with its English word (e.g., if you see a house, label it as 'house'; if you see a nose, label it as 'nose'). For each identified word, provide its precise location in the following JSON format: [{\"word\": \"house\", \"box\": {\"x\": 0.1, \"y\": 0.2, \"width\": 0.3, \"height\": 0.1}}, ...]. The coordinates (x, y) should mark the top-left corner of the object, and all values must be normalized between 0 and 1. IMPORTANT: Return the raw JSON array only, no markdown formatting, no code blocks, no other text."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64Image}`
              }
            }
          ]
        }
      ]
    };

    // Call the OpenRouter API
    const response = await fetch(MODEL_CONFIG.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...MODEL_CONFIG.headers
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    const result = await response.json();
    console.log('API Response:', result);
    const text = result.choices[0]?.message?.content || "";
    console.log('Extracted text:', text);

    try {
      // Remove markdown code block markers if present
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      console.log('Cleaned text:', cleanText);
      
      // Try to parse the response as JSON
      const words = JSON.parse(cleanText);
      console.log('Parsed words:', words);
      return NextResponse.json({ words });
    } catch (error) {
      console.error('JSON parse error:', error);
      // If parsing fails, return the raw text
      return NextResponse.json({ 
        error: "Failed to parse model response",
        rawResponse: text 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process image" },
      { status: 500 }
    );
  }
}
