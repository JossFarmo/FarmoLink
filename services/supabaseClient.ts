
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fsagvxkwihqiscvjtjvz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYWd2eGt3aWhxaXNjdmp0anZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDE0ODQsImV4cCI6MjA4MTAxNzQ4NH0.ei8J3QJtZ1N2blgqAFM3U9_O3YjCalQV4YGu5hssk4A';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'farmolink-auth-token'
  },
  global: {
    headers: { 'x-application-name': 'farmolink-web' }
  }
});

/**
 * Utilitário de resiliência: Tenta executar uma função e repete se houver erro de rede.
 * Se detectar erro de autenticação, tenta forçar um refresh antes de falhar.
 */
export const safeQuery = async <T>(fn: () => Promise<T>, retries = 1): Promise<T | null> => {
    try {
        const result = await fn();
        
        // Verificação de erro de autenticação no padrão do Supabase
        if ((result as any)?.error) {
            const error = (result as any).error;
            if (error.status === 401 || error.status === 403) {
                console.warn("Sessão possivelmente expirada. Tentando recuperar...");
                const { data } = await supabase.auth.refreshSession();
                if (data?.session && retries > 0) {
                    return safeQuery(fn, retries - 1);
                }
                window.dispatchEvent(new CustomEvent('force-logout'));
                return null;
            }
        }
        return result;
    } catch (err: any) {
        if (retries > 0 && (err.message?.includes('fetch') || err.message?.includes('JWT'))) {
            await new Promise(res => setTimeout(res, 1000));
            return safeQuery(fn, retries - 1);
        }
        console.error("Erro persistente na query:", err);
        return null;
    }
};
