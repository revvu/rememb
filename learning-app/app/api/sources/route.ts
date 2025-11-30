import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    return NextResponse.json({ sources })
  } catch (error) {
    console.error('Failed to fetch sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}
