const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const fileId = "46cc037a-4b2c-4c23-94cb-55c8878aa6a6";
  console.log(`Checking chunks for fileId: ${fileId}`);
  
  const { data, error } = await supabase.from('file_chunks').select('*').eq('file_id', fileId);
  
  if (error) {
    console.error('Error fetching chunks:', error);
  } else {
    console.log(`Found ${data.length} chunks.`);
    if (data.length > 0) {
      console.log('First chunk keys:', Object.keys(data[0]));
    }
  }
}
check();
