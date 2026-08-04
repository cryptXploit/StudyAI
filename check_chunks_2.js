const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const fileId = "b1343167-2118-4b2a-9166-896af1399ef3";
  const { data, error } = await supabase.from('file_chunks').select('*').eq('file_id', fileId);
  if (error) console.error(error);
  else console.log(`Found ${data.length} chunks for ${fileId}`);
}
check();
