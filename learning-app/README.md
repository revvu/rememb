# Deep Learning System

Transform passive YouTube watching into active learning with AI-generated challenges.

## Features

- **Transcript Extraction** - Automatically fetches YouTube video transcripts with timestamps
- **Smart Notes** - Auto-generated key concepts and timeline from transcript
- **AI Challenges** - Claude generates thought-provoking problems based on video content
- **Intelligent Feedback** - AI evaluates your answers and provides detailed feedback
- **Progress Tracking** - Track your learning sessions and video progress

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS + Framer Motion
- **Video**: react-player

## Prerequisites

You'll need API keys for:

| Service | Purpose | Get it at |
|---------|---------|-----------|
| Anthropic | AI challenge generation & evaluation | [console.anthropic.com](https://console.anthropic.com) |
| TranscriptAPI | YouTube transcript fetching | [transcriptapi.com](https://transcriptapi.com) |
| PostgreSQL | Data storage (Supabase recommended) | [supabase.com](https://supabase.com) |

## Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd learning-app
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Fill in your `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   TRANSCRIPT_API_KEY=sk_...
   DATABASE_URL="postgresql://..."
   DATABASE_URL_POOLED="postgresql://..."
   ```

3. **Initialize database**
   ```bash
   npx prisma db push
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Paste a YouTube URL on the home page
2. Watch the video with smart notes in the sidebar
3. After watching ~10%, click "Start Challenge"
4. Answer AI-generated questions about the content
5. Receive feedback and improve your understanding

## Deployment

Deploy to Vercel and add the environment variables in your project settings.
