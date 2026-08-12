const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: './backend/.env'});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function dumpSchema() {
  const tables = ['files', 'file_chunks', 'context_packs', 'cache_entries', 'api_configurations', 'api_cost_logs', 'api_health_logs', 'ai_settings', 'ai_metrics', 'usage_logs', 'flashcard_decks', 'book_jumper_history', 'citation_history'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table ${table} error:`, error.message);
      } else {
        console.log(`Table ${table} columns:`, data.length > 0 ? Object.keys(data[0]).join(', ') : 'Empty table, schema unknown from select');
      }
    } catch(e) {
      console.log(`Table ${table} query failed.`);
    }
  }
}
dumpSchema();
