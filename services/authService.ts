
import { supabase, safeQuery } from './supabaseClient';
import { User, UserRole } from '../types';
import { clearAllCache } from './dataService';

export const signUpPartner = async (name: string, email: string, password: string, phone: string = ''): Promise<{ user: User | null, error: string | null }> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: UserRole.PHARMACY, phone } }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Erro ao criar usuário no sistema.');

    const { data: newPharm, error: createPharmError } = await supabase.from('pharmacies').insert([{
        name: `Farmácia de ${name}`,
        status: 'PENDING',
        owner_email: email.toLowerCase().trim(),
        is_available: false,
        address: 'Pendente de Configuração',
        rating: 5.0,
        delivery_fee: 600, 
        min_time: '35 min', 
        commission_rate: 10
    }]).select().single();

    if (createPharmError || !newPharm) throw new Error('Erro ao criar registro da farmácia.');

    await supabase.from('profiles').upsert([{
      id: authData.user.id, name, email: email.toLowerCase().trim(), phone, role: UserRole.PHARMACY, pharmacy_id: newPharm.id 
    }]);

    return { user: { id: authData.user.id, name, email, role: UserRole.PHARMACY, pharmacyId: newPharm.id, phone }, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || 'Falha no cadastro.' };
  }
};

export const signUpUser = async (name: string, email: string, password: string, role: UserRole, phone: string = ''): Promise<{ user: User | null, error: string | null }> => {
  try {
    let finalRole = role;
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === 'jossdemo@gmail.com' || cleanEmail.startsWith('admin@')) finalRole = UserRole.ADMIN;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name, role: finalRole, phone } }
    });

    if (authError) throw authError;
    await supabase.from('profiles').upsert([{ id: authData.user!.id, name, email: cleanEmail, phone, role: finalRole, pharmacy_id: null }]);

    return { user: { id: authData.user!.id, name, email: cleanEmail, phone, role: finalRole }, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || 'Falha no cadastro.' };
  }
};

export const signInUser = async (email: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (authError) throw authError;

    const userId = authData.user!.id;

    // Reparo imediato pós-login
    if (cleanEmail === 'jossdemo@gmail.com') {
        await supabase.from('profiles').update({ role: UserRole.ADMIN, pharmacy_id: null }).eq('id', userId);
    } else {
        const { data: pharm } = await supabase.from('pharmacies').select('id').eq('owner_email', cleanEmail).maybeSingle();
        if (pharm) {
            await supabase.from('profiles').update({ role: UserRole.PHARMACY, pharmacy_id: pharm.id }).eq('id', userId);
        }
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) throw new Error("Perfil inacessível.");

    return { 
      user: { id: profile.id, name: profile.name || 'Usuário', email: profile.email, phone: profile.phone, address: profile.address, role: (profile.role as UserRole), pharmacyId: profile.pharmacy_id }, 
      error: null 
    };
  } catch (error: any) {
    return { user: null, error: error.message || 'Credenciais inválidas.' };
  }
};

export const signOutUser = async () => {
  await supabase.auth.signOut();
  clearAllCache();
  localStorage.clear();
};

export const resetPassword = async (email: string): Promise<{ success: boolean, message: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
    return { success: true, message: 'Link enviado com sucesso.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateUserPassword = async (password: string): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const authUser = session.user;
  const email = authUser.email?.toLowerCase().trim() || '';
  
  // VERIFICAÇÃO DE INTEGRIDADE ANTES DE RETORNAR
  // Busca se este email é dono de uma farmácia
  const { data: pharm } = await supabase.from('pharmacies').select('id').eq('owner_email', email).maybeSingle();
  
  let currentRole = UserRole.CUSTOMER;
  let currentPharmId = null;

  if (email === 'jossdemo@gmail.com') {
      currentRole = UserRole.ADMIN;
  } else if (pharm) {
      currentRole = UserRole.PHARMACY;
      currentPharmId = pharm.id;
  }

  // Sincroniza o perfil no banco silenciosamente se estiver diferente
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
  
  if (profile && (profile.role !== currentRole || profile.pharmacy_id !== currentPharmId)) {
      await supabase.from('profiles').update({ role: currentRole, pharmacy_id: currentPharmId }).eq('id', authUser.id);
  } else if (!profile) {
      // Se o perfil sumiu na migração, recria agora
      await supabase.from('profiles').upsert({ id: authUser.id, email, role: currentRole, pharmacy_id: currentPharmId, name: authUser.user_metadata?.name || 'Usuário' });
  }

  return { 
    id: authUser.id, 
    name: profile?.name || authUser.user_metadata?.name || 'Usuário', 
    email: email, 
    phone: profile?.phone || '', 
    address: profile?.address || '', 
    role: currentRole, 
    pharmacyId: currentPharmId as any
  };
};

export const updateUserProfile = async (userId: string, data: { name: string, phone: string, address: string }): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase.from('profiles').update({ name: data.name, phone: data.phone, address: data.address }).eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const adminUpdateUser = async (userId: string, data: { name: string, phone: string, role: UserRole }): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase.from('profiles').update({ name: data.name, phone: data.phone, role: data.role }).eq('id', userId);
    return { success: !error, error: error?.message };
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const fetchAllUsers = async (): Promise<User[]> => {
    const res = await safeQuery(async () => supabase.from('profiles').select('*'));
    return (res?.data || []).map((p: any) => ({ 
        id: p.id, name: p.name, email: p.email, phone: p.phone, 
        address: p.address, role: p.role, pharmacyId: p.pharmacy_id 
    }));
};
