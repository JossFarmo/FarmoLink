
import { supabase } from './supabaseClient';
import { playSound } from './soundService';

// Estrutura do Backup Completo
interface FullBackupData {
    version: string;
    timestamp: string;
    data: {
        profiles: any[];
        pharmacies: any[];
        global_products: any[];
        products: any[];
        orders: any[];
        prescriptions: any[]; // Versão nova
        prescription_requests?: any[]; // Compatibilidade retroativa
        quotes: any[];
    }
}

export interface RestoreOptions {
    users: boolean;
    pharmacies: boolean;
    globalProducts: boolean;
    inventory: boolean;
    orders: boolean;
    prescriptions: boolean;
    quotes: boolean;
}

export const generateFullSystemBackup = async (): Promise<void> => {
    try {
        console.log("Iniciando backup completo...");
        
        // 1. Fetch em paralelo de todas as tabelas críticas
        const [
            { data: profiles },
            { data: pharmacies },
            { data: global_products },
            { data: products },
            { data: orders },
            { data: prescriptions },
            { data: quotes }
        ] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('pharmacies').select('*'),
            supabase.from('global_products').select('*'),
            supabase.from('products').select('*'),
            supabase.from('orders').select('*'),
            supabase.from('prescriptions').select('*'), 
            supabase.from('prescription_quotes').select('*')
        ]);

        const backupData: FullBackupData = {
            version: "1.1", // Versão incrementada
            timestamp: new Date().toISOString(),
            data: {
                profiles: profiles || [],
                pharmacies: pharmacies || [],
                global_products: global_products || [],
                products: products || [],
                orders: orders || [],
                prescriptions: prescriptions || [],
                quotes: quotes || []
            }
        };

        // 2. Criar e baixar arquivo
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `FARMOLINK_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        playSound('save');
        return;

    } catch (error) {
        console.error("Erro no backup:", error);
        playSound('error');
        alert("Erro ao gerar backup. Verifique o console.");
    }
};

export const restoreFullSystemBackup = async (jsonData: any, options: RestoreOptions): Promise<{success: boolean, message?: string}> => {
    try {
        if (!jsonData.data) {
            return { success: false, message: "Arquivo de backup inválido (sem dados)." };
        }

        const { profiles, pharmacies, global_products, products, orders, prescriptions, prescription_requests, quotes } = jsonData.data;

        // Lógica inteligente para pegar receitas independentemente da versão do backup
        const prescriptionsToRestore = prescriptions || prescription_requests || [];

        console.log("Iniciando Restauração Seletiva...", options);

        // Função auxiliar para upsert seguro (ignora se array vazio)
        const safeUpsert = async (table: string, data: any[]) => {
            if (!data || data.length === 0) return;
            console.log(`Restaurando ${table}: ${data.length} registros...`);
            const { error } = await supabase.from(table).upsert(data);
            if (error) {
                console.error(`Erro ao restaurar ${table}:`, error);
                throw new Error(`Falha em ${table}: ${error.message}`);
            }
        };

        // Ordem de dependência correta com verificações de opção
        
        // 1. Dados Mestres e Globais
        if (options.globalProducts) await safeUpsert('global_products', global_products);
        
        // 2. Entidades Principais
        if (options.users) await safeUpsert('profiles', profiles);
        if (options.pharmacies) await safeUpsert('pharmacies', pharmacies);
        
        // 3. Inventário (Depende de Farmácias e Global Products)
        if (options.inventory) await safeUpsert('products', products);
        
        // 4. Transacional (Depende de Users, Farmácias e Produtos)
        if (options.orders) await safeUpsert('orders', orders);
        
        // 5. Receituário
        if (options.prescriptions) await safeUpsert('prescriptions', prescriptionsToRestore);
        if (options.quotes) await safeUpsert('prescription_quotes', quotes);

        return { success: true };

    } catch (error: any) {
        console.error("Erro crítico na restauração:", error);
        return { success: false, message: error.message || "Erro desconhecido." };
    }
};
