const fs = require('fs');
require('dotenv').config();
const key = process.env.GEMINI_API_KEY;
const longText = 'A'.repeat(50000);
const chunkingPrompt = `Extract all distinct questions or exam problems from the following text. Return them as a STRICT JSON array of strings. Do not include answers, only the question text. If a question has subparts, keep them together as one string.
Text:
${longText}

Output ONLY a valid JSON array of strings, e.g. ["What is Newton's First Law?", "Explain Quantum Entanglement"]. No markdown backticks.`;

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{role: 'user', parts: [{text: chunkingPrompt}]}]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
