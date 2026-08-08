const fs = require('fs');
require('dotenv').config();
const key = process.env.GROQ_API_KEY;
const longText = 'A'.repeat(50000);
const chunkingPrompt = `Extract all distinct questions or exam problems from the following text. Return them as a STRICT JSON array of strings. Do not include answers, only the question text. If a question has subparts, keep them together as one string.
Text:
${longText}

Output ONLY a valid JSON array of strings, e.g. ["What is Newton's First Law?", "Explain Quantum Entanglement"]. No markdown backticks.`;

fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
  body: JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages: [{role: 'user', content: chunkingPrompt}]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
