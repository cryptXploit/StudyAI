const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
  const query = `
    CREATE TABLE IF NOT EXISTS ai_feature_mappings (
      tier TEXT PRIMARY KEY,
      features JSONB NOT NULL DEFAULT '[]'::jsonb
    );
    
    -- Enable Row Level Security (RLS)
    ALTER TABLE ai_feature_mappings ENABLE ROW LEVEL SECURITY;
    
    -- Create Policies
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'ai_feature_mappings' AND policyname = 'Enable read access for all users'
        ) THEN
            CREATE POLICY "Enable read access for all users" ON ai_feature_mappings FOR SELECT USING (true);
        END IF;
    END
    $$;
    
    -- Insert default categorized records
    INSERT INTO ai_feature_mappings (tier, features)
    VALUES 
      ('embedding', '["oracle", "purifier", "podcast", "notes"]'::jsonb),
      ('general', '["chat", "quiz", "flashcard", "story", "voice", "live", "timeline", "calendar"]'::jsonb),
      ('complex', '["battle", "battle2", "planner", "logicflow", "mind-map", "solver", "molecule", "curve", "presentation", "flowchart", "wallpaper", "universe", "bionic", "labgraph", "youtube", "focus", "reward", "syllabus", "geomapper", "career", "bookjumper", "night-before"]'::jsonb)
    ON CONFLICT (tier) DO UPDATE SET features = EXCLUDED.features;
  `;

  console.log('--- SUPABASE MIGRATION SCRIPT ---');
  console.log('Since the local Supabase CLI is not working, please run the following SQL code in your Supabase Dashboard (SQL Editor):');
  console.log('\n=========================================\n');
  console.log(query);
  console.log('\n=========================================\n');
}

run();
