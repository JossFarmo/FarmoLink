
import { supabase } from './supabaseClient';
import { Order, OrderStatus, PrescriptionRequest, PrescriptionQuote, QuotedItem, UserRole } from '../types';

export const createOrder = async (order: Omit<Order, 'id' | 'date'>): Promise<{ success: boolean, error?: string }> => {
    const thirtySecondsAgo = new Date(Date.now() - 45000).toISOString();
    const { data: duplicates } = await supabase
        .from('orders')
        .select('id')
        .eq('pharmacy_id', order.pharmacyId)
        .eq('customer_name', order.customerName)
        .eq('total', order.total)
        .gt('created_at', thirtySecondsAgo);

    if (duplicates && duplicates.length > 0) return { success: true };

    const { data: pharm } = await supabase.from('pharmacies').select('commission_rate').eq('id', order.pharmacyId).single();
    const rate = pharm?.commission_rate ?? 10;
    const commissionVal = (Number(order.total) * Number(rate)) / 100;

    const { error } = await supabase.from('orders').insert([{
        customer_name: order.customerName,
        customer_phone: order.customerPhone, 
        pharmacy_id: order.pharmacyId,
        items: order.items, 
        total: order.total,
        status: order.status,
        type: order.type,
        address: order.address, 
        commission_amount: commissionVal
    }]);

    return { success: !error, error: error?.message };
};

export const fetchOrders = async (pharmacyId?: string): Promise<Order[]> => {
    let query = supabase.from('orders').select('*');
    if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) return [];

    return (data || []).map((o: any) => ({
        id: o.id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
        total: o.total,
        status: o.status as OrderStatus,
        date: new Date(o.created_at).toLocaleString(),
        type: o.type,
        pharmacyId: o.pharmacy_id,
        address: o.address,
        commissionAmount: o.commission_amount
    }));
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<boolean> => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    return !error;
};

export const createPrescriptionRequest = async (customerId: string, imageUrl: string, pharmacyIds: string[], notes?: string): Promise<boolean> => {
    const { error } = await supabase.from('prescriptions').insert([{
        customer_id: customerId,
        image_url: imageUrl,
        notes: notes,
        status: 'WAITING_FOR_QUOTES',
        target_pharmacies: pharmacyIds
    }]);
    return !error;
};

export const fetchPrescriptionRequests = async (role: UserRole, userId?: string, pharmacyId?: string): Promise<PrescriptionRequest[]> => {
    try {
        let query = supabase.from('prescriptions').select(`*, quotes:prescription_quotes(*)`);
        if (role === UserRole.CUSTOMER && userId) query = query.eq('customer_id', userId);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        if (!data) return [];

        let filtered = data;
        if (role === UserRole.PHARMACY && pharmacyId) {
            filtered = data.filter((r: any) => Array.isArray(r.target_pharmacies) && r.target_pharmacies.includes(pharmacyId));
        }

        return filtered.map((r: any) => ({
            id: r.id,
            customerId: r.customer_id,
            imageUrl: r.image_url,
            date: new Date(r.created_at).toLocaleString(), // Agora inclui hora na data base
            status: r.status,
            targetPharmacies: r.target_pharmacies,
            notes: r.notes,
            quotes: (r.quotes || []).map((q: any) => ({
                id: q.id,
                prescriptionId: q.prescription_id,
                pharmacyId: q.pharmacy_id,
                pharmacyName: q.pharmacy_name,
                items: typeof q.items === 'string' ? JSON.parse(q.items) : q.items,
                totalPrice: q.total,
                deliveryFee: q.delivery_fee,
                status: q.status,
                notes: q.notes,
                rejectionReason: q.rejection_reason,
                createdAt: q.created_at
            }))
        }));
    } catch (err) {
        return [];
    }
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
        status: 'REJECTED', notes: reason, total: 0, delivery_fee: 0, items: []
    }]);
    return !error;
};

export const acceptQuote = async (quote: PrescriptionQuote, customerName: string, address: string, customerPhone: string): Promise<boolean> => {
    // 1. Aceita o orçamento vencedor
    await supabase.from('prescription_quotes').update({ status: 'ACCEPTED' }).eq('id', quote.id);
    
    // 2. Rejeita AUTOMATICAMENTE todos os outros orçamentos desta receita que ainda estão pendentes
    await supabase.from('prescription_quotes')
        .update({ 
            status: 'REJECTED', 
            rejection_reason: 'O cliente preferiu outra oferta concorrente.' 
        })
        .eq('prescription_id', quote.prescriptionId)
        .neq('id', quote.id)
        .eq('status', 'RESPONDED');

    // 3. Finaliza a receita globalmente
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
    const { error } = await supabase.from('prescription_quotes')
        .update({ status: 'REJECTED', notes: 'Recusado pelo cliente.', rejection_reason: 'Cliente não concordou com os valores/itens.' })
        .eq('id', quoteId);
    return !error;
};

export const deletePrescriptionRequest = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('prescriptions').delete().eq('id', id);
    return !error;
};
