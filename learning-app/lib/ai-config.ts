/**
 * Centralized AI Model and Prompt Configuration
 *
 * Change models or prompts here - changes propagate to all API routes.
 */

export const AI_CONFIG = {
  /**
   * Challenge Generation
   * Creates textbook-style problems based on a segment of video content the user just watched.
   * Called when user clicks "Check me" to test their understanding of recent content.
   */
  challengeGeneration: {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 4096,
    prompt: (title: string, transcript: string) => `You are an expert educator. A learner just watched a segment of a video titled "${title}" and clicked "Check me" to test their understanding.

Your job is to generate a diverse set of practice problems based ONLY on this specific segment.

SEGMENT TRANSCRIPT:
${transcript}

Create a VARIETY of problem types from the following categories:

**Open-ended types (user types answer):**
- "recall" - short factual questions about key definitions or concepts
- "numeric_fill" - compute a value using formulas/procedures from the segment
- "fill_blank" - complete a sentence with a missing key term

**Structured types (user selects answer):**
- "multiple_choice" - select ONE correct answer from 4 options
- "multi_select" - select ALL correct answers (2+ correct options)
- "true_false" - determine if a statement is true or false
- "matching" - match items from column A to column B
- "ordering" - arrange items in the correct sequence

**FORMAT FOR EACH TYPE:**

For "recall", "numeric_fill", "fill_blank":
{
  "type": "recall",
  "text": "What is the definition of ____?",
  "difficulty": "Easy"
}

For "multiple_choice":
{
  "type": "multiple_choice",
  "text": "Which of the following best describes ____?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "difficulty": "Medium"
}

For "multi_select":
{
  "type": "multi_select",
  "text": "Select ALL that apply: Which of these are ____?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": [0, 2],
  "difficulty": "Medium"
}

For "true_false":
{
  "type": "true_false",
  "text": "True or False: [Statement about content]",
  "correctAnswer": true,
  "difficulty": "Easy"
}

For "matching":
{
  "type": "matching",
  "text": "Match each term with its definition:",
  "columnA": ["Term 1", "Term 2", "Term 3"],
  "columnB": ["Definition A", "Definition B", "Definition C"],
  "correctAnswer": [1, 0, 2],
  "difficulty": "Medium"
}

For "ordering":
{
  "type": "ordering",
  "text": "Arrange these steps in the correct order:",
  "options": ["Step shown second", "Step shown first", "Step shown third"],
  "correctAnswer": [1, 0, 2],
  "difficulty": "Medium"
}

**RULES:**
1. Create 4-6 problems total
2. Include AT LEAST 2 structured types (multiple_choice, multi_select, true_false, matching, or ordering)
3. Mix difficulty levels: 2 Easy, 2-3 Medium, 1 Hard
4. All questions must be answerable from the segment content only
5. Keep questions concise (1-2 sentences max)
6. For multiple choice, make distractors plausible but clearly wrong
7. For matching, shuffle columnB so correctAnswer is not [0,1,2...]

Output strictly valid JSON:
{
  "problems": [
    { ... problem 1 ... },
    { ... problem 2 ... }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown or explanation
- Ensure all correctAnswer indices are valid (0-indexed)
- Make sure JSON is syntactically valid`,
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
