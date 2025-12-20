import { createClient } from '@supabase/supabase-js';

// Inicialização com tratamento de erro e persistência básica
// Use environment variables for configuration. When building with Vite
// variables prefixed with VITE_ are exposed to the client via
// import.meta.env.VITE_*

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    import { createClient } from '@supabase/supabase-js';

    // Inicialização com tratamento de erro e persistência básica
    // Use environment variables for configuration. When building with Vite
    // variables prefixed with VITE_ are exposed to the client via
    // import.meta.env.VITE_*

    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
    const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    }

    export const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    // Note: Do NOT commit real keys to the repository. Use the Supabase dashboard
    // to rotate the key if it was previously exposed and configure the anon key
    // as an environment variable in your hosting provider (Vercel/Netlify/GitHub).
export const supabase = createClient(supabaseUrl, supabaseKey, {
