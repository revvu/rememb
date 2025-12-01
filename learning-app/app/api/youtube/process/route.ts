import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '@/lib/prisma'

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// Fetch transcript from TranscriptAPI.com
async function fetchTranscript(videoId: string): Promise<{ text: string; start: number; duration: number }[]> {
  const response = await fetch(
    `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}&include_timestamp=true`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.TRANSCRIPT_API_KEY}`
      }
    }
  )

  if (!response.ok) {
    const status = response.status
    if (status === 404) {
      throw new Error('Video not found or no transcript available')
    } else if (status === 429) {
      throw new Error('Too many requests, please try again')
    } else {
      throw new Error('Failed to fetch transcript')
    }
  }

  const data = await response.json()
  return data.transcript
}

// Format transcript segments into readable text with timestamps
function formatTranscript(segments: { text: string; start: number; duration: number }[]): string {
  return segments
    .map(segment => {
      const minutes = Math.floor(segment.start / 60)
      const seconds = Math.floor(segment.start % 60)
      const timestamp = `[${minutes}:${seconds.toString().padStart(2, '0')}]`
      return `${timestamp} ${segment.text}`
    })
    .join('\n')
}

// Get video metadata using YouTube oEmbed API (no auth required, no filesystem)
async function getVideoMetadata(videoId: string): Promise<{ title: string; thumbnail: string | null }> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const response = await fetch(oembedUrl)

    if (!response.ok) {
      throw new Error('Failed to fetch oEmbed data')
    }

    const data = await response.json()
    return {
      title: data.title || 'Untitled Video',
      thumbnail: data.thumbnail_url || null
    }
  } catch (error) {
    console.error('oEmbed fetch error:', error)
    return {
      title: 'Untitled Video',
      thumbnail: null
    }
  }
}

// Estimate duration from transcript (last segment start + duration)
function estimateDuration(segments: { start: number; duration: number }[]): number {
  if (segments.length === 0) return 0
  const lastSegment = segments[segments.length - 1]
  return Math.ceil(lastSegment.start + lastSegment.duration)
}

// Analyze transcript with Claude to find natural breakpoints
async function analyzeBreakpoints(transcript: string, duration: number): Promise<{ timestamp: number; reason: string }[]> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analyze this video transcript and identify natural breakpoints where it would be good to pause and test understanding. Look for:
- Topic transitions ("Now let's move on to...", "In the next section...")
- Completion of a concept or idea
- End of worked examples
- Natural pauses before new material

Video duration: ${duration} seconds

Transcript:
${transcript.slice(0, 15000)}

Return ONLY a JSON array of breakpoints, no other text:
[{ "timestamp": <seconds>, "reason": "<brief reason>" }]

Aim for breakpoints roughly every 10-15 minutes for long videos, but prioritize natural transitions over arbitrary time intervals. For short videos (<10 min), identify 1-2 key breakpoints. Always include at least one breakpoint.`
      }]
    })

    // Parse JSON from response
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : []
  } catch (error) {
    console.error('Breakpoint analysis error:', error)
    return [] // Return empty array on failure, frontend will use fallback logic
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      )
    }

    const videoId = extractVideoId(url)

    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    // Check if source already exists
    const existingSource = await prisma.source.findUnique({
      where: { videoId }
    })

    if (existingSource) {
      return NextResponse.json({ source: existingSource })
    }

    // Fetch transcript
    let transcript: string
    let duration = 0
    try {
      const transcriptSegments = await fetchTranscript(videoId)
      transcript = formatTranscript(transcriptSegments)
      duration = estimateDuration(transcriptSegments)
    } catch (transcriptError) {
      console.error('Transcript fetch error:', transcriptError)
      const errorMessage = transcriptError instanceof Error ? transcriptError.message : 'Could not fetch transcript'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // Fetch video metadata using oEmbed (lightweight, no filesystem access)
    const { title, thumbnail } = await getVideoMetadata(videoId)

    // Analyze transcript for natural breakpoints
    const breakpoints = await analyzeBreakpoints(transcript, duration)

    // Store in database
    const source = await prisma.source.create({
      data: {
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        transcript,
        duration,
        thumbnail,
        breakpoints: JSON.stringify(breakpoints)
      }
    })

    return NextResponse.json({ source })
  } catch (error) {
    console.error('YouTube processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process YouTube video' },
      { status: 500 }
    )
  }
}
