# Claude Model Configuration

Quick reference for swapping Claude models in this project.

## Current Model Usage

| Route | Line | Model | Purpose | Max Tokens |
|-------|------|-------|---------|------------|
| `app/api/youtube/process/route.ts` | 95 | `claude-haiku-4-5-20251001` | Analyzes transcripts to find breakpoints | 2000 |
| `app/api/challenge/generate/route.ts` | 43 | `claude-haiku-4-5-20251001` | Generates challenge questions | 2048 |
| `app/api/challenge/evaluate/route.ts` | 27 | `claude-haiku-4-5-20251001` | Evaluates answers & gives feedback | 1024 |

## Available Models

| Model ID | Speed | Cost | Best For |
|----------|-------|------|----------|
| `claude-sonnet-4-20250514` | Fast | $$ | Balanced tasks |
| `claude-3-5-sonnet-latest` | Fast | $$ | Latest capabilities |
| `claude-3-opus-20240229` | Slow | $$$$ | Complex reasoning |
| `claude-3-haiku-20240307` | Fastest | $ | Simple tasks, high volume |

## How to Change Models

1. Open the route file listed above
2. Find the `model:` parameter in the `messages.create()` call
3. Replace the model string with your desired model ID

Example:
```typescript
const response = await anthropic.messages.create({
  model: "claude-3-haiku-20240307",  // <-- change this
  max_tokens: 2048,
  // ...
});
```

## Recommendations

- **Breakpoint Analysis** (`youtube/process`): Sonnet works well, Haiku might miss nuance
- **Question Generation** (`challenge/generate`): Sonnet or Opus for creative questions
- **Answer Evaluation** (`challenge/evaluate`): Opus recommended for accurate grading
