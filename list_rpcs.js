import { createClient } from '@supabase/supabase-js';

const url = 'https://nfttlgbkdvuutrgmthkz.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!key) {
  console.error("Missing VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function listRpcs() {
  console.log("Listing RPC functions...");
  try {
    // PostgREST doesn't expose pg_catalog directly, but we can inspect the openapi specification
    // using the /rest/v1/ endpoint of our Supabase project. We don't have service_role, but wait!
    // PostgREST exposes public schema RPCs via the API document! We can call the API doc endpoint anonymously.
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
      }
    });
    const schema = await res.json();
    console.log("Paths in schema:");
    const paths = Object.keys(schema.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log("Available RPCs:", rpcs);
    
    // For each RPC, print parameter names if available in the definitions/paths
    rpcs.forEach(rpcPath => {
      const methods = schema.paths[rpcPath];
      const post = methods.post;
      if (post && post.parameters) {
        console.log(`\nRPC: ${rpcPath}`);
        post.parameters.forEach(p => {
          if (p.schema && p.schema.properties) {
            console.log(`  Params:`, Object.keys(p.schema.properties));
          } else {
            console.log(`  Param: ${p.name}`);
          }
        });
      }
    });

  } catch (err) {
    console.error("Error fetching RPC list:", err);
  }
}

listRpcs();
