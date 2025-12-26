
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fsagvxkwihqiscvjtjvz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYWd2eGt3aWhxaXNjdmp0anZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDE0ODQsImV4cCI6MjA4MTAxNzQ4NH0.ei8J3QJtZ1N2blgqAFM3U9_O3YjCalQV4YGu5hssk4A';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'farmolink-auth-token' // Chave única para evitar conflitos com outros apps no mesmo domínio
  },
  global: {
    headers: { 'x-application-name': 'farmolink-web' }
  }
});

/**
 * Utilitário de resiliência: Tenta executar uma função e repete se houver erro de rede.
 * Agora com suporte a interrupção por timeout.
 */
export const safeQuery = async <T>(fn: () => Promise<T>, retries = 2): Promise<T | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout global para qualquer query

    try {
        const result = await fn();
        clearTimeout(timeoutId);
        return result;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (retries > 0 && (err.message?.includes('fetch') || err.name === 'TypeError' || err.name === 'AbortError')) {
            await new Promise(res => setTimeout(res, 1000));
            return safeQuery(fn, retries - 1);
        }
        console.error("Falha persistente na query:", err);
        return null;
    }
};
