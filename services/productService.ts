
import { supabase } from './supabaseClient';
import { Product, GlobalProduct } from '../types';

export const fetchGlobalCatalog = async (searchTerm?: string): Promise<GlobalProduct[]> => {
    let query = supabase.from('global_products').select('*');
    if (searchTerm && searchTerm.trim() !== '') {
        query = query.ilike('name', `%${searchTerm}%`);
    }
    const { data } = await query.order('name', { ascending: true }).limit(1000);
    return (data || []).map((item:any) => ({
        id: item.id, name: item.name, description: item.description, category: item.category, 
        image: item.image, common: item.common, referencePrice: item.reference_price
    }));
}

export const addGlobalProduct = async (product: Omit<GlobalProduct, 'id'>): Promise<{success: boolean, error?: string}> => {
    const { error } = await supabase.from('global_products').insert([{
        name: product.name, 
        description: product.description, 
        category: product.category, 
        image: product.image, 
        common: product.common, 
        reference_price: product.referencePrice
    }]);
    if (error) console.error("Erro addGlobalProduct:", error);
    return { success: !error, error: error?.message };
}

export const updateGlobalProduct = async (id: string, product: Partial<GlobalProduct>): Promise<{success: boolean, error?: string}> => {
    const { error } = await supabase.from('global_products').update({
        name: product.name, 
        description: product.description, 
        category: product.category, 
        common: product.common, 
        reference_price: product.referencePrice,
        image: product.image
    }).eq('id', id);
    
    if (error) console.error("Erro updateGlobalProduct:", error);
    return { success: !error, error: error?.message };
}

export const deleteGlobalProduct = async (id: string): Promise<{success: boolean, error?: string}> => {
    if (!id) return { success: false, error: "ID inválido" };
    console.log("Tentando excluir Global Product:", id);
    const { error } = await supabase.from('global_products').delete().eq('id', id);
    if (error) {
        console.error("Erro Supabase deleteGlobalProduct:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

export const bulkDeleteGlobalProducts = async (ids: string[]): Promise<{success: boolean, error?: string}> => {
    if (!ids || ids.length === 0) return { success: false, error: "Nenhum ID fornecido" };
    const { error } = await supabase.from('global_products').delete().in('id', ids);
    if (error) {
        console.error("Erro bulkDeleteGlobalProducts:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

export const bulkDeletePharmacyProducts = async (ids: string[]): Promise<{success: boolean, error?: string}> => {
    if (!ids || ids.length === 0) return { success: false, error: "Nenhum ID fornecido" };
    console.log("Tentando excluir Pharmacy Products:", ids);
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) {
        console.error("Erro bulkDeletePharmacyProducts:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

export const fetchProducts = async (pharmacyId?: string): Promise<Product[]> => {
  let query = supabase.from('products').select('*');
  if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
  const { data } = await query;
  return (data || []).map((item: any) => ({
    id: item.id, name: item.name, description: item.description, price: Number(item.price),
    pharmacyId: item.pharmacy_id, image: item.image, requiresPrescription: item.requires_prescription, 
    stock: Number(item.stock), category: item.category || 'Outros / Uso Especial', globalProductId: item.global_product_id
  }));
};

export const addProduct = async (product: Omit<Product, 'id'>): Promise<{success: boolean, error?: string}> => {
  const { error } = await supabase.from('products').insert([{
    name: product.name, 
    description: product.description, 
    price: product.price, 
    pharmacy_id: product.pharmacyId,
    image: product.image, 
    requires_prescription: product.requiresPrescription, 
    stock: product.stock, 
    category: product.category || 'Outros / Uso Especial', 
    global_product_id: product.globalProductId || null 
  }]);
  
  if (error) console.error("Erro addProduct:", error);
  return { success: !error, error: error?.message };
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<{success: boolean, error?: string}> => {
  const { error } = await supabase.from('products').update({
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    requires_prescription: product.requiresPrescription,
    category: product.category,
    global_product_id: product.globalProductId || null 
  }).eq('id', id);

  if (error) console.error("Erro updateProduct:", error);
  return { success: !error, error: error?.message };
};

export const bulkAddGlobalProducts = async (products: Omit<GlobalProduct, 'id'>[]): Promise<boolean> => {
    const batch = products.map(p => ({
        name: p.name, description: p.description, category: p.category, 
        image: p.image, common: p.common, reference_price: p.referencePrice
    }));
    const { error } = await supabase.from('global_products').insert(batch);
    if (error) console.error("Erro bulkAddGlobalProducts:", error);
    return !error;
}

export const bulkAddPharmacyProducts = async (products: Omit<Product, 'id'>[]): Promise<boolean> => {
    const batch = products.map(p => ({
        name: p.name, 
        description: p.description, 
        price: p.price, 
        pharmacy_id: p.pharmacyId,
        image: p.image, 
        requires_prescription: p.requiresPrescription, 
        stock: p.stock, 
        category: p.category || 'Outros / Uso Especial', 
        global_product_id: p.globalProductId || null 
    }));
    const { error } = await supabase.from('products').insert(batch);
    if (error) console.error("Erro bulkAddPharmacyProducts:", error);
    return !error;
}
