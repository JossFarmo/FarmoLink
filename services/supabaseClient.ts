
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
 * Se detectar erro de autenticação (401/403), força o logout do sistema.
 */
export const safeQuery = async <T>(fn: () => Promise<T>, retries = 1): Promise<T | null> => {
    try {
        const result = await fn();
        // Verifica se o resultado é um objeto de erro do Supabase
        if ((result as any)?.error) {
            const error = (result as any).error;
            if (error.status === 401 || error.status === 403 || error.message?.includes('JWT')) {
                console.error("Sessão inválida detectada via SafeQuery.");
                window.dispatchEvent(new CustomEvent('force-logout'));
                return null;
            }
        }
        return result;
    } catch (err: any) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, 800));
            return safeQuery(fn, retries - 1);
        }
        console.error("Erro persistente na query:", err);
        return null;
    }
};
