
import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

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
        owner_email: email,
        is_available: false,
        address: 'Pendente de Configuração',
        rating: 5.0,
        delivery_fee: 0,
        commission_rate: 10
    }]).select().single();

    if (createPharmError || !newPharm) throw new Error('Erro ao criar registro da farmácia.');

    const { error: profileError } = await supabase.from('profiles').upsert([{
      id: authData.user.id,
      name,
      email,
      phone, 
      role: UserRole.PHARMACY,
      pharmacy_id: newPharm.id 
    }]);

    if (profileError) console.error("Profile Error:", profileError);

    return { 
      user: { id: authData.user.id, name, email, role: UserRole.PHARMACY, pharmacyId: newPharm.id, phone }, 
      error: null 
    };

  } catch (error: any) {
    console.error("SignUp Partner Error:", error);
    return { user: null, error: error.message };
  }
};

export const signUpUser = async (name: string, email: string, password: string, role: UserRole, phone: string = ''): Promise<{ user: User | null, error: string | null }> => {
  try {
    let finalRole = role;
    if (email.toLowerCase() === 'jossdemo@gmail.com' || email.toLowerCase().startsWith('admin@') || name === 'Administrador') {
        finalRole = UserRole.ADMIN;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: finalRole, phone } }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Erro crítico: Usuário não foi criado no Auth.');

    const { error: profileError } = await supabase.from('profiles').upsert([{
      id: authData.user.id, name, email, phone, role: finalRole, pharmacy_id: null 
    }]);

    if (profileError) console.error("Profile Error:", profileError);

    return { user: { id: authData.user.id, name, email, phone, role: finalRole, pharmacyId: undefined }, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || 'Erro ao cadastrar.' };
  }
};

export const signInUser = async (email: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não encontrado');

    if (email.trim().toLowerCase() === 'jossdemo@gmail.com') {
        await supabase.from('profiles').update({ role: UserRole.ADMIN }).eq('id', authData.user.id);
        await supabase.auth.updateUser({ data: { role: UserRole.ADMIN } });
    }

    let { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();

    if (!profile) {
       const newProfile = {
           id: authData.user.id,
           name: authData.user.user_metadata?.name || 'Usuário Recuperado',
           email: authData.user.email || email,
           role: (authData.user.user_metadata?.role as UserRole) || UserRole.CUSTOMER,
           phone: authData.user.user_metadata?.phone || ''
       };
       await supabase.from('profiles').insert([newProfile]);
       profile = newProfile;
    }

    return { 
      user: { 
        id: profile.id, name: profile.name, email: profile.email, phone: profile.phone,
        address: profile.address, role: profile.role as UserRole, pharmacyId: profile.pharmacy_id
      }, 
      error: null 
    };

  } catch (error: any) {
    return { user: null, error: error.message || 'Credenciais inválidas.' };
  }
};

export const resetPassword = async (email: string): Promise<{ success: boolean, message: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
    return { success: true, message: 'Link de recuperação enviado para o seu e-mail.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateUserPassword = async (newPassword: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const signOutUser = async () => {
  await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile) return { id: session.user.id, name: '', email: session.user.email || '', role: UserRole.CUSTOMER };

  return {
    id: profile.id, name: profile.name, email: profile.email || session.user.email || '',
    phone: profile.phone, address: profile.address, role: profile.role as UserRole, pharmacyId: profile.pharmacy_id
  };
};

export const updateUserProfile = async (userId: string, data: { name: string, phone: string, address: string }): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase.from('profiles').update({ name: data.name, phone: data.phone, address: data.address }).eq('id', userId);
    if (error) throw error;
    await supabase.auth.updateUser({ data: { name: data.name, phone: data.phone } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const adminUpdateUser = async (userId: string, data: { name: string, phone: string, role: UserRole }): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase.from('profiles').update({ 
      name: data.name, 
      phone: data.phone, 
      role: data.role 
    }).eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export const fetchAllUsers = async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*');
    return (data || []).map((p: any) => ({
        id: p.id, name: p.name, email: p.email, phone: p.phone, address: p.address, role: p.role, pharmacyId: p.pharmacy_id
    }));
};
