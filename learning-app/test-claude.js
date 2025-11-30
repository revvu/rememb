const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/ANTHROPIC_API_KEY=(.*)/);
const apiKey = match ? match[1].trim().replace(/^["']|["']$/g, '') : null;

if (!apiKey) {
  console.error("Could not find ANTHROPIC_API_KEY in .env.local");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

const models = [
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307"
];

async function testModels() {
  for (const model of models) {
    console.log(`Testing model: ${model}...`);
    try {
      await anthropic.messages.create({
        model: model,
        max_tokens: 10,
        messages: [{ role: "user", content: "Hello" }],
      });
      console.log(`SUCCESS: ${model} is available.`);
      return;
    } catch (error) {
      console.log(`FAILED: ${model} - ${error.status} ${error.error ? error.error.message : error.message}`);
    }
  }
  console.log("All models failed.");
}

testModels();
