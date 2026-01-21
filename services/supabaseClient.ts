
import { createClient } from '@supabase/supabase-js';

// CREDENCIAIS DO SEU NOVO PROJETO SUPABASE
const supabaseUrl = 'https://hbnomhpgfigenobcmqsm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhibm9taHBnZmlnZW5vYmNtcXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjQ2NjYsImV4cCI6MjA4MzI0MDY2Nn0.LclMCmqYrtuoz-PbREN-xjdsW76wDkhXIGfLLaV2NYM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'farmolink-auth-token'
  },
  global: {
    headers: { 'x-application-name': 'farmolink-mobile' }
  }
});

/**
 * safeQuery: Utilitário para evitar falhas críticas em conexões instáveis.
 */
export const safeQuery = async <T>(fn: () => Promise<T>, retries = 3): Promise<T | null> => {
    try {
        const result = await fn();
        const potentialError = (result as any)?.error;
        
        if (potentialError) {
            console.warn("[FarmoLink DB]:", potentialError.message || potentialError);
            if (potentialError.status === 401) {
                await supabase.auth.refreshSession();
                return retries > 0 ? safeQuery(fn, retries - 1) : null;
            }
            return null;
        }
        return result;
    } catch (err: any) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return safeQuery(fn, retries - 1);
        }
        console.error("Erro Crítico FarmoLink:", err.message || err);
        return null;
    }
};
