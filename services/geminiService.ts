
import { supabase } from './supabaseClient';
import { PrescriptionRequest } from '../types';

/**
 * FarmoLink AI Service - Production Bridge
 */

export const checkAiHealth = async (): Promise<boolean> => {
    try {
        const { data, error } = await supabase.functions.invoke('gemini', { body: { action: 'ping' } });
        if (error) return false;
        return data?.status === 'ok';
    } catch { return false; }
};

export const fetchChatHistory = async (userId: string) => {
    const { data } = await supabase
        .from('bot_conversations')
        .select('role, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    return data || [];
};

export const saveChatMessage = async (userId: string, role: 'user' | 'model', content: string) => {
    await supabase.from('bot_conversations').insert([{ user_id: userId, role, content }]);
};

export const getChatSession = () => {
    return {
        sendMessage: async ({ message, userName, history, userId }: { message: string, userName?: string, history?: any[], userId: string }) => {
            try {
                // Simplificado ao máximo para evitar erro 400 de sintaxe/RLS
                const { data: products } = await supabase
                    .from('products')
                    .select('name, price')
                    .limit(5);

                const { data, error } = await supabase.functions.invoke('gemini', {
                    body: { 
                        action: 'chat', 
                        message,
                        userName,
                        history: history?.map(h => ({ role: h.role, content: h.text || h.content })),
                        productsContext: products?.map(p => ({ item: p.name, price: p.price }))
                    }
                });

                if (error) {
                    // Extrai detalhes se a função retornar erro 500 com corpo JSON
                    const errorDetails = error.context?.message || error.message;
                    console.error("Erro na Edge Function:", errorDetails);
                    throw new Error(errorDetails);
                }

                if (data?.error) throw new Error(data.details || data.error);
                
                // Salva histórico de forma assíncrona
                saveChatMessage(userId, 'user', message);
                saveChatMessage(userId, 'model', data.text);

                return { text: data.text };
            } catch (error: any) {
                console.error("Falha Crítica FarmoBot:", error.message);
                return { text: `Desculpe, tive um problema técnico: ${error.message}. Por favor, tente novamente daqui a pouco.` };
            }
        }
    };
};

export const analyzePrescriptionVision = async (imageUrl: string): Promise<PrescriptionRequest['ai_metadata']> => {
    try {
        let optimizedUrl = imageUrl;
        if (imageUrl.includes('cloudinary')) {
            optimizedUrl = imageUrl.replace('/upload/', '/upload/w_1200,q_auto:eco,f_auto/');
        }

        const { data, error } = await supabase.functions.invoke('gemini', {
            body: { action: 'vision', imageUrl: optimizedUrl }
        });

        if (error) throw error;
        if (!data || data.error) throw new Error(data?.details || "Erro no processamento da imagem.");

        return {
            confidence: data.confidence ?? 0.0,
            extracted_text: data.extracted_text || "Texto não identificado.",
            is_validated: false,
            suggested_items: data.suggested_items || []
        };
    } catch (err: any) {
        console.error("Erro Vision IA:", err.message);
        return { 
            confidence: 0, 
            extracted_text: "Não foi possível ler automaticamente a receita. Por favor, descreva os medicamentos nas observações.", 
            is_validated: false, 
            suggested_items: [] 
        };
    }
};

export const standardizeProductVoice = async (text: string) => {
    return { name: text, price: 0 };
};

export const formatProductNameForCustomer = (name: string): string => {
    return name.replace(/[\(\)].*?[\(\)]/g, '').trim();
};
