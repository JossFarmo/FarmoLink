
import { supabase, safeQuery } from './supabaseClient';
import { CarouselSlide, Partner, Notification, UserRole, Product, Pharmacy, Order, PrescriptionRequest, FAQItem, SystemContent } from '../types';

export * from './authService';
export * from './pharmacyService';
export * from './productService';
export * from './orderService';
export * from './backupService';

// --- SISTEMA DE CONTEÚDO DINÂMICO (FAQ & SOBRE NÓS) ---

export const fetchFaq = async (): Promise<FAQItem[]> => {
    const { data } = await supabase.from('faq_items').select('*').order('order', { ascending: true });
    return data || [];
};

export const updateFaqItem = async (id: string, item: Partial<FAQItem>) => {
    const { error } = await supabase.from('faq_items').update(item).eq('id', id);
    return !error;
};

export const addFaqItem = async (item: Omit<FAQItem, 'id'>) => {
    const { error } = await supabase.from('faq_items').insert([item]);
    return !error;
};

export const deleteFaqItem = async (id: string) => {
    const { error } = await supabase.from('faq_items').delete().eq('id', id);
    return !error;
};

export const fetchAboutUs = async (): Promise<SystemContent> => {
    const { data } = await supabase.from('system_content').select('*').eq('id', 'about_us').single();
    if (!data) return { id: 'about_us', title: 'FarmoLink', innovation_text: 'Carregando...' };
    return {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle,
        content: data.content,
        mission_text: data.mission_text,
        innovation_text: data.innovation_text,
        val_transparency: data.val_transparency,
        val_security: data.val_security,
        val_ethics: data.val_ethics,
        val_accessibility: data.val_accessibility,
        partners_count_text: data.partners_count_text,
        footer_text: data.footer_text
    };
};

export const updateAboutUs = async (content: SystemContent) => {
    const { error } = await supabase.from('system_content').update({
        title: content.title,
        subtitle: content.subtitle,
        content: content.content,
        mission_text: content.mission_text,
        innovation_text: content.innovation_text,
        val_transparency: content.val_transparency,
        val_security: content.val_security,
        val_ethics: content.val_ethics,
        val_accessibility: content.val_accessibility,
        partners_count_text: content.partners_count_text,
        footer_text: content.footer_text,
        updated_at: new Date().toISOString()
    }).eq('id', 'about_us');
    return !error;
};

// --- RESTO DOS SERVIÇOS (MANTIDOS) ---
// (getCacheForUser, setCacheForUser, submitReview, fetchNotifications, fetchLandingContent, etc.)

export const getCacheForUser = (userId: string) => {
    try {
        const cached = localStorage.getItem('farmolink_cache_' + userId);
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.lastSync > 1000 * 60 * 30) return null;
        return parsed;
    } catch (e) { return null; }
};

export const setCacheForUser = (userId: string, data: Partial<any>) => {
    try {
        const existing = getCacheForUser(userId) || { products: [], pharmacies: [], lastSync: 0 };
        const newData = { ...existing, ...data, lastSync: Date.now() };
        localStorage.setItem('farmolink_cache_' + userId, JSON.stringify(newData));
    } catch (e) { console.error("Erro ao salvar cache local", e); }
};

export const clearAllCache = () => {
    Object.keys(localStorage)
        .filter(key => key.startsWith('farmolink_cache_'))
        .forEach(key => localStorage.removeItem(key));
};

export const submitReview = async (orderId: string, pharmacyId: string, customerName: string, rating: number, comment: string) => {
    const { error } = await supabase.from('reviews').insert([{ order_id: orderId, pharmacy_id: pharmacyId, customer_name: customerName, rating, comment }]);
    return !error;
};

export const fetchPharmacyReviews = async (pharmacyId: string) => {
    const { data } = await supabase.from('reviews').select('*').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false }).limit(20);
    return data || [];
};

export const fetchNotifications = async (): Promise<Notification[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15);
    return (data || []).map((n:any) => ({ id: n.id, userId: n.user_id, title: n.title, message: n.message, type: n.type, read: n.is_read, date: n.created_at, link: n.link }));
}

export const markNotificationRead = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    return !error;
}

export const deleteNotification = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    return !error;
}

export const fetchLandingContent = async (): Promise<{ slides: CarouselSlide[], partners: Partner[] }> => {
    const { data: slides } = await supabase.from('carousel_slides').select('id, title, subtitle, image_url, button_text, order').order('order', { ascending: true });
    const { data: partners } = await supabase.from('partners').select('id, name, logo_url, active').eq('active', true);
    return {
        slides: (slides || []).map((s:any) => ({ id: s.id, title: s.title, subtitle: s.subtitle, imageUrl: s.image_url, buttonText: s.button_text, order: s.order })),
        partners: (partners || []).map((p:any) => ({ id: p.id, name: p.name, logoUrl: p.logo_url, active: p.active }))
    };
}

export const createSupportTicket = async (userId: string, name: string, email: string, subject: string, message: string) => {
    try {
        const { data: ticket, error: tError } = await supabase.from('support_tickets').insert([{ user_id: userId, user_name: name, user_email: email, subject, status: 'OPEN' }]).select('id').single();
        if (tError) throw tError;
        await supabase.from('support_messages').insert([{ ticket_id: ticket.id, sender_id: userId, sender_name: name, sender_role: 'CUSTOMER', message }]);
        return true;
    } catch (e) { return false; }
};

export const fetchUserTickets = async (userId: string) => {
    const { data } = await supabase.from('support_tickets').select('id, subject, status, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
};

export const fetchAllSupportTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const fetchTicketMessages = async (ticketId: string) => {
    const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    return data || [];
};

export const sendTicketMessage = async (ticketId: string, senderId: string, senderName: string, senderRole: string, message: string) => {
    const { error } = await supabase.from('support_messages').insert([{ ticket_id: ticketId, sender_id: senderId, sender_name: senderName, sender_role: senderRole, message }]);
    return !error;
};

export const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    return !error;
};

export const updateCarouselSlide = async (slide: CarouselSlide) => {
    const { error } = await supabase.from('carousel_slides').update({ title: slide.title, subtitle: slide.subtitle, image_url: slide.imageUrl, button_text: slide.buttonText, order: slide.order }).eq('id', slide.id);
    return { success: !error };
};

export const addCarouselSlide = async (slide: Omit<CarouselSlide, 'id'>) => {
    const { error } = await supabase.from('carousel_slides').insert([{ title: slide.title, subtitle: slide.subtitle, image_url: slide.imageUrl, button_text: slide.buttonText, order: slide.order }]);
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

export const sendSystemNotification = async (target: 'ALL' | 'CUSTOMER' | 'PHARMACY', title: string, message: string) => {
    try {
        let userQuery = supabase.from('profiles').select('id');
        if (target !== 'ALL') userQuery = userQuery.eq('role', target);
        const { data: users } = await userQuery;
        if (!users || users.length === 0) return true;
        const notifications = users.map(u => ({ user_id: u.id, title, message, type: 'SYSTEM', is_read: false }));
        const { error } = await supabase.from('notifications').insert(notifications);
        return !error;
    } catch (e) { return false; }
};
