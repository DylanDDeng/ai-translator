import { NextRequest, NextResponse } from 'next/server';

const WEBSTER_API_KEY = process.env.WEBSTER_API_KEY || '';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json(
      { error: 'Word parameter is required' },
      { status: 400 }
    );
  }

  try {
    // First try Merriam-Webster API
    if (WEBSTER_API_KEY) {
      const websterUrl = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${WEBSTER_API_KEY}`;
      console.log('Fetching from Webster API');
      
      const response = await fetch(websterUrl);
      const data = await response.json();
      
      if (response.ok && Array.isArray(data) && data.length > 0) {
        const pronunciations: { uk?: string; us?: string } = {};
        
        // Get the audio filename from the first entry
        const audioName = data[0]?.hwi?.prs?.[0]?.sound?.audio;
        
        if (audioName) {
          // Construct the audio URL according to MW's specifications
          let subdirectory = '';
          
          // Special cases for audio file subdirectories
          if (audioName.startsWith('bix')) subdirectory = 'bix';
          else if (audioName.startsWith('gg')) subdirectory = 'gg';
          else if (/^\d/.test(audioName)) subdirectory = 'number';
          else if (/^[a-zA-Z]/.test(audioName)) subdirectory = audioName[0];
          
          const baseUrl = 'https://media.merriam-webster.com/audio/prons/en/us/mp3';
          const audioUrl = `${baseUrl}/${subdirectory}/${audioName}.mp3`;
          
          // Use the same audio for both US and UK since MW only provides US pronunciation
          pronunciations.us = audioUrl;
          
          console.log('Found Webster pronunciation:', pronunciations);
          return NextResponse.json({ pronunciations });
        }
      }
    }

    // Fallback to Free Dictionary API if Webster fails or no key is provided
    console.log('Falling back to Free Dictionary API');
    const freeDictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(freeDictUrl);
    const data = await response.json();
    
    console.log('Free Dictionary API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error('Failed to fetch pronunciation');
    }

    const phonetics = data[0]?.phonetics || [];
    console.log('Found phonetics:', phonetics);
    
    const pronunciations: { uk?: string; us?: string } = {};

    for (const phonetic of phonetics) {
      if (phonetic.audio) {
        const audioUrl = phonetic.audio;
        console.log('Processing audio URL:', audioUrl);
        
        if (audioUrl.includes('-gb.') || audioUrl.includes('uk') || audioUrl.includes('british')) {
          pronunciations.uk = audioUrl;
          console.log('Found UK pronunciation:', audioUrl);
        }
        else if (audioUrl.includes('-us.') || audioUrl.includes('us') || audioUrl.includes('american')) {
          pronunciations.us = audioUrl;
          console.log('Found US pronunciation:', audioUrl);
        }
        else if (!pronunciations.us) {
          pronunciations.us = audioUrl;
          console.log('Using generic pronunciation as US:', audioUrl);
        }
      }
    }

    console.log('Final pronunciations:', pronunciations);
    return NextResponse.json({ pronunciations });
  } catch (error) {
    console.error('Error fetching pronunciation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pronunciation' },
      { status: 500 }
    );
  }
}
