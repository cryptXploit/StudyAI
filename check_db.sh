#!/bin/bash
echo "=== Checking api_configurations table via backend env ==="
docker exec studyai-backend-1 sh -c '
node -e "
const { createClient } = require(\"@supabase/supabase-js\");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from(\"api_configurations\")
    .select(\"id, provider_name, model_name, task_type, is_active, priority\")
    .order(\"priority\", { ascending: true });

  if (error) {
    console.log(\"DB ERROR:\", JSON.stringify(error));
  } else {
    console.log(\"CONFIGS:\", JSON.stringify(data, null, 2));
  }

  // Specifically check embedding config
  const { data: embedData, error: embedErr } = await supabase
    .from(\"api_configurations\")
    .select(\"provider_name, model_name, task_type, is_active, priority\")
    .eq(\"is_active\", true)
    .eq(\"task_type\", \"embedding\")
    .order(\"priority\", { ascending: true })
    .limit(1)
    .single();
    
  console.log(\"\\nACTIVE EMBEDDING CONFIG:\", JSON.stringify(embedData));
  console.log(\"EMBEDDING ERROR:\", JSON.stringify(embedErr));
}
check().catch(console.error);
"
'
