# MVP Implementation Order

## Philosophy

**Build the riskiest assumption first**: Can an LLM generate genuinely challenging, insightful problems from learning content?

If that doesn't work, nothing else matters.

---

## Phase 0: Validation (2-3 days)

**Goal**: Prove that Claude can generate AIME/USACO-quality problems

### Tasks

1. **Manual Problem Generation Test**
   - Pick a 3Blue1Brown video (any 15-minute segment)
   - Copy transcript manually
   - Write a Claude prompt to generate 3 problems
   - Iterate on prompt until problems are actually good
   - Solve the problems yourself - are they challenging and insightful?

2. **Test Different Content Types**
   - Try 2-3 different videos/topics
   - Does prompt work across domains?
   - Does quality remain high?

3. **Document Your Best Prompt**
   - Save the prompt that generates best problems
   - Note any patterns or requirements
   - This becomes your core IP

### Success Criteria
✅ You can consistently generate 2-3 problems that:
- Require 5-15 minutes to solve
- Make you think "oh wow, I didn't see it that way"
- Test actual understanding, not memorization
- Feel engaging to work on

### If This Fails
- Iterate on prompts (spend up to 5 days)
- Try different LLMs (GPT-4, Claude Opus)
- Consider hybrid: LLM generates outline, you refine
- If still failing → reconsider project viability

---

## Phase 1: Project Setup (2-4 hours)

**Goal**: Get a working Next.js app with database

### Tasks

```bash
# 1. Create Next.js project
npx create-next-app@latest learning-app
cd learning-app

# Options: TypeScript ✅, Tailwind ✅, App Router ✅

# 2. Install core dependencies
npm install @prisma/client @anthropic-ai/sdk
npm install -D prisma

# 3. Initialize Prisma
npx prisma init --datasource-provider postgresql

# 4. Set up environment variables
# Create .env.local:
DATABASE_URL="your-postgres-url"
ANTHROPIC_API_KEY="your-key"
```

### Simplified Schema (V0.1)

```prisma
// prisma/schema.prisma

model Source {
  id        String    @id @default(cuid())
  title     String
  url       String
  transcript String   @db.Text
  duration  Int       // seconds
  sessions  Session[]
  createdAt DateTime  @default(now())
}

model Session {
  id          String    @id @default(cuid())
  sourceId    String
  source      Source    @relation(fields: [sourceId], references: [id])
  startTime   Int       // seconds into video
  endTime     Int
  problems    Problem[]
  note        Note?
  createdAt   DateTime  @default(now())
}

model Problem {
  id          String   @id @default(cuid())
  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id])
  problemText String   @db.Text
  solution    String   @db.Text
  userAnswer  String?  @db.Text
  isCorrect   Boolean?
  feedback    String?  @db.Text
  createdAt   DateTime @default(now())
}

model Note {
  id        String   @id @default(cuid())
  sessionId String   @unique
  session   Session  @relation(fields: [sessionId], references: [id])
  content   String   @db.Text
  createdAt DateTime @default(now())
}
```

```bash
# 5. Create database
npx prisma db push

# 6. Generate Prisma client
npx prisma generate
```

### Success Criteria
✅ `npm run dev` works
✅ Can connect to database
✅ No errors in console

---

## Phase 2: YouTube Input (1 day)

**Goal**: User can paste a YouTube URL and see it displayed

### What to Build

**Page**: `app/page.tsx`
- Simple form: text input + submit button
- On submit → call API route

**API Route**: `app/api/youtube/process/route.ts`
```typescript
// Input: YouTube URL
// Output: { title, duration, transcript }
// Store in Source table
```

**Libraries to Install**:
```bash
npm install youtube-transcript youtubei.js
```

**Implementation**:
```typescript
// app/api/youtube/process/route.ts
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(request: Request) {
  const { url } = await request.json();
  
  // 1. Extract video ID
  const videoId = extractVideoId(url);
  
  // 2. Get transcript
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  
  // 3. Get metadata (title, duration) using youtubei.js
  const metadata = await getVideoMetadata(videoId);
  
  // 4. Store in database
  const source = await prisma.source.create({
    data: {
      title: metadata.title,
      url,
      transcript: JSON.stringify(transcript),
      duration: metadata.duration
    }
  });
  
  return Response.json({ source });
}
```

**Page**: `app/learn/[sourceId]/page.tsx`
- Display video title
- Show embedded video using `react-player`
- Simple "Start Learning" button

### Success Criteria
✅ Paste YouTube URL → video appears
✅ Video title and duration shown
✅ Transcript stored in database
✅ Can navigate to learning page

### Skip for Now
❌ PDF upload
❌ ArXiv integration
❌ Queue system
❌ Multiple sources

---

## Phase 3: Manual Learning Session (1 day)

**Goal**: Watch video, manually trigger challenge phase

### What to Build

**Learning Interface**: `app/learn/[sourceId]/page.tsx`

