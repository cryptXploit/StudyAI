#!/bin/bash
docker exec studyai-backend-1 sh -c '
node -e "
const { createClient } = require(\"@supabase/supabase-js\");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function fix() {
  const { error } = await supabase.from(\"bd_transactions\").update({ user_id: null }).eq(\"trx_id\", \"DHC5D7TJ43\");
  if (error) console.log(\"ERROR:\", error);
  else console.log(\"SUCCESSFULLY FIXED ROW\");
}
fix();
"
'
