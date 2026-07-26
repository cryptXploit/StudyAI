"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ModelRouter_1 = require("./src/ai/ModelRouter");
async function testGeoMapper() {
    const systemPrompt = `You are a World-Class Geospatial Data Scientist.
Your task is to take the user's topic and generate a dataset mapping specific countries to data values.

CRITICAL RULES:
1. Output MUST be ONLY valid, parseable JSON. No markdown blocks, no conversational text.
2. Provide data for the top 30-50 most relevant countries regarding the topic to keep it concise but highly informative.
3. Use exact ISO-3 country codes (e.g., USA, GBR, IND, BGD).
4. Generate a logical color hex code for each country based on the data intensity/category.

JSON SCHEMA TO FOLLOW:
{
  "title": "Descriptive Title of the Map",
  "description": "A 2-sentence summary of what this map represents in English.",
  "legend": ["Label for Color 1", "Label for Color 2"],
  "countries": [
    {
      "id": "ISO3_CODE",
      "name": "Country Name in English",
      "value": "String representation (e.g., '23.5 Trillion', 'Allied Power')",
      "color": "#HEXCODE"
    }
  ]
}`;
    const userPrompt = `Generate map data for the following topic: "Global GDP 2023"`;
    const router = new ModelRouter_1.ModelRouter();
    try {
        const aiResponse = await router.generate([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], 'test-user-id', 'Free', { temperature: 0.1 });
        console.log("SUCCESS:", aiResponse);
    }
    catch (err) {
        console.error("ERROR:", err.message);
    }
}
testGeoMapper().then(() => process.exit(0)).catch((err) => {
    console.error("Uncaught error:", err);
    process.exit(1);
});
