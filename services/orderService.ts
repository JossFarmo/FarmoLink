
import { supabase, safeQuery } from './supabaseClient';
import { Order, OrderStatus, PrescriptionRequest, PrescriptionQuote, QuotedItem, UserRole } from '../types';

const safeJsonParse = (data: any): any[] => {
    if (data === null || data === undefined) return [];
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) { return []; }
    }
    if (Array.isArray(data)) return data;
    return [data];
};

export const createOrder = async (order: Omit<Order, 'id' | 'date'>): Promise<{ success: boolean, error?: string }> => {
    return safeQuery(async () => {
        // PROTEÇÃO EXTRA: Impede pedidos duplicados idênticos em menos de 45 segundos (Prevenção de clique duplo no servidor)
        const fortyFiveSecondsAgo = new Date(Date.now() - 45000).toISOString();
        const { data: duplicates } = await supabase
            .from('orders')
            .select('id')
            .eq('pharmacy_id', order.pharmacyId)
            .eq('customer_name', order.customerName)
            .eq('total', order.total)
            .gt('created_at', fortyFiveSecondsAgo);
            
        if (duplicates && duplicates.length > 0) {
            console.warn("Bloqueada tentativa de pedido duplicado.");
            return { success: true }; // Retorna sucesso para o cliente não ver erro, mas não insere
        }

        const { data: pharm } = await supabase.from('pharmacies').select('commission_rate').eq('id', order.pharmacyId).single();
        const rate = pharm?.commission_rate ?? 10;
        const commissionVal = (Number(order.total) * Number(rate)) / 100;

        const { error } = await supabase.from('orders').insert([{
            customer_name: order.customerName, customer_phone: order.customerPhone, pharmacy_id: order.pharmacyId,
            items: order.items, total: order.total, status: order.status, type: order.type, address: order.address, commission_amount: commissionVal
        }]);
        return { success: !error, error: error?.message };
    }) || { success: false, error: "Erro de conexão" };
};

export const fetchOrders = async (pharmacyId?: string): Promise<Order[]> => {
    const res = await safeQuery(async () => {
        let query = supabase.from('orders').select('*');
        if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    });

    return (res || []).map((o: any) => ({
        id: o.id, customerName: o.customer_name, customerPhone: o.customer_phone,
        items: safeJsonParse(o.items), total: o.total, status: o.status as OrderStatus,
        // Formatação explícita com Hora e Minuto
        date: new Date(o.created_at).toLocaleString('pt-AO', { 
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
        }), 
        type: o.type, pharmacyId: o.pharmacy_id,
        address: o.address, commissionAmount: o.commission_amount
    }));
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<boolean> => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    return !error;
};

export const createPrescriptionRequest = async (customerId: string, imageUrl: string, pharmacyIds: string[], notes?: string): Promise<boolean> => {
    const { error } = await supabase.from('prescriptions').insert([{
        customer_id: customerId, image_url: imageUrl, notes: notes, status: 'WAITING_FOR_QUOTES', target_pharmacies: pharmacyIds
    }]);
    return !error;
};

export const fetchPrescriptionRequests = async (role: UserRole, userId?: string, pharmacyId?: string): Promise<PrescriptionRequest[]> => {
    const data = await safeQuery(async () => {
        let query = supabase.from('prescriptions').select(`*, quotes:prescription_quotes(*)`);
        if (role === UserRole.CUSTOMER && userId) {
            query = query.eq('customer_id', userId);
        } else if (role === UserRole.PHARMACY && pharmacyId) {
            query = query.contains('target_pharmacies', JSON.stringify([pharmacyId]));
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    });

    return (data || []).map((r: any) => ({
        id: r.id, customerId: r.customer_id, imageUrl: r.image_url,
        date: new Date(r.created_at).toLocaleString('pt-AO', { 
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
        }),
        status: r.status,
        targetPharmacies: safeJsonParse(r.target_pharmacies), notes: r.notes,
        quotes: (r.quotes || []).map((q: any) => ({
            id: q.id, prescriptionId: q.prescription_id, pharmacyId: q.pharmacy_id, pharmacyName: q.pharmacy_name,
            items: safeJsonParse(q.items), totalPrice: q.total, deliveryFee: q.delivery_fee, status: q.status,
            notes: q.notes, rejectionReason: q.rejection_reason, createdAt: q.created_at
        }))
    }));
};

export const sendPrescriptionQuote = async (requestId: string, pharmacyId: string, pharmacyName: string, items: QuotedItem[], deliveryFee: number, notes?: string): Promise<boolean> => {
    const total = items.reduce((acc, i) => i.available ? acc + (i.price * i.quantity) : acc, 0) + Number(deliveryFee);
    const { error } = await supabase.from('prescription_quotes').insert([{
        prescription_id: requestId, pharmacy_id: pharmacyId, pharmacy_name: pharmacyName, 
        items, total, delivery_fee: deliveryFee, status: 'RESPONDED', notes
    }]);
    return !error;
};

export const rejectPrescription = async (requestId: string, pharmacyId: string, pharmacyName: string, reason: string): Promise<boolean> => {
    const { error } = await supabase.from('prescription_quotes').insert([{
        prescription_id: requestId, pharmacy_id: pharmacyId, pharmacy_name: pharmacyName, 
        status: 'REJECTED', notes: reason, rejection_reason: reason, total: 0, delivery_fee: 0, items: []
    }]);
    return !error;
};

export const acceptQuote = async (quote: PrescriptionQuote, customerName: string, address: string, customerPhone: string): Promise<boolean> => {
    await supabase.from('prescription_quotes').update({ status: 'ACCEPTED' }).eq('id', quote.id);
    await supabase.from('prescription_quotes').update({ status: 'REJECTED', rejection_reason: 'O cliente preferiu outra oferta concorrente.' }).eq('prescription_id', quote.prescriptionId).neq('id', quote.id).eq('status', 'RESPONDED');
    await supabase.from('prescriptions').update({ status: 'COMPLETED' }).eq('id', quote.prescriptionId); 

    const orderItems = quote.items.filter(i => i.available).map(i => ({
        id: `rx-${Date.now()}`, name: i.name, price: i.price, pharmacyId: quote.pharmacyId,
        image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', requiresPrescription: true, stock: 0, quantity: i.quantity, description: ''
    }));

    const res = await createOrder({
        customerName, customerPhone, items: orderItems, total: quote.totalPrice,
        status: OrderStatus.PENDING, type: 'DELIVERY', pharmacyId: quote.pharmacyId, address
    });
    return res.success;
};

export const rejectCustomerQuote = async (quoteId: string): Promise<boolean> => {
    const { error } = await supabase.from('prescription_quotes').update({ status: 'REJECTED', rejection_reason: 'Recusado pelo cliente.' }).eq('id', quoteId);
    return !error;
};

export const deletePrescriptionRequest = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('prescriptions').delete().eq('id', id);
    return !error;
};
