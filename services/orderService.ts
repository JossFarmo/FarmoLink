
import { supabase } from './supabaseClient';
import { Order, OrderStatus, PrescriptionRequest, PrescriptionQuote, QuotedItem, UserRole } from '../types';

export const createOrder = async (order: Omit<Order, 'id' | 'date'>): Promise<{ success: boolean, error?: string }> => {
    // --- PROTEÇÃO CONTRA DUPLICIDADE (SERVER-SIDE DEBOUNCE) ---
    // Verifica se um pedido idêntico foi criado nos últimos 45 segundos
    const thirtySecondsAgo = new Date(Date.now() - 45000).toISOString();
    
    // Tenta identificar duplicata baseada em Farmácia, Cliente, Total e Tempo
    const { data: duplicates } = await supabase
        .from('orders')
        .select('id')
        .eq('pharmacy_id', order.pharmacyId)
        .eq('customer_name', order.customerName) // Usamos nome pois telefone as vezes é opcional na interface antiga
        .eq('total', order.total)
        .gt('created_at', thirtySecondsAgo);

    if (duplicates && duplicates.length > 0) {
        console.warn("Pedido duplicado detectado e prevenido.");
        // Retornamos sucesso para que a UI prossiga normalmente sem erro, 
        // mas não criamos o registro novamente.
        return { success: true };
    }

    // Tenta serializar para garantir compatibilidade com colunas JSONB ou Text
    let itemsPayload = order.items;
    
    try {
        itemsPayload = JSON.parse(JSON.stringify(order.items));
    } catch (e) {
        console.error("Erro ao serializar itens do carrinho", e);
        return { success: false, error: "Erro nos dados do carrinho." };
    }

    // --- CORREÇÃO FINANCEIRA ---
    // Busca a taxa de comissão ATUAL da farmácia para congelar neste pedido
    let commissionVal = 0;
    if (order.pharmacyId) {
        const { data: pharm } = await supabase
            .from('pharmacies')
            .select('commission_rate')
            .eq('id', order.pharmacyId)
            .single();
        
        const rate = pharm?.commission_rate ?? 10; // Padrão 10% se não encontrar
        commissionVal = (Number(order.total) * Number(rate)) / 100;
    }

    // LÓGICA OFICIAL: Usando a coluna customer_phone corretamente.
    const payload = {
        customer_name: order.customerName,
        customer_phone: order.customerPhone, 
        pharmacy_id: order.pharmacyId,
        items: itemsPayload, 
        total: order.total,
        status: order.status,
        type: order.type,
        address: order.address, 
        commission_amount: commissionVal, // <--- VALOR GRAVADO PARA HISTÓRICO FINANCEIRO
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('orders').insert([payload]);

    if (error) {
        console.error("Erro Supabase createOrder:", error);
        return { success: false, error: error.message || "Erro de banco de dados." };
    }
    return { success: true };
};

export const fetchOrders = async (pharmacyId?: string): Promise<Order[]> => {
    let query = supabase.from('orders').select('*');
    if (pharmacyId) {
        query = query.eq('pharmacy_id', pharmacyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
        console.error("Erro fetchOrders:", error);
        return [];
    }

    return (data || []).map((o: any) => {
        // LÓGICA HÍBRIDA DE LEITURA (Fallback para telefone antigo)
        let phone = o.customer_phone;
        let finalAddress = o.address;

        if (!phone && o.address && typeof o.address === 'string' && o.address.includes('| Tel:')) {
            const parts = o.address.split('| Tel:');
            finalAddress = parts[0].trim(); 
            phone = parts[1].trim(); 
        }

        return {
            id: o.id,
            customerName: o.customer_name,
            customerPhone: phone,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
            total: o.total,
            status: o.status,
            date: new Date(o.created_at).toLocaleString(),
            type: o.type,
            pharmacyId: o.pharmacy_id,
            address: finalAddress, 
            pharmacyPhone: o.pharmacy_phone,
            commissionAmount: o.commission_amount 
        };
    });
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<boolean> => {
    const { error } = await supabase.from('orders').update({ status: status }).eq('id', id);
    return !error;
};

// --- CORREÇÃO AQUI: Tabela 'prescriptions' ---
export const createPrescriptionRequest = async (customerId: string, imageUrl: string, pharmacyIds: string[], notes?: string): Promise<boolean> => {
    const { error } = await supabase.from('prescriptions').insert([{
        customer_id: customerId,
        image_url: imageUrl,
        notes: notes,
        status: 'WAITING_FOR_QUOTES',
        target_pharmacies: pharmacyIds,
        created_at: new Date().toISOString()
    }]);
    
    if (error) {
        console.error("Erro ao criar receita:", error);
    }
    return !error;
};

export const deletePrescriptionRequest = async (requestId: string): Promise<boolean> => {
    // Apaga orçamentos filhos primeiro (embora CASCADE no banco devesse cuidar disso, garantimos aqui)
    await supabase.from('prescription_quotes').delete().eq('prescription_id', requestId);
    const { error } = await supabase.from('prescriptions').delete().eq('id', requestId);
    return !error;
};

// --- CORREÇÃO AQUI: Tabela 'prescriptions' ---
export const fetchPrescriptionRequests = async (role: UserRole, userId?: string, pharmacyId?: string): Promise<PrescriptionRequest[]> => {
    let query = supabase.from('prescriptions').select(`*, quotes:prescription_quotes(*)`);

    if (role === UserRole.CUSTOMER && userId) {
        query = query.eq('customer_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data) {
        console.error("Erro fetchPrescriptionRequests", error);
        return [];
    }

    let filteredData = data;
    if (role === UserRole.PHARMACY && pharmacyId) {
        // Filtragem no lado do cliente pois target_pharmacies é um array JSONB
        filteredData = data.filter((r: any) => {
            // Verifica se target_pharmacies existe e se é um array
            if (Array.isArray(r.target_pharmacies)) {
                return r.target_pharmacies.includes(pharmacyId);
            }
            return false; 
        });
    }

    return filteredData.map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        imageUrl: r.image_url,
        date: new Date(r.created_at).toLocaleDateString(),
        status: r.status,
        targetPharmacies: r.target_pharmacies,
        notes: r.notes,
        quotes: (r.quotes || []).map((q: any) => ({
            id: q.id,
            prescriptionId: q.prescription_id,
            pharmacyId: q.pharmacy_id,
            pharmacyName: q.pharmacy_name,
            items: typeof q.items === 'string' ? JSON.parse(q.items) : q.items,
            totalPrice: q.total, // Mapeado de 'total' do banco
            deliveryFee: q.delivery_fee,
            status: q.status,
            notes: q.notes,
            createdAt: q.created_at
        }))
    }));
};

export const sendPrescriptionQuote = async (requestId: string, pharmacyId: string, pharmacyName: string, items: QuotedItem[], deliveryFee: number, notes?: string): Promise<boolean> => {
    // Sanitização de dados numéricos para evitar erros
    const cleanItems = items.map(i => ({
        name: i.name,
        quantity: Number(i.quantity),
        price: Number(i.price),
        available: Boolean(i.available)
    }));
    
    const finalDeliveryFee = Number(deliveryFee);
    const totalPrice = cleanItems.reduce((acc, i) => i.available ? acc + (i.price * i.quantity) : acc, 0) + finalDeliveryFee;

    const { error } = await supabase.from('prescription_quotes').insert([{
        prescription_id: requestId, 
        pharmacy_id: pharmacyId, 
        pharmacy_name: pharmacyName, 
        items: cleanItems,
        total: totalPrice, // NOME CORRIGIDO: Coluna no banco é 'total', não 'total_price'
        delivery_fee: finalDeliveryFee, 
        status: 'RESPONDED', 
        notes: notes || '', 
        created_at: new Date().toISOString()
    }]);

    if (error) {
        console.error("Erro ao enviar orçamento:", error);
        return false;
    }
    return true;
};

export const rejectPrescription = async (requestId: string, pharmacyId: string, pharmacyName: string, reason: string): Promise<boolean> => {
     const { error } = await supabase.from('prescription_quotes').insert([{
        prescription_id: requestId, 
        pharmacy_id: pharmacyId, 
        pharmacy_name: pharmacyName, 
        items: [],
        total: 0, 
        delivery_fee: 0, 
        status: 'REJECTED', 
        notes: reason, 
        created_at: new Date().toISOString()
    }]);
    
    if (error) console.error("Erro ao rejeitar:", error);
    return !error;
};

export const acceptQuote = async (quote: PrescriptionQuote, customerName: string, address: string, customerPhone: string): Promise<boolean> => {
    
    // --- VERIFICAÇÃO DE SEGURANÇA ---
    // Verifica no banco se este orçamento JÁ foi aceito antes de prosseguir
    const { data: currentQuote } = await supabase
        .from('prescription_quotes')
        .select('status')
        .eq('id', quote.id)
        .single();

    if (currentQuote && currentQuote.status === 'ACCEPTED') {
        console.log("Orçamento já foi aceito anteriormente. Ignorando clique duplicado.");
        return true; // Retorna true para a UI pensar que deu certo e redirecionar
    }

    // Atualiza status do orçamento e da solicitação
    await supabase.from('prescription_quotes').update({ status: 'ACCEPTED' }).eq('id', quote.id);
    await supabase.from('prescriptions').update({ status: 'COMPLETED' }).eq('id', quote.prescriptionId); 

    const orderItems = quote.items.filter(i => i.available).map(i => ({
        id: `quoted-${Date.now()}-${Math.random()}`, name: i.name, description: 'Item de receita', price: i.price, pharmacyId: quote.pharmacyId,
        image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', requiresPrescription: true, stock: 0, quantity: i.quantity
    }));

    // Cria o pedido passando o TELEFONE corretamente
    const result = await createOrder({
        customerName: customerName,
        customerPhone: customerPhone, 
        items: orderItems,
        total: quote.totalPrice,
        status: OrderStatus.PENDING,
        type: 'DELIVERY',
        pharmacyId: quote.pharmacyId,
        address: address
    });
    
    return result.success;
};
