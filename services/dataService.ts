import { supabase, safeQuery } from './supabaseClient';
import { CarouselSlide, Partner, Notification, UserRole, Product, Pharmacy, Order, PrescriptionRequest } from '../types';

export * from './authService';
export * from './pharmacyService';
export * from './productService';
export * from './orderService';
export * from './backupService';

// --- SISTEMA DE CACHE PERSISTENTE (localStorage) ---
const CACHE_KEY_PREFIX = 'farmolink_cache_';
const CACHE_EXPIRATION = 1000 * 60 * 30; // 30 minutos

export const getCacheForUser = (userId: string) => {
    try {
        const cached = localStorage.getItem(CACHE_KEY_PREFIX + userId);
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.lastSync > CACHE_EXPIRATION) return null;
        return parsed;
    } catch (e) { return null; }
};

export const setCacheForUser = (userId: string, data: Partial<any>) => {
    try {
        const existing = getCacheForUser(userId) || { products: [], pharmacies: [], lastSync: 0 };
        const newData = { ...existing, ...data, lastSync: Date.now() };
        localStorage.setItem(CACHE_KEY_PREFIX + userId, JSON.stringify(newData));
    } catch (e) { console.error("Erro ao salvar cache local", e); }
};

export const clearAllCache = () => {
    Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_KEY_PREFIX))
        .forEach(key => localStorage.removeItem(key));
    console.log("🧹 Cache local esvaziado.");
};

// --- REVIEWS ---
export const submitReview = async (orderId: string, pharmacyId: string, customerName: string, rating: number, comment: string) => {
    try {
        const { error } = await supabase.from('reviews').insert([{
            order_id: orderId,
            pharmacy_id: pharmacyId,
            customer_name: customerName,
            rating,
            comment
        }]);
        return !error;
    } catch (e) { return false; }
};

export const fetchPharmacyReviews = async (pharmacyId: string) => {
    // OTIMIZAÇÃO: select específico
    const { data } = await supabase
        .from('reviews')
        .select('customer_name, rating, comment, created_at')
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false })
        .limit(20);
    return data || [];
};

// --- NOTIFICATIONS ---
export const fetchNotifications = async (): Promise<Notification[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data } = await supabase.from('notifications')
        .select('id, user_id, title, message, type, is_read, created_at, link')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(15);
    
    return (data || []).map((n:any) => ({
        id: n.id, userId: n.user_id, title: n.title, message: n.message,
        type: n.type, read: n.is_read, date: n.created_at, link: n.link
    }));
}

export const markNotificationRead = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    return !error;
}

export const deleteNotification = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    return !error;
}

// --- LANDING ---
export const fetchLandingContent = async (): Promise<{ slides: CarouselSlide[], partners: Partner[] }> => {
    const { data: slides } = await supabase.from('carousel_slides').select('id, title, subtitle, image_url, button_text, order').order('order', { ascending: true });
    const { data: partners } = await supabase.from('partners').select('id, name, logo_url, active').eq('active', true);

    return {
        slides: (slides || []).map((s:any) => ({ id: s.id, title: s.title, subtitle: s.subtitle, imageUrl: s.image_url, buttonText: s.button_text, order: s.order })),
        partners: (partners || []).map((p:any) => ({ id: p.id, name: p.name, logoUrl: p.logo_url, active: p.active }))
    };
}

// --- SUPPORT ---

export const createSupportTicket = async (userId: string, name: string, email: string, subject: string, message: string) => {
    try {
        const { data: ticket, error: tError } = await supabase.from('support_tickets').insert([{
            user_id: userId, user_name: name, user_email: email, subject, status: 'OPEN'
        }]).select('id').single();
        if (tError) throw tError;
        
        await supabase.from('support_messages').insert([{
            ticket_id: ticket.id, sender_id: userId, sender_name: name, sender_role: 'CUSTOMER', message
        }]);
        return true;
    } catch (e) { return false; }
};

export const fetchUserTickets = async (userId: string) => {
    const { data } = await supabase.from('support_tickets').select('id, subject, status, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
};

export const fetchAllSupportTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('id, user_name, user_email, subject, status, created_at').order('created_at', { ascending: false });
    return data || [];
};

export const fetchTicketMessages = async (ticketId: string) => {
    const { data } = await supabase.from('support_messages').select('id, sender_name, sender_role, message, created_at, sender_id').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    return data || [];
};

export const sendTicketMessage = async (ticketId: string, senderId: string, senderName: string, senderRole: string, message: string) => {
    const { error } = await supabase.from('support_messages').insert([{
        ticket_id: ticketId, sender_id: senderId, sender_name: senderName, sender_role: senderRole, message
    }]);
    return !error;
};

export const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    return !error;
};

// --- MARKETING ---

export const updateCarouselSlide = async (slide: CarouselSlide) => {
    const { error } = await supabase.from('carousel_slides').update({
        title: slide.title, subtitle: slide.subtitle, image_url: slide.imageUrl, button_text: slide.buttonText, order: slide.order
    }).eq('id', slide.id);
    return { success: !error };
};

export const addCarouselSlide = async (slide: Omit<CarouselSlide, 'id'>) => {
    const { error } = await supabase.from('carousel_slides').insert([{
        title: slide.title, subtitle: slide.subtitle, image_url: slide.imageUrl, button_text: slide.buttonText, order: slide.order
    }]);
    return !error;
};

export const addPartner = async (name: string, logoUrl: string) => {
    const { error } = await supabase.from('partners').insert([{ name, logo_url: logoUrl, active: true }]);
    return !error;
};

export const deletePartner = async (id: string) => {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    return !error;
};

// --- SYSTEM ---

export const sendSystemNotification = async (target: 'ALL' | 'CUSTOMER' | 'PHARMACY', title: string, message: string) => {
    try {
        let userQuery = supabase.from('profiles').select('id');
        if (target !== 'ALL') userQuery = userQuery.eq('role', target);
        
        const { data: users } = await userQuery;
        if (!users || users.length === 0) return true;

        const notifications = users.map(u => ({
            user_id: u.id, title, message, type: 'SYSTEM', is_read: false
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        return !error;
    } catch (e) { return false; }
};