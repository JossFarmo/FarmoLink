
import { supabase, safeQuery } from './supabaseClient';
import { CarouselSlide, Partner, Notification, UserRole, Product, Pharmacy, Order, PrescriptionRequest } from '../types';

export * from './authService';
export * from './pharmacyService';
export * from './productService';
export * from './orderService';
export * from './backupService';

// --- SISTEMA DE COFRE (CACHE) POR USUÁRIO ---
interface UserCache {
    products: Product[];
    pharmacies: Pharmacy[];
    orders: Order[];
    prescriptions: PrescriptionRequest[];
    lastSync: number;
}

let MasterCache: Record<string, UserCache> = {};
let landingCache: { slides: CarouselSlide[], partners: Partner[] } | null = null;

export const getCacheForUser = (userId: string) => MasterCache[userId] || null;

export const setCacheForUser = (userId: string, data: Partial<UserCache>) => {
    if (!MasterCache[userId]) {
        MasterCache[userId] = { products: [], pharmacies: [], orders: [], prescriptions: [], lastSync: 0 };
    }
    MasterCache[userId] = { ...MasterCache[userId], ...data, lastSync: Date.now() };
};

/**
 * LIMPEZA CRÍTICA: Esvazia todos os caches da memória do navegador.
 */
export const clearAllCache = () => {
    MasterCache = {};
    landingCache = null;
    console.log("🧹 Memória de cache esvaziada com sucesso.");
};

// --- REVIEWS / RATING ---
export const submitReview = async (orderId: string, pharmacyId: string, customerName: string, rating: number, comment: string) => {
    try {
        const { error } = await supabase.from('reviews').insert([{
            order_id: orderId,
            pharmacy_id: pharmacyId,
            customer_name: customerName,
            rating,
            comment
        }]);

        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Review submission error:", e);
        return false;
    }
};

export const fetchPharmacyReviews = async (pharmacyId: string) => {
    const { data } = await supabase.from('reviews')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false });
    return data || [];
};

// --- NOTIFICATIONS ---
export const fetchNotifications = async (): Promise<Notification[]> => {
    const session = await safeQuery(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    });
    if (!session?.user) return [];

    const data = await safeQuery(async () => {
        const { data } = await supabase.from('notifications')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10);
        return data;
    });
    
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

export const sendSystemNotification = async (target: 'ALL' | 'CUSTOMER' | 'PHARMACY', title: string, message: string): Promise<boolean> => {
    const { data: profiles } = await supabase.from('profiles').select('id, role');
    if (!profiles) return false;

    const filtered = profiles.filter(p => target === 'ALL' || p.role === target);
    if (filtered.length === 0) return true;

    const notifications = filtered.map(p => ({
        user_id: p.id,
        title,
        message,
        type: 'SYSTEM',
        is_read: false
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    return !error;
}

// --- LANDING CONTENT ---
export const fetchLandingContent = async (): Promise<{ slides: CarouselSlide[], partners: Partner[] }> => {
    if (landingCache) return landingCache;

    const res = await safeQuery(async () => {
        const [slidesRes, partnersRes] = await Promise.all([
            supabase.from('carousel_slides').select('*').order('order', { ascending: true }),
            supabase.from('partners').select('*').order('created_at', { ascending: false })
        ]);
        return { slides: slidesRes.data, partners: partnersRes.data };
    });

    if (!res) return { slides: [], partners: [] };

    const result = {
        slides: (res.slides || []).map((s:any) => ({ 
            id: s.id, title: s.title, subtitle: s.subtitle, imageUrl: s.image_url, 
            buttonText: s.button_text, order: s.order 
        })),
        partners: (res.partners || []).map((p:any) => ({ 
            id: p.id, name: p.name, logoUrl: p.logo_url, active: p.active 
        }))
    };
    
    landingCache = result;
    return result;
}

export const updateCarouselSlide = async (slide: CarouselSlide): Promise<{success: boolean}> => {
    const { error } = await supabase.from('carousel_slides').update({
        title: slide.title,
        subtitle: slide.subtitle,
        image_url: slide.imageUrl,
        button_text: slide.buttonText,
        order: slide.order
    }).eq('id', slide.id);
    if (!error) landingCache = null;
    return { success: !error };
}

export const addCarouselSlide = async (slide: Omit<CarouselSlide, 'id'>): Promise<boolean> => {
    const { error } = await supabase.from('carousel_slides').insert([{
        title: slide.title,
        subtitle: slide.subtitle,
        image_url: slide.imageUrl,
        button_text: slide.buttonText,
        order: slide.order
    }]);
    if (!error) landingCache = null;
    return !error;
}

export const addPartner = async (name: string, logoUrl: string): Promise<boolean> => {
    const { error } = await supabase.from('partners').insert([{
        name,
        logo_url: logoUrl,
        active: true
    }]);
    if (!error) landingCache = null;
    return !error;
}

export const deletePartner = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (!error) landingCache = null;
    return !error;
}

// --- SUPORTE ---
export const createSupportTicket = async (userId: string, name: string, email: string, subject: string, message: string) => {
    const ticket = await safeQuery(async () => {
        const { data } = await supabase.from('support_tickets').insert([{
            user_id: userId, user_name: name, user_email: email, subject, status: 'OPEN'
        }]).select().single();
        return data;
    });

    if (!ticket) return false;

    await supabase.from('support_messages').insert([{
        ticket_id: ticket.id, sender_id: userId, sender_name: name, sender_role: 'CUSTOMER', message
    }]);
    return true;
}

export const fetchUserTickets = async (userId: string) => {
    const data = await safeQuery(async () => {
        const { data } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        return data;
    });
    return data || [];
}

export const fetchAllSupportTickets = async () => {
    const data = await safeQuery(async () => {
        const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
        return data;
    });
    return data || [];
}

export const fetchTicketMessages = async (ticketId: string) => {
    const data = await safeQuery(async () => {
        const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
        return data;
    });
    return data || [];
}

export const sendTicketMessage = async (ticketId: string, senderId: string, senderName: string, role: string, message: string) => {
    const { error } = await supabase.from('support_messages').insert([{
        ticket_id: ticketId, sender_id: senderId, sender_name: senderName, sender_role: role, message
    }]);
    return !error;
}

export const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    return !error;
}
