# Tech Stack Specification

## Core Stack

| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **Next.js 14+** | Full-stack framework (frontend + backend) | Single codebase, built-in API routes, fast development |
| **TypeScript** | Type safety | Catch errors early, better IDE support, maintainable code |
| **PostgreSQL** | Database | Relational data (sessions, notes, problems), robust, scalable |
| **Prisma** | ORM & migrations | Type-safe DB queries, easy schema changes, auto-generated types |
| **Vercel** | Hosting & deployment | Zero-config deployment, automatic scaling, edge functions |

## Key Integrations

| Service | Purpose | Cost |
|---------|---------|------|
| **Anthropic Claude API** | Problem generation, evaluation, Socratic discussions, note synthesis | ~$10-100/mo |
| **Judge0 API** | Safe code execution with test cases | $0-10/mo |
| **Vercel Blob** | Store uploaded PDFs and handwriting photos | ~$0-5/mo |

## Essential Libraries

```
Content Processing:
- youtube-transcript          # Get video transcripts without API keys
- pdf-parse                   # Extract text from PDFs
- youtubei.js                 # YouTube metadata

UI Components:
- Tailwind CSS                # Utility-first styling
- shadcn/ui                   # Pre-built accessible components
- react-player                # YouTube video embedding
- @monaco-editor/react        # Code editor for submissions
- react-markdown              # Render generated notes

Note Export:
- @react-pdf/renderer         # Generate PDF exports
- notion-client               # Export to Notion
```

---

## Feature → Technology Mapping

### 1. **Content Input & Processing**

**YouTube Videos**
- `youtube-transcript` → Extract transcripts
- `youtubei.js` → Get video metadata (title, duration)
- Next.js API route (`/api/youtube/process`) → Coordinate processing
- Prisma → Store transcript + metadata in `Source` table

**PDF Upload**
- Vercel Blob → Store uploaded file
- `pdf-parse` → Extract text content
- Next.js API route (`/api/pdf/process`) → Handle upload + processing
- Prisma → Store text + metadata in `Source` table

### 2. **Learning Session Environment**

**Distraction-Free Interface**
- Next.js page (`app/learn/[sourceId]/page.tsx`) → Full-screen learning UI
- `react-player` → Embedded YouTube player
- React state → Track playback position, pause state
- Tailwind CSS → Clean, minimal styling

**Natural Breakpoint Detection**
- Next.js API route (`/api/breakpoints/detect`) → Analyze transcript/text
- Claude API → Identify topic transitions, concept completions
- Return breakpoint timestamps/pages to frontend

**Progress Tracking**
- React state → Current position in content
- Prisma → Save session state to `Session` table
- Can resume later from exact position

### 3. **Challenge Generation**

**Problem Creation**
- Next.js API route (`/api/challenge/generate`)
- Claude API with structured prompt → Generate 3-5 problems
- Problems match types: construction, proof, optimization, application
- Prisma → Store in `Problem` table with solutions

**One-at-a-Time Presentation**
- React state → Track current problem index
- shadcn/ui components → Clean problem display
- Next.js handles navigation between problems

### 4. **Answer Submission & Evaluation**

**Handwritten Work (Photos)**
- Browser file upload → Capture photo
- Vercel Blob → Store image
- Next.js API route (`/api/evaluate/handwriting`)
- Claude Vision API → Analyze handwriting, grade solution
- Prisma → Store evaluation in `Problem.evaluation`

**Code Submission**
- `@monaco-editor/react` → In-browser code editor
- Next.js API route (`/api/evaluate/code`)
- Judge0 API → Execute code against test cases
- Return results: passed/failed tests, output, errors
- Prisma → Store code + results

**Socratic Discussion**
- React chat interface → User types responses
- Next.js API route (`/api/discuss`)
- Claude API (streaming) → Real-time conversation
- System prompt makes Claude act as advisor
- Conversation history maintained in React state
- Final assessment stored in Prisma

### 5. **Note Generation & Management**

**Automatic Note Creation**
- Next.js API route (`/api/notes/generate`)
- Claude API → Synthesize:
  - Content from session
  - Problems + solutions
  - Insights from discussions
- Generate markdown with structure from spec
- Prisma → Store in `Note` table with links to other notes

**Note Viewing**
- Next.js page (`app/notes/[noteId]/page.tsx`)
- `react-markdown` → Render markdown content
- Show connections to prerequisite/related notes
- Tailwind CSS → Beautiful typography

**Note Export**
- Next.js API route (`/api/notes/export`)
- `@react-pdf/renderer` → Generate PDF
- `notion-client` → Push to Notion workspace
- Export markdown files (direct download)

### 6. **Content Discovery & Queue**

**YouTube Search**
- Next.js API route (`/api/discover/youtube`)
- `youtubei.js` → Search without API key
- Claude API → Analyze search results for quality:
  - Transcript depth
  - Engagement metrics
  - Educational value
- Return single best video

**Quality Filtering**
- All logic in Next.js API routes
- Claude API evaluates transcripts against criteria:
  - Explanation depth
  - Pacing
  - Visual aids mentioned
