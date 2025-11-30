import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { Innertube } from 'youtubei.js'
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
    try {
      const transcriptSegments = await YoutubeTranscript.fetchTranscript(videoId)
      transcript = formatTranscript(transcriptSegments)
    } catch (transcriptError) {
      console.error('Transcript fetch error:', transcriptError)
      return NextResponse.json(
        { error: 'Could not fetch transcript. The video may not have captions available.' },
        { status: 400 }
      )
    }

    // Fetch video metadata using youtubei.js
    let title = 'Untitled Video'
    let duration = 0
    let thumbnail: string | null = null

    try {
      const youtube = await Innertube.create()
      const videoInfo = await youtube.getBasicInfo(videoId)

      title = videoInfo.basic_info.title || title
      duration = videoInfo.basic_info.duration || 0
      thumbnail = videoInfo.basic_info.thumbnail?.[0]?.url || null
    } catch (metadataError) {
      console.error('Metadata fetch error:', metadataError)
      // Continue with default values - transcript is more important
    }

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