```typescript
// Simple state machine:
// 1. WATCHING → user watches video
// 2. CHALLENGE → show problems
// 3. COMPLETED → show notes
```

**Key Elements**:
- Embedded video (react-player)
- Timer showing time watched
- "I'm ready for challenges" button (manual trigger)
- State management with React hooks

**API Route**: `app/api/sessions/create/route.ts`
```typescript
// Input: sourceId, startTime, endTime
// Output: sessionId
// Creates Session in database
```

### Success Criteria
✅ Can watch video
✅ Can manually trigger challenge phase
✅ Session is created in database with time range

### Skip for Now
❌ Auto-pause detection
❌ Breakpoint intelligence
❌ Resume from previous position

---

## Phase 4: Problem Generation (2 days)

**Goal**: Generate 2 challenging problems from watched content

### What to Build

**API Route**: `app/api/problems/generate/route.ts`

```typescript
// Input: sessionId (includes time range)
// Steps:
//   1. Get transcript segment from database
//   2. Send to Claude with your validated prompt
//   3. Parse response into problems
//   4. Store in Problem table
// Output: Array of problems
```

**Challenge Interface**: Update `app/learn/[sourceId]/page.tsx`
- Show "Generating problems..." loading state
- Display first problem
- Text area for answer
- "Submit" button
- "Next problem" after submission

**Key Implementation**:
```typescript
// lib/llm.ts
import Anthropic from '@anthropic-ai/sdk';

export async function generateProblems(transcript: string, timeRange: { start: number, end: number }) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `[Your validated prompt from Phase 0]

Content:
${transcript}

Generate exactly 2 challenging problems that test deep understanding.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  // Parse problems from response
  return parseProblems(response.content[0].text);
}
```

### Success Criteria
✅ Problems generate successfully
✅ Problems match your Phase 0 quality bar
✅ Can display problems one at a time
✅ Problems stored in database

### Skip for Now
❌ 3-5 problems (just do 2)
❌ Different problem types
❌ Difficulty levels
❌ Test case generation

---

## Phase 5: Answer Submission (1 day)

**Goal**: User can submit text answers and get feedback

### What to Build

**API Route**: `app/api/problems/evaluate/route.ts`

```typescript
// Input: problemId, userAnswer
// Steps:
//   1. Get problem + solution from database
//   2. Send to Claude for grading
//   3. Store answer + feedback
// Output: { isCorrect, feedback }
```

**Evaluation Logic**:
```typescript
export async function evaluateAnswer(
  problem: string,
  solution: string,
  userAnswer: string
) {
  const prompt = `Problem: ${problem}

Expected Solution: ${solution}

Student Answer: ${userAnswer}

Evaluate the student's answer:
1. Is it correct? (yes/partial/no)
2. What did they understand well?
3. What did they miss?
4. Provide constructive feedback.`;

  // Call Claude API
  // Parse response
  return { isCorrect, feedback };
}
```

**UI Updates**:
- Add text area for answer
- Submit button → loading state
- Display feedback
- "Next problem" button

### Success Criteria
✅ Can type and submit answer
✅ Get feedback from Claude
✅ Feedback is constructive and useful
✅ Can move to next problem

### Skip for Now
❌ Photo upload
❌ Code editor
❌ Socratic discussion
❌ Multiple attempts

---

## Phase 6: Note Generation (1-2 days)

**Goal**: After completing problems, auto-generate notes

### What to Build

**API Route**: `app/api/notes/generate/route.ts`

```typescript
// Input: sessionId
// Steps:
//   1. Get session data (time range, transcript)
//   2. Get all problems + answers from session
//   3. Send to Claude for note synthesis
//   4. Store in Note table
// Output: noteId
```

**Note Generation Prompt**:
```typescript
const prompt = `Generate comprehensive learning notes.

Content covered:
${transcript_segment}

Problems solved:
${problems_and_answers}

Create notes that include:
1. Core concepts from this section
2. Key insights from problem-solving
3. Important connections or realizations
4. A synthesis that goes beyond just summarizing

Format as markdown with clear sections.`;
```

**Notes Page**: `app/notes/[noteId]/page.tsx`
- Display generated notes
- Use `react-markdown` for rendering
- Clean typography with Tailwind

### Success Criteria
✅ Notes generate after completing problems
✅ Notes capture both content and insights
✅ Notes are well-formatted markdown
✅ Notes are actually useful (test yourself!)

### Skip for Now
❌ Manual note editing
❌ Linking to other notes
❌ Concept tagging
❌ Export functionality

---

## Phase 7: End-to-End Polish (1-2 days)

**Goal**: Complete learning flow works smoothly

### What to Build

**Home Page**: Simple dashboard
- List of previous sources (if any)
- "Add new video" prominent
- List of completed sessions
- List of notes

**Navigation**:
- Clear flow: Input → Learn → Challenge → Notes
- Back buttons where appropriate
- Progress indicators

**Error Handling**:
- What if transcript fails?
- What if Claude API is down?
- What if problem generation takes too long?
- Show helpful error messages

**Basic Styling**:
- Use shadcn/ui components
- Clean, minimal design
- Focus on readability
- Distraction-free learning interface

### Success Criteria
✅ Complete flow works end-to-end
✅ No confusing states or dead ends
✅ Errors are handled gracefully
✅ Interface is clean and focused

---

## Phase 8: Real-World Test (2-3 days)

**Goal**: Use the app yourself to learn something real

### Tasks

1. **Pick Real Learning Content**
   - Choose 2-3 YouTube videos you actually want to learn from
   - Go through complete learning sessions
   - Take notes on your experience

2. **Critical Evaluation**
   - Are the problems genuinely challenging?
   - Is the note quality actually useful?
   - Does the flow feel natural?
   - Where do you get frustrated?

3. **Iterate Based on Usage**
   - Fix the most annoying bugs
   - Improve the most confusing parts
   - Adjust prompts if problems aren't good enough

### Success Criteria
✅ You actually want to use this for learning
✅ Generated problems are challenging
✅ Generated notes are reference-worthy
✅ Flow feels natural, not clunky

---

## MVP Complete - What You Have

After these 8 phases (2-3 weeks of work), you'll have:

✅ YouTube video input
✅ Manual learning sessions
✅ LLM-generated challenging problems
✅ Text-based answer submission
✅ Automatic note generation
✅ Clean, focused interface
✅ Working database
✅ Deployed on Vercel

### What You're Still Missing

These are intentionally deferred to Phase 9+:

❌ PDF upload
❌ Auto-pause detection
❌ Photo submission (handwriting)
❌ Code editor + execution
❌ Socratic discussion mode
❌ Discovery & search
❌ Queue system
❌ Gap analysis
❌ Note export
❌ Multiple users / auth

---

## After MVP: Priority Order for Next Features

Once MVP works and you've validated it's valuable:

### High Priority (Build Next)
1. **PDF Upload** - Expands content types
2. **Auto-Pause Detection** - Reduces manual work
3. **Queue System** - Plan learning paths
4. **Note Export** - Get value out of system

### Medium Priority
5. **Code Submission** - Essential for CS content
6. **Discovery/Search** - Find new content
7. **Better Problem Variety** - Different problem types

### Lower Priority
8. **Photo Submission** - Nice for math
9. **Socratic Discussion** - High effort, unclear value
10. **Gap Analysis** - Complex, maybe overkill
11. **Multi-user / Auth** - Only if sharing with others

---

## Time Estimates

**Optimistic** (experienced dev, no blockers): 2 weeks
**Realistic** (learning as you go, some debugging): 3-4 weeks  
**Pessimistic** (learning Next.js + Claude API + lots of polish): 6-8 weeks

**Biggest time sinks**:
- Phase 0: Getting problem quality right (could take days)
- Phase 4: Problem generation edge cases
- Phase 8: Real-world testing reveals issues

---

## Daily Checklist

Copy this for each phase:

```
Day 1:
[ ] Choose phase to work on
[ ] Read implementation section
[ ] Set up any new dependencies
[ ] Build core functionality
[ ] Test manually

