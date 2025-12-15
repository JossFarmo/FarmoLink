
import { supabase } from './supabaseClient';
import { Pharmacy, PharmacyInput, PharmacyFinancials, User, OrderStatus } from '../types';

export const recoverPharmacyLink = async (user: User): Promise<boolean> => {
    try {
        const { data: existing } = await supabase.from('pharmacies').select('id').eq('owner_email', user.email).single();
        let pharmId = existing?.id;

        if (!pharmId) {
             const { data: newPharm, error } = await supabase.from('pharmacies').insert([{
                name: `Farmácia de ${user.name}`,
                status: 'PENDING',
                owner_email: user.email,
                is_available: false,
                address: 'Pendente de Configuração',
                rating: 5.0,
                delivery_fee: 0,
                commission_rate: 10
            }]).select().single();
            
            if (error || !newPharm) throw new Error("Falha ao criar farmácia");
            pharmId = newPharm.id;
        }

        const { error: profileError } = await supabase.from('profiles').update({ pharmacy_id: pharmId }).eq('id', user.id);
        if (profileError) throw profileError;

        return true;
    } catch (e) {
        console.error("Recovery failed", e);
        return false;
    }
}

export const getAdminStats = async () => {
    const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: pharmacies } = await supabase.from('pharmacies').select('*', { count: 'exact', head: true });
    
    const { data: orders } = await supabase.from('orders').select('total');
    const totalRevenue = orders?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
    const ordersToday = orders?.length || 0;

    return { users: users || 0, pharmacies: pharmacies || 0, ordersToday: ordersToday, totalRevenue: totalRevenue };
};

export const checkSystemHealth = async () => {
    try { const { error } = await supabase.from('pharmacies').select('id').limit(1); return !error; } catch { return false; }
};

export const fetchPharmacies = async (isAdmin: boolean = false): Promise<Pharmacy[]> => {
  let query = supabase.from('pharmacies').select('*');
  if (!isAdmin) {
    query = query.eq('status', 'APPROVED');
  }
  const { data } = await query;
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    nif: p.nif,
    address: p.address || 'Endereço não informado',
    rating: p.rating,
    deliveryFee: p.delivery_fee,
    minTime: p.min_time || '30-45 min',
    isAvailable: p.is_available,
    distance: '2.5 km', 
    status: p.status,
    ownerEmail: p.owner_email,
    commissionRate: p.commission_rate,
    phone: p.phone 
  }));
};

export const fetchPharmacyById = async (id: string): Promise<Pharmacy | null> => {
    const { data } = await supabase.from('pharmacies').select('*').eq('id', id).single();
    if (!data) return null;
    return {
        id: data.id,
        name: data.name,
        nif: data.nif,
        address: data.address,
        rating: data.rating,
        deliveryFee: data.delivery_fee,
        minTime: data.min_time,
        isAvailable: data.is_available,
        distance: 'N/A',
        status: data.status,
        ownerEmail: data.owner_email,
        commissionRate: data.commission_rate,
        phone: data.phone 
    };
};

export const updatePharmacyDetails = async (id: string, data: PharmacyInput): Promise<boolean> => {
    const { error } = await supabase.from('pharmacies').update({
        name: data.name,
        nif: data.nif,
        address: data.address,
        delivery_fee: data.deliveryFee,
        min_time: data.minTime,
        phone: data.phone, 
        status: 'APPROVED' // Garante que ao salvar configs, se mantenha aprovada
    }).eq('id', id);
    return !error;
};

// --- NOVA FUNÇÃO: Alternar Status Online/Offline ---
export const togglePharmacyAvailability = async (id: string, isAvailable: boolean): Promise<boolean> => {
    const { error } = await supabase.from('pharmacies').update({ is_available: isAvailable }).eq('id', id);
    return !error;
}

export const approvePharmacy = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('pharmacies').update({ status: 'APPROVED' }).eq('id', id);
    return !error;
};

// Rejeitar solicitação (Delete)
export const denyPharmacy = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('pharmacies').delete().eq('id', id);
    return !error;
};

// Excluir farmácia ativa (Delete - mesmo lógica, nome semântico para o admin)
export const deletePharmacy = async (id: string): Promise<boolean> => {
    // Nota: Produtos e Pedidos podem ficar órfãos se não houver CASCADE no banco.
    // O ideal seria limpar produtos antes, mas o delete direto resolve a exigência imediata.
    const { error } = await supabase.from('pharmacies').delete().eq('id', id);
    return !error;
}

export const updatePharmacyCommission = async (id: string, rate: number): Promise<boolean> => {
    const { error } = await supabase.from('pharmacies').update({ commission_rate: rate }).eq('id', id);
    return !error;
};

export const fetchFinancialReport = async (): Promise<PharmacyFinancials[]> => {
    const { data: pharmacies } = await supabase.from('pharmacies').select('*');
    if (!pharmacies) return [];

    const { data: orders } = await supabase.from('orders').select('*');
    const allOrders = orders || [];

    return pharmacies.map((p: any) => {
        const pharmOrders = allOrders.filter((o: any) => o.pharmacy_id === p.id);
        
        // CORREÇÃO CRÍTICA: Comparar com o valor do Enum (string 'Concluído') e não a chave 'COMPLETED'
        const completedOrders = pharmOrders.filter((o: any) => o.status === OrderStatus.COMPLETED);
        
        const pendingOrders = pharmOrders.filter((o: any) => 
            o.status !== OrderStatus.COMPLETED && 
            o.status !== OrderStatus.CANCELLED && 
            o.status !== OrderStatus.REJECTED
        );
        
        const totalSales = completedOrders.reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
        const commissionRate = p.commission_rate || 10;
        
        const platformFees = completedOrders.reduce((acc: number, o: any) => {
            const recordedCommission = Number(o.commission_amount);
            // Se existir comissão gravada no pedido, usa ela. Se não, calcula baseada na taxa atual.
            if (!isNaN(recordedCommission) && recordedCommission > 0) {
                return acc + recordedCommission;
            } else {
                return acc + ((Number(o.total) * commissionRate) / 100);
            }
        }, 0);

        const netEarnings = totalSales - platformFees;
        const pendingClearance = pendingOrders.reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);

        return {
            id: p.id,
            name: p.name,
            nif: p.nif,
            address: p.address,
            rating: p.rating,
            deliveryFee: p.delivery_fee,
            minTime: p.min_time,
            isAvailable: p.is_available,
            distance: 'N/A',
            status: p.status,
            ownerEmail: p.owner_email,
            commissionRate: commissionRate,
            phone: p.phone,
            stats: {
                totalSales,
                platformFees,
                netEarnings,
                pendingClearance
            }
        };
    });
};
