import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
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

// Format transcript segments into readable text with timestamps
function formatTranscript(segments: { text: string; offset: number; duration: number }[]): string {
  return segments
    .map(segment => {
      const minutes = Math.floor(segment.offset / 60000)
      const seconds = Math.floor((segment.offset % 60000) / 1000)
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

// Estimate duration from transcript (last segment offset + duration)
function estimateDuration(segments: { offset: number; duration: number }[]): number {
  if (segments.length === 0) return 0
  const lastSegment = segments[segments.length - 1]
  return Math.ceil((lastSegment.offset + lastSegment.duration) / 1000) // Convert ms to seconds
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
      const transcriptSegments = await YoutubeTranscript.fetchTranscript(videoId)
      transcript = formatTranscript(transcriptSegments)
      duration = estimateDuration(transcriptSegments)
    } catch (transcriptError) {
      console.error('Transcript fetch error:', transcriptError)
      return NextResponse.json(
        { error: 'Could not fetch transcript. The video may not have captions available.' },
        { status: 400 }
      )
    }

    // Fetch video metadata using oEmbed (lightweight, no filesystem access)
    const { title, thumbnail } = await getVideoMetadata(videoId)

    // Store in database
    const source = await prisma.source.create({
      data: {
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        transcript,
        duration,
        thumbnail
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
