/**
 * Centralized AI Model and Prompt Configuration
 *
 * Change models or prompts here - changes propagate to all API routes.
 */

export const AI_CONFIG = {
  /**
   * Breakpoint Analysis
   * Analyzes video transcripts to find natural pause points for learning challenges.
   */
  breakpointAnalysis: {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 2000,
    prompt: (transcript: string, duration: number) => `Analyze this video transcript and identify natural breakpoints where it would be good to pause and test understanding. Look for:
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
  },

  /**
   * Challenge Generation
   * Creates challenging problems based on video content to test deep understanding.
   */
  challengeGeneration: {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 2048,
    prompt: (title: string, transcript: string) => `You are an expert educator who creates genuinely challenging problems that test deep understanding, not surface-level recall.

Based on the following video transcript titled "${title}", generate 3 challenging problems that:
1. Require 5-15 minutes of thought to solve
2. Test actual understanding, not memorization
3. Make the learner think "oh, I didn't see it that way before"
4. Are engaging and interesting to work on

TRANSCRIPT:
${transcript}

Create 3 problems of these types:
1. "construction" - Design/build something that satisfies constraints from the content
2. "application" - Apply a concept to a novel, unexpected scenario
3. "connection" - Connect ideas from the content to something broader or in a different domain

Output strictly valid JSON with this structure:
{
  "problems": [
    {
      "id": "p1",
      "type": "construction",
      "text": "...",
      "difficulty": "Medium"
    },
    {
      "id": "p2",
      "type": "application",
      "text": "...",
      "difficulty": "Hard"
    },
    {
      "id": "p3",
      "type": "connection",
      "text": "...",
      "difficulty": "Medium"
    }
  ]
}

IMPORTANT:
- Problems must be specifically about the content in the transcript, not generic
- Each problem should require genuine thinking and creativity
- Do not include markdown formatting. Just the raw JSON string.`
  },

  /**
   * Answer Evaluation
   * Evaluates student answers and provides tutoring feedback.
   */
  answerEvaluation: {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 1024,
    prompt: (question: string, answer: string) => `You are an expert tutor. Evaluate the student's answer to the following question.

Question: "${question}"
Student Answer: "${answer}"

Determine if the answer is correct or demonstrates a good understanding.
Provide constructive feedback. If incorrect, explain why without giving the full answer immediately if possible, or guide them.
Suggest a brief "next step" or follow-up thought.

Output strictly valid JSON with this structure:
{
  "isCorrect": boolean,
  "feedback": "string",
  "nextStep": "string"
}
Do not include markdown formatting like \`\`\`json. Just the raw JSON string.`
  }
} as const;

// Type exports for use in API routes
export type AIConfigKey = keyof typeof AI_CONFIG;
