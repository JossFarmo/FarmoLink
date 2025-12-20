
import { supabase } from './supabaseClient';
import { CarouselSlide, Partner, Notification, UserRole } from '../types';

export * from './authService';
export * from './pharmacyService';
export * from './productService';
export * from './orderService';
export * from './backupService';

// --- NOTIFICATIONS & BROADCAST ---
export const fetchNotifications = async (): Promise<Notification[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
    
    return (data || []).map((n:any) => ({
        id: n.id, userId: n.user_id, title: n.title, message: n.message,
        type: n.type, read: n.is_read, date: n.created_at, link: n.link
    }));
}

export const sendSystemNotification = async (targetRole: 'ALL' | 'CUSTOMER' | 'PHARMACY', title: string, message: string): Promise<boolean> => {
    try {
        let query = supabase.from('profiles').select('id');
        if (targetRole !== 'ALL') {
            query = query.eq('role', targetRole);
        }
        
        const { data: users, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (!users || users.length === 0) return true;

        const notifications = users.map(u => ({
            user_id: u.id,
            title,
            message,
            type: 'SYSTEM',
            is_read: false
        }));

        const { error: insertError } = await supabase.from('notifications').insert(notifications);
        return !insertError;
    } catch (e) {
        return false;
    }
}

export const markNotificationRead = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    return !error;
}

export const deleteNotification = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    return !error;
}

// --- SUPPORT (SAC) & CHAT ---
export const createSupportTicket = async (userId: string, name: string, email: string, subject: string, message: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.from('support_tickets').insert([{
            user_id: userId,
            user_name: name,
            user_email: email,
            subject,
            message,
            status: 'OPEN',
            created_at: new Date().toISOString()
        }]).select().single();

        if (error) throw error;

        // Adiciona a primeira mensagem no chat
        await supabase.from('support_messages').insert([{
            ticket_id: data.id,
            sender_id: userId,
            sender_name: name,
            sender_role: 'CUSTOMER',
            message: message
        }]);

        return true;
    } catch (e) {
        return false;
    }
};

export const fetchUserTickets = async (userId: string): Promise<any[]> => {
    const { data } = await supabase.from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return data || [];
};

export const fetchTicketMessages = async (ticketId: string): Promise<any[]> => {
    const { data } = await supabase.from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
    return data || [];
};

export const sendTicketMessage = async (ticketId: string, senderId: string, senderName: string, role: string, message: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('support_messages').insert([{
            ticket_id: ticketId,
            sender_id: senderId,
            sender_name: senderName,
            sender_role: role,
            message: message
        }]);

        if (error) return false;

        // Se for admin respondendo, notifica o usuário
        if (role === 'ADMIN') {
            const { data: ticket } = await supabase.from('support_tickets').select('user_id').eq('id', ticketId).single();
            if (ticket) {
                await supabase.from('notifications').insert([{
                    user_id: ticket.user_id,
                    title: "Nova resposta do suporte",
                    message: "O administrador respondeu ao seu chamado.",
                    type: 'SUPPORT'
                }]);
            }
        }
        
        return true;
    } catch (e) {
        return false;
    }
};

export const fetchAllSupportTickets = async (): Promise<any[]> => {
    const { data } = await supabase.from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
    return data || [];
};

export const updateTicketStatus = async (id: string, status: 'OPEN' | 'RESOLVED'): Promise<boolean> => {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
    return !error;
};

// --- LANDING CONTENT ---
export const fetchLandingContent = async (): Promise<{ slides: CarouselSlide[], partners: Partner[] }> => {
    try {
        const { data: slidesData } = await supabase.from('carousel_slides').select('*').order('order', { ascending: true });
        const { data: partnersData } = await supabase.from('partners').select('*').order('created_at', { ascending: false });

        return {
            slides: (slidesData || []).map((s:any) => ({ 
                id: s.id, title: s.title, subtitle: s.subtitle, imageUrl: s.image_url, 
                buttonText: s.button_text, order: s.order 
            })),
            partners: (partnersData || []).map((p:any) => ({ 
                id: p.id, name: p.name, logoUrl: p.logo_url, active: p.active 
            }))
        };
    } catch (e) {
        return { slides: [], partners: [] };
    }
}

export const updateCarouselSlide = async (slide: CarouselSlide): Promise<{ success: boolean, error?: string }> => {
    const payload = {
        title: slide.title, subtitle: slide.subtitle, image_url: slide.imageUrl,
        button_text: slide.buttonText, order: slide.order
    };
    const { error } = await supabase.from('carousel_slides').update(payload).eq('id', slide.id);
    return { success: !error, error: error?.message };
}

export const addCarouselSlide = async (slide: Omit<CarouselSlide, 'id'>): Promise<boolean> => {
    const { error } = await supabase.from('carousel_slides').insert([{
        title: slide.title, subtitle: slide.subtitle, image_url: slide.imageUrl,
        button_text: slide.buttonText, order: slide.order
    }]);
    return !error;
}

export const addPartner = async (name: string, logoUrl: string): Promise<boolean> => {
    const { error } = await supabase.from('partners').insert([{ name, logo_url: logoUrl, active: true }]);
    return !error;
}

export const deletePartner = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    return !error;
}
