
import { supabase } from './supabaseClient';
// dataService.ts - Façade para os serviços divididos
// Isso mantém a compatibilidade com o resto do app sem precisar refatorar todos os imports de UI.

export * from './authService';
export * from './pharmacyService';
export * from './productService';
export * from './orderService';
export * from './backupService';

export const createSupportTicket = async (userId: string, userName: string, userEmail: string, subject: string, message: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('support_tickets').insert([{
            user_id: userId,
            user_name: userName,
            user_email: userEmail,
            subject: subject,
            message: message,
            status: 'OPEN'
        }]);
        return !error;
    } catch (e) {
        return false;
    }
}