Day 2:
[ ] Fix obvious bugs
[ ] Add error handling
[ ] Test edge cases
[ ] Verify success criteria
[ ] Move to next phase or polish current

Day 3:
[ ] Polish user experience
[ ] Clean up code
[ ] Commit to git
[ ] Deploy to Vercel (test in prod)
[ ] Document any learnings
```

---

## Key Reminders

**Don't Gold-Plate Early**:
- MVP is about validation, not perfection
- Ugly code is fine if it works
- Skip animations, polish, edge cases initially

**Manual Trumps Automated**:
- Manual pause points > auto-detection
- Manual content input > discovery system
- Manual note editing > perfect generation

**Test on Real Content**:
- Use videos YOU want to learn from
- If you wouldn't use it, nobody will
- Problems must be genuinely challenging

**Commit to Scope**:
- Finish Phase 0-8 before adding features
- Resist the temptation to add "just one more thing"
- Shipping beats perfection

---

## Go / No-Go Decision Points

**After Phase 0**:
- Can Claude generate good problems? If NO → don't build the rest

**After Phase 4**:
- Do generated problems feel challenging? If NO → fix prompts before continuing

**After Phase 8**:
- Would you actually use this to learn? If NO → figure out why before adding features

**After 2 weeks**:
- Do you have a working MVP? If NO → cut scope more aggressively

---

## You're Ready When...

✅ You've validated problem generation (Phase 0)
✅ You're committed to building Phases 1-8 before adding extras
✅ You have 2-4 weeks of focused time
✅ You're okay with starting ugly and iterating

**Good luck! The hardest part is starting. The second hardest is finishing what you started.**