- Compare to 3Blue1Brown standard

**Learning Queue**
- Next.js page (`app/queue/page.tsx`)
- shadcn/ui → Drag-and-drop reordering
- Prisma → `QueueItem` table
- Simple CRUD operations via API routes

### 7. **Gap Detection & Recommendations**

**Performance Analysis**
- Next.js API route (`/api/recommend`)
- Query Prisma for:
  - Recent `Problem` results
  - `Session` data
  - `Note` concepts covered
- Claude API → Analyze patterns, suggest next topics

**Knowledge Graph**
- Stored as JSON in Prisma (simple approach)
- OR use PostgreSQL's JSON columns
- Track concept mastery levels
- Build prerequisite relationships

---

## Data Flow Example: Complete Session

```
1. User clicks "Start Learning" on queued YouTube video
   └─> Next.js page loads (app/learn/[id])

2. Frontend fetches source data
   └─> API route queries Prisma for Source

3. Video plays in react-player
   └─> Frontend tracks watch time

4. At 15 min mark, frontend checks for breakpoint
   └─> API route (/api/breakpoints/detect) uses Claude to confirm natural stop
   └─> Video pauses

5. User clicks "Start Challenges"
   └─> API route (/api/challenge/generate) generates problems via Claude
   └─> Problems stored in Prisma, returned to frontend

6. User solves problem, submits code
   └─> API route (/api/evaluate/code) sends to Judge0
   └─> Results saved to Prisma

7. User completes all problems
   └─> API route (/api/notes/generate) synthesizes notes via Claude
   └─> Note saved to Prisma

8. User views generated notes
   └─> Next.js page renders markdown with react-markdown

9. User exports to Notion
   └─> API route (/api/notes/export) pushes via notion-client
```

---

## Database Schema (Prisma)

```prisma
model Source {
  id        String    @id @default(cuid())
  title     String
  type      String    // 'youtube' | 'pdf'
  url       String?
  content   String    @db.Text
  metadata  Json
  sessions  Session[]
  createdAt DateTime  @default(now())
}

model Session {
  id           String    @id @default(cuid())
  sourceId     String
  source       Source    @relation(fields: [sourceId], references: [id])
  contentRange Json      // {start: 900, end: 1800}
  problems     Problem[]
  note         Note?
  createdAt    DateTime  @default(now())
}

model Problem {
  id          String   @id @default(cuid())
  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id])
  problemText String   @db.Text
  problemType String
  solution    String   @db.Text
  userAnswer  String?  @db.Text
  evaluation  Json?
  createdAt   DateTime @default(now())
}

model Note {
  id        String   @id @default(cuid())
  sessionId String   @unique
  session   Session  @relation(fields: [sessionId], references: [id])
  content   String   @db.Text  // Markdown
  concepts  String[]
  links     Json     // {prerequisites: [], related: []}
  createdAt DateTime @default(now())
}

model QueueItem {
  id            String   @id @default(cuid())
  title         String
  url           String?
  priority      Int      @default(0)
  estimatedTime Int?
  createdAt     DateTime @default(now())
}
```

---

## Why This Stack Works

✅ **Single codebase** - Frontend and backend in one repo  
✅ **Type safety** - TypeScript + Prisma prevent bugs  
✅ **Fast development** - No API versioning, no CORS, no separate deploys  
✅ **Scales easily** - Vercel handles traffic spikes  
✅ **Low maintenance** - Prisma migrations, Vercel auto-deploys  
✅ **Cost effective** - $10-50/month for MVP  
✅ **Modern DX** - Hot reload, fast builds, great docs  

---

## Potential Concerns & Solutions

**Concern**: "Is Next.js API route performance good enough?"  
**Answer**: Yes. Can handle thousands of requests/sec. For heavier tasks (video processing), use background jobs.

**Concern**: "What if Claude API is slow?"  
**Answer**: Use streaming responses. Show "Generating..." with real-time updates.

**Concern**: "What about code execution security?"  
**Answer**: Judge0 API is sandboxed and battle-tested. Never run user code locally.

**Concern**: "Can PostgreSQL handle this?"  
**Answer**: Easily. You're storing text and JSON. Not high write volume. Can scale to millions of records.

**Concern**: "What if I need real-time features later?"  
**Answer**: Next.js supports WebSockets and Server-Sent Events. Can add later.

---

## Alternative Simplifications (If Needed)

If you want to start even simpler:

- **Replace PostgreSQL** → SQLite (local file, zero setup)
- **Replace Vercel Blob** → Local filesystem
- **Replace Judge0** → Basic Node.js `child_process` (less safe, but works for MVP)

This lets you prototype entirely locally before deploying.

---

## Next Steps

1. **Initialize project**: `npx create-next-app@latest`
2. **Add Prisma**: `npm install prisma @prisma/client`
3. **Set up database**: `npx prisma init`
4. **Add Claude SDK**: `npm install @anthropic-ai/sdk`
5. **Start building**: Create first API route + page

Total setup time: ~30 minutes.
