import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const source = await prisma.source.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ source })
  } catch (error) {
    console.error('Failed to fetch source:', error)
    return NextResponse.json(
      { error: 'Failed to fetch source' },
      { status: 500 }
    )
  }
}
