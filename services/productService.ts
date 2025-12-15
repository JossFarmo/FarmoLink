
import { supabase } from './supabaseClient';
import { Product, GlobalProduct } from '../types';
import { ProcessedImportItem } from './geminiService';

export const fetchGlobalCatalog = async (searchTerm?: string): Promise<GlobalProduct[]> => {
    let query = supabase.from('global_products').select('*');
    if (searchTerm && searchTerm.trim() !== '') {
        query = query.ilike('name', `%${searchTerm}%`);
        const { data } = await query.limit(50);
        return (data || []).map((item:any) => ({
            id: item.id, name: item.name, description: item.description, category: item.category, image: item.image, common: item.common
        }));
    } else {
        const { data } = await query.limit(1000); 
        return (data || []).map((item:any) => ({
            id: item.id, name: item.name, description: item.description, category: item.category, image: item.image, common: item.common
        }));
    }
}

export const fetchFullGlobalCatalog = async (): Promise<GlobalProduct[]> => {
    const { data } = await supabase.from('global_products').select('*');
    return (data || []).map((item:any) => ({
        id: item.id, name: item.name, description: item.description, category: item.category, image: item.image, common: item.common
    }));
}

export const addGlobalProduct = async (product: Omit<GlobalProduct, 'id'>): Promise<boolean> => {
    const { error } = await supabase.from('global_products').insert([{
        name: product.name, description: product.description, category: product.category, image: product.image, common: product.common
    }]);
    return !error;
}

export const bulkUpsertGlobalProducts = async (items: ProcessedImportItem[]): Promise<boolean> => {
    try {
        const creates = items.filter(i => i.action === 'CREATE').map(i => ({
            name: i.rawName, description: i.description, category: i.category, common: true, image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png'
        }));
        if (creates.length > 0) {
            const { error } = await supabase.from('global_products').insert(creates);
            if (error) throw error;
        }
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const restoreGlobalCatalogFromBackup = async (items: GlobalProduct[]): Promise<boolean> => {
    try {
        const batchSize = 500;
        const formattedItems = items.map(i => ({
            name: i.name, description: i.description, category: i.category, image: i.image, common: i.common
        }));
        for (let i = 0; i < formattedItems.length; i += batchSize) {
            const batch = formattedItems.slice(i, i + batchSize);
            const { error } = await supabase.from('global_products').upsert(batch, { onConflict: 'name' }); 
            if (error) await supabase.from('global_products').insert(batch).select();
        }
        return true;
    } catch(e) {
        return false;
    }
}

export const clearGlobalCatalog = async (): Promise<boolean> => {
    try {
        await supabase.from('products').update({ global_product_id: null }).neq('global_product_id', null);
        const { error } = await supabase.from('global_products').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
        return !error;
    } catch(e) {
        return false;
    }
}

export const seedGlobalCatalog = async (): Promise<string> => {
    const seedData = [
        { c: "Dor, Febre e Inflamação", n: ["Paracetamol 500mg", "Paracetamol 750mg", "Ibuprofeno 400mg", "Ibuprofeno 600mg", "Diclofenac Sódico 50mg", "Aspirina 500mg", "Dipirona 500mg", "Naproxeno 500mg"] },
        { c: "Gripe, Tosse e Constipações", n: ["Xarope para Tosse Seca", "Xarope Expectorante", "Antigripal Dia", "Antigripal Noite", "Vick Vaporub"] },
        { c: "Vitaminas, Minerais e Suplementos", n: ["Complexo B", "Vitamina C 1g", "Vitamina D3 2000UI", "Sulfato Ferroso", "Multivitamínico A-Z"] },
        { c: "Antibióticos e Antimicrobianos", n: ["Amoxicilina 500mg", "Amoxicilina + Clavulanato", "Azitromicina 500mg", "Metronidazol 400mg"] },
        { c: "Antimaláricos e Doenças Tropicais", n: ["Coartem 20/120mg", "Artesunato", "Quinino Comprimidos"] },
        { c: "Saúde Digestiva (Estômago e Intestinos)", n: ["Omeprazol 20mg", "Pantoprazol 40mg", "Eno", "Loperamida (Imodium)"] }
    ];

    let count = 0;
    for (const group of seedData) {
        for (const name of group.n) {
            const { data: existing } = await supabase.from('global_products').select('id').eq('name', name).single();
            if(!existing) {
                await supabase.from('global_products').insert([{
                    name: name, description: `Produto de referência para ${group.c}`, category: group.c, common: true, image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png'
                }]);
                count++;
            }
        }
    }
    return `Catálogo semeado com ${count} novos produtos.`;
}

export const fetchProducts = async (pharmacyId?: string): Promise<Product[]> => {
  let query = supabase.from('products').select('*');
  if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
  const { data } = await query;
  return (data || []).map((item: any) => ({
    id: item.id, name: item.name, description: item.description, price: Number(item.price),
    pharmacyId: item.pharmacy_id, image: item.image, requiresPrescription: item.requires_prescription, stock: Number(item.stock),
    category: item.category || 'Outros / Uso Especial', globalProductId: item.global_product_id
  }));
};

export const addProduct = async (product: Omit<Product, 'id'>): Promise<boolean> => {
  const { error } = await supabase.from('products').insert([{
    name: product.name, description: product.description, price: product.price, pharmacy_id: product.pharmacyId,
    image: product.image, requires_prescription: product.requiresPrescription, stock: product.stock, category: product.category || 'Outros / Uso Especial',
    global_product_id: product.globalProductId
  }]);
  return !error;
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<boolean> => {
  const { error } = await supabase.from('products').update({
    name: product.name, description: product.description, price: product.price, 
    image: product.image, requires_prescription: product.requiresPrescription, stock: product.stock, category: product.category,
    global_product_id: product.globalProductId
  }).eq('id', id);
  return !error;
};

export const bulkUpsertProducts = async (pharmacyId: string, items: ProcessedImportItem[]): Promise<boolean> => {
    try {
        const updates = items.filter(i => i.action === 'UPDATE' && i.matchId).map(i => ({ id: i.matchId, price: i.price, stock: i.stock, updated_at: new Date().toISOString() }));
        const creates = items.filter(i => i.action === 'CREATE').map(i => ({
            pharmacy_id: pharmacyId, name: i.rawName, description: i.description, price: i.price, stock: i.stock,
            image: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', requires_prescription: false, category: i.category || 'Outros / Uso Especial',
            global_product_id: i.matchId && !updates.find(u => u.id === i.matchId) ? i.matchId : null
        }));

        if (updates.length > 0) { await Promise.all(updates.map(u => supabase.from('products').update({ price: u.price, stock: u.stock }).eq('id', u.id))); }
        if (creates.length > 0) { await supabase.from('products').insert(creates); }
        return true;
    } catch (e) { return false; }
}

export const deleteProduct = async (productId: string): Promise<boolean> => {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  return !error;
};

export const deleteAllProducts = async (pharmacyId: string): Promise<boolean> => {
  const { error } = await supabase.from('products').delete().eq('pharmacy_id', pharmacyId);
  return !error;
};
