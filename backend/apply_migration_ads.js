const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
  const query = `
    -- Add daily_ad_claims and last_ad_claim_date to profiles table
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='daily_ad_claims') THEN
            ALTER TABLE profiles ADD COLUMN daily_ad_claims INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_ad_claim_date') THEN
            ALTER TABLE profiles ADD COLUMN last_ad_claim_date TIMESTAMP WITH TIME ZONE;
        END IF;
    END
    $$;
  `;

  console.log('--- SUPABASE MIGRATION SCRIPT FOR REWARDED ADS ---');
  console.log('Since the local Supabase CLI is not working, please run the following SQL code in your Supabase Dashboard (SQL Editor):');
  console.log('\n=========================================\n');
  console.log(query);
  console.log('\n=========================================\n');
}

run();
