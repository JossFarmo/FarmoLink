
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
    return { user: null, error: error.message };
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
    return { user: null, error: error.message };
  }
};

export const signInUser = async (email: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (authError) throw authError;

    const userId = authData.user!.id;

    // --- LÓGICA DE AUTO-RECUPERAÇÃO DE CARGOS ---
    if (cleanEmail === 'jossdemo@gmail.com') {
        await supabase.from('profiles').upsert({
            id: userId,
            email: cleanEmail,
            name: 'Administrador FarmoLink',
            role: UserRole.ADMIN
        });
    } else {
        const { data: pharm } = await supabase
            .from('pharmacies')
            .select('id, name')
            .eq('owner_email', cleanEmail)
            .maybeSingle();

        if (pharm) {
            await supabase.from('profiles').upsert({
                id: userId,
                email: cleanEmail,
                role: UserRole.PHARMACY,
                pharmacy_id: pharm.id
            });
        }
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) throw new Error("Perfil não pôde ser recuperado ou criado.");

    return { 
      user: { 
        id: profile.id, 
        name: profile.name || 'Usuário', 
        email: profile.email, 
        phone: profile.phone, 
        address: profile.address, 
        role: (profile.role as UserRole) || UserRole.CUSTOMER, 
        pharmacyId: profile.pharmacy_id 
      }, 
      error: null 
    };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

/**
 * ENCERRAMENTO DE SESSÃO SEGURO (SOLUÇÃO NUCLEAR)
 */
export const signOutUser = async () => {
  // 1. Deslogar do Supabase (Servidor)
  await supabase.auth.signOut();
  
  // 2. Limpar Cache de Dados (Memória React)
  clearAllCache();
  
  // 3. Limpar Absolutamente Tudo do Navegador para evitar "fantasmas" de dados
  localStorage.clear();
  sessionStorage.clear();
  
  console.log("🔒 Logout Seguro: Cache, Local e Session Storages limpos.");
};

export const getCurrentUser = async (): Promise<User | null> => {
  const session = await safeQuery(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
  });
  if (!session?.user) return null;

  const email = session.user.email?.toLowerCase().trim() || '';
  let { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();

  if (!profile) {
      if (email === 'jossdemo@gmail.com') {
          await supabase.from('profiles').insert({ id: session.user.id, email, name: 'Admin', role: UserRole.ADMIN });
      } else {
          const { data: pharm } = await supabase.from('pharmacies').select('id').eq('owner_email', email).maybeSingle();
          if (pharm) {
              await supabase.from('profiles').insert({ id: session.user.id, email, role: UserRole.PHARMACY, pharmacy_id: pharm.id });
          } else {
              await supabase.from('profiles').insert({ id: session.user.id, email, role: UserRole.CUSTOMER });
          }
      }
      const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      profile = newProfile;
  }

  if (!profile) return null;

  return { 
    id: profile.id, 
    name: profile.name || '', 
    email: profile.email, 
    phone: profile.phone, 
    address: profile.address, 
    role: profile.role as UserRole, 
    pharmacyId: profile.pharmacy_id 
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
    const data = await safeQuery(async () => {
        const { data } = await supabase.from('profiles').select('*');
        return data;
    });
    return (data || []).map((p: any) => ({ id: p.id, name: p.name, email: p.email, phone: p.phone, address: p.address, role: p.role, pharmacyId: p.pharmacy_id }));
};

export const resetCustomerData = async (userId: string, customerName: string): Promise<boolean> => {
    try {
        await supabase.from('prescriptions').delete().eq('customer_id', userId);
        await supabase.from('orders').delete().eq('customer_name', customerName);
        return true;
    } catch (e) { return false; }
};

export const resetPassword = async (email: string): Promise<{ success: boolean, message: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), { redirectTo: window.location.origin });
    if (error) throw error;
    return { success: true, message: 'Link enviado!' };
  } catch (error: any) { return { success: false, message: error.message }; }
};

export const updateUserPassword = async (newPassword: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { success: !error, error: error?.message };
    } catch (error: any) { return { success: false, error: error.message }; }
};
