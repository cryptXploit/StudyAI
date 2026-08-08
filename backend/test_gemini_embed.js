require('dotenv').config();
const key = process.env.GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: `models/gemini-embedding-2`,
    content: { parts: [{ text: 'hello' }] }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
