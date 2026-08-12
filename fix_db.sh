#!/bin/bash
echo "=== Fixing embedding model in api_configurations ==="
docker exec studyai-backend-1 sh -c '
node -e "
const { createClient } = require(\"@supabase/supabase-js\");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  // Fix: Update text-embedding-004 -> gemini-embedding-001
  const { data, error } = await supabase
    .from(\"api_configurations\")
    .update({ model_name: \"gemini-embedding-001\" })
    .eq(\"model_name\", \"text-embedding-004\")
    .eq(\"task_type\", \"embedding\")
    .select();

  if (error) {
    console.log(\"UPDATE ERROR:\", JSON.stringify(error));
  } else {
    console.log(\"UPDATED:\", JSON.stringify(data, null, 2));
  }

  // Also fix the inactive gemini-2.5-flash entry (wrong model for embedding)
  const { data: data2, error: err2 } = await supabase
    .from(\"api_configurations\")
    .update({ model_name: \"gemini-embedding-001\", is_active: false })
    .eq(\"model_name\", \"gemini-2.5-flash\")
    .eq(\"task_type\", \"embedding\")
    .select();

  if (err2) {
    console.log(\"UPDATE2 ERROR:\", JSON.stringify(err2));
  } else {
    console.log(\"UPDATED2 (fixed wrong model, kept inactive):\", JSON.stringify(data2, null, 2));
  }

  // Verify final state
  const { data: verify } = await supabase
    .from(\"api_configurations\")
    .select(\"provider_name, model_name, task_type, is_active, priority\")
    .eq(\"task_type\", \"embedding\");
    
  console.log(\"\\nFINAL EMBEDDING CONFIGS:\", JSON.stringify(verify, null, 2));
}
fix().catch(console.error);
"
'
