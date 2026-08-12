#!/bin/bash
docker exec studyai-backend-1 sh -c '
node -e "
const { createClient } = require(\"@supabase/supabase-js\");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data, error } = await supabase.from(\"bd_transactions\").select(\"*\").order(\"created_at\", { ascending: false }).limit(5);
  console.log(\"TRANSACTIONS:\", JSON.stringify(data, null, 2));
  if (error) console.log(\"ERROR:\", JSON.stringify(error));
}
check().catch(console.error);
"
'
