const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Diagnostic/logging (masked) to help debug dotenv/env issues. Will not print the full service key.
const mask = (s = '') => {
  if (!s) return '';
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
};

console.log('Loaded env SUPABASE_URL=', SUPABASE_URL ? SUPABASE_URL : '(missing)');
console.log('Loaded env SUPABASE_SERVICE_ROLE_KEY=', SUPABASE_SERVICE_ROLE_KEY ? mask(SUPABASE_SERVICE_ROLE_KEY) : '(missing)');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials: please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see backend/.env)');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

module.exports = supabase;

