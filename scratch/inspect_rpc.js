require('dotenv').config({path: './backend/.env'});

async function inspectSwagger() {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const paths = data.paths;
    
    console.log("Found paths in Swagger for RPCs:");
    for (const p of Object.keys(paths)) {
      if (p.includes('rpc/hybrid_search_chunks') || p.includes('rpc/vector_search_chunks') || p.includes('rpc/keyword_search_chunks')) {
        console.log(`\nPath: ${p}`);
        if (paths[p].post && paths[p].post.parameters) {
          // Just look for body parameter schema properties
          const bodyParam = paths[p].post.parameters.find(x => x.in === 'body');
          if (bodyParam && bodyParam.schema && bodyParam.schema.properties) {
             console.log("Arguments:", Object.keys(bodyParam.schema.properties).join(', '));
          }
        }
      }
    }
  } catch(e) {
    console.log("Error:", e.message);
  }
}
inspectSwagger();
