const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
let initError = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    initError = e.message;
    console.error('Failed to create Supabase client:', e.message);
  }
} else {
  initError = `Missing env vars: ${!supabaseUrl ? 'SUPABASE_URL ' : ''}${!supabaseKey ? 'SUPABASE_SERVICE_KEY' : ''}`.trim();
}

module.exports = supabase;
module.exports.initError = initError;
