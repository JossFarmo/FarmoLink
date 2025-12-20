
import { supabase } from './supabaseClient';
import { Pharmacy, PharmacyInput, PharmacyFinancials, User, OrderStatus } from '../types';

export const recoverPharmacyLink = async (user: User): Promise<string | null> => {
    try {
        console.log("Iniciando recuperação de vínculo para:", user.email);
        
        // 1. Verifica se já existe uma farmácia com este email de dono
        const { data: existing } = await supabase
            .from('pharmacies')
            .select('id')
            .eq('owner_email', user.email)
            .maybeSingle();
            
        let pharmId = existing?.id;

        // 2. Se não existir na tabela 'pharmacies', cria agora
        if (!pharmId) {
             const { data: newPharm, error: createError } = await supabase.from('pharmacies').insert([{
                name: `Farmácia de ${user.name}`,
                status: 'PENDING',
                owner_email: user.email,
                is_available: false,
                address: 'Pendente de Configuração',
                rating: 5.0,
                delivery_fee: 600,
                min_time: '35 min',
                commission_rate: 10
            }]).select().single();
            
            if (createError) throw createError;
            pharmId = newPharm?.id;
        }

        // 3. Atualiza o perfil do usuário para apontar para este ID (mesmo que ele já tivesse um ID antigo/inválido)
        if (pharmId) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ pharmacy_id: pharmId })
                .eq('id', user.id);
                
            if (updateError) throw updateError;
            return pharmId;
        }
        
        return null;
    } catch (e) { 
        console.error("Erro crítico ao recuperar vínculo:", e);
        return null; 
    }
}

export const fetchPharmacies = async (isAdmin: boolean = false): Promise<Pharmacy[]> => {
  let query = supabase.from('pharmacies').select('*');
  if (!isAdmin) query = query.eq('status', 'APPROVED');
  const { data } = await query;
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    nif: p.nif,
    address: p.address || 'Pendente',
    rating: p.rating,
    deliveryFee: p.delivery_fee,
    minTime: p.min_time,
    isAvailable: p.is_available,
    status: p.status,
    ownerEmail: p.owner_email,
    commissionRate: p.commission_rate,
    phone: p.phone,
    distance: 'N/A'
  }));
};

export const fetchPharmacyById = async (id: string): Promise<Pharmacy | null> => {
  const { data, error } = await supabase.from('pharmacies').select('*').eq('id', id).single();
  if (error || !data) return null;
  return {
    id: data.id, name: data.name, nif: data.nif, address: data.address || 'Pendente',
    rating: data.rating, deliveryFee: data.delivery_fee, minTime: data.min_time,
    isAvailable: data.is_available, status: data.status, ownerEmail: data.owner_email,
    commissionRate: data.commission_rate, phone: data.phone, distance: 'N/A'
  };
};

export const updatePharmacyDetails = async (id: string, input: PharmacyInput): Promise<boolean> => {
  const { error } = await supabase.from('pharmacies').update({
    name: input.name, nif: input.nif, address: input.address,
    delivery_fee: input.deliveryFee, min_time: input.minTime, phone: input.phone
  }).eq('id', id);
  return !error;
};

export const togglePharmacyAvailability = async (id: string, isAvailable: boolean): Promise<boolean> => {
  const { error = null } = await supabase.from('pharmacies').update({ is_available: isAvailable }).eq('id', id);
  return !error;
};

export const approvePharmacy = async (id: string): Promise<{success: boolean, error?: string}> => {
    try {
        const { error } = await supabase
            .from('pharmacies')
            .update({ status: 'APPROVED' })
            .eq('id', id);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro de conexão" };
    }
};

export const deletePharmacy = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('pharmacies').delete().eq('id', id);
    return !error;
};

export const resetPharmacyData = async (pharmacyId: string): Promise<boolean> => {
    try {
        // 1. Volta para PENDING (precisará de aprovação do Admin)
        // 2. Desativa visibilidade
        // 3. Limpa produtos
        await supabase.from('pharmacies').update({ status: 'PENDING', is_available: false }).eq('id', pharmacyId);
        await supabase.from('products').delete().eq('pharmacy_id', pharmacyId);
        return true;
    } catch (e) {
        return false;
    }
};

export const getAdminStats = async () => {
    const { count: u } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: p } = await supabase.from('pharmacies').select('*', { count: 'exact', head: true });
    
    const today = new Date().toISOString().split('T')[0];
    const { data: ordersToday } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', today);

    const totalRevenue = (ordersToday || []).reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    
    return { 
        users: u || 0, 
        pharmacies: p || 0, 
        ordersToday: ordersToday?.length || 0, 
        totalRevenue: totalRevenue 
    };
};

export const updatePharmacyCommission = async (id: string, rate: number): Promise<boolean> => {
    const { error } = await supabase.from('pharmacies').update({ commission_rate: rate }).eq('id', id);
    return !error;
};

export const fetchFinancialReport = async (): Promise<PharmacyFinancials[]> => {
    try {
        const { data: pharmacies } = await supabase.from('pharmacies').select('*');
        if (!pharmacies) return [];
        const { data: orders } = await supabase.from('orders').select('*');
        const allOrders = orders || [];

        return pharmacies.map((p: any) => {
            const pharmOrders = allOrders.filter(o => o.pharmacy_id === p.id);
            const completedOrders = pharmOrders.filter(o => o.status === 'Concluído');
            const pendingOrders = pharmOrders.filter(o => o.status !== 'Concluído' && o.status !== 'Cancelado');
            const totalSales = completedOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
            const platformFees = completedOrders.reduce((acc, o) => {
                if (o.commission_amount !== undefined && o.commission_amount !== null) return acc + Number(o.commission_amount);
                return acc + (Number(o.total) * (p.commission_rate || 10) / 100);
            }, 0);
            const pendingValue = pendingOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

            return {
                id: p.id,
                name: p.name,
                commissionRate: p.commission_rate || 10,
                stats: {
                    totalSales: totalSales,
                    platformFees: platformFees,
                    netEarnings: totalSales - platformFees,
                    pendingClearance: pendingValue
                }
            };
        });
    } catch (e) {
        console.error("Erro ao gerar relatório financeiro:", e);
        return [];
    }
};
