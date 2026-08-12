import sys
import os

file_path = 'src/workers/daily-summary.worker.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove GoogleGenAI import
content = content.replace("import { GoogleGenAI } from '@google/genai';", "import { ModelRouter } from '../ai/ModelRouter';")

# 2. Remove GoogleGenAI initialization
content = content.replace("const ai = new GoogleGenAI({}); // Relies on GEMINI_API_KEY", "")

# 3. Replace the actual API call
old_call = """
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    } as any);

    const content = (response as any).candidates?.[0]?.content?.parts?.[0];
    if (content && typeof content === 'object' && 'text' in content) {
      return (content as any).text || 'Unable to generate summary.';
    }

    return 'Unable to generate summary.';
""".strip()

new_call = """
    const router = new ModelRouter();
    const messages: any[] = [{ role: 'user', content: prompt }];
    const summaryText = await router.generate(messages, userId, 'Free');
    return summaryText || 'Unable to generate summary.';
""".strip()

content = content.replace(old_call, new_call)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully!')
