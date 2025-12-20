
import { Product, PRODUCT_CATEGORIES, GlobalProduct } from '../types';

const normalizeString = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s()]/g, "") 
        .replace(/\s+/g, " ")
        .trim();
};

const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
    "Antibióticos e Antimicrobianos": ["amoxicilina", "azitromicina", "ciprofloxacina", "penicilina", "amox", "clonamox", "cefuroxima"],
    "Dor, Febre e Inflamação": ["paracetamol", "dipirona", "ibuprofeno", "aspirina", "ben-u-ron", "brufen", "panadol", "dolostop"],
    "Gripe, Tosse e Constipações": ["xarope", "tosse", "antigripal", "vick", "bisolvon", "brufen gripe"],
    "Vitaminas, Minerais e Suplementos": ["vitamina", "ferro", "calcio", "magnesio", "zinco", "omega", "multivitaminico"],
    "Diabetes e Controlo da Glicemia": ["insulina", "metformina", "diabetes", "daonil", "glifage"],
    "Pressão Arterial e Coração": ["losartana", "atenolol", "enalapril", "captopril", "pressao", "coversyl"]
};

const inferCategory = (name: string): string => {
    const normalized = normalizeString(name);
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => normalized.includes(keyword))) {
            return category;
        }
    }
    return "Outros / Uso Especial";
};

/**
 * Formata o nome industrial para uma exibição amigável ao cliente.
 * Ex: Panadol (Paracetamol), 500mg, Comprimido, 20 Unidades, GSK 
 * -> Panadol, 500mg, Comprimido, 20 Unidades
 */
export const formatProductNameForCustomer = (fullName: string): string => {
    if (!fullName || !fullName.includes(',')) return fullName;
    
    const parts = fullName.split(',').map(p => p.trim());
    if (parts.length < 2) return fullName;

    // 1. Limpar a primeira parte (Nome + DCI) removendo o que estiver entre parênteses
    const nameWithDci = parts[0];
    const cleanName = nameWithDci.replace(/\s*\([^)]*\)/g, '').trim();

    // 2. Montar as partes: Nome Limpo, Miligrama, Forma, Quantidade
    // Ignoramos a última parte (Laboratório/Lab)
    const displayParts = [cleanName];
    
    if (parts[1]) displayParts.push(parts[1]); // Miligrama/Dosagem
    if (parts[2]) displayParts.push(parts[2]); // Forma Farmacêutica
    if (parts[3]) displayParts.push(parts[3]); // Quantidade/Lâmina/Caixa

    return displayParts.join(', ');
};

/**
 * Parser Industrial para o padrão solicitado: 
 * Padrão: Nome Comercial (DCI), Dosagem, Forma, Quantidade, Fabricante/Lab
 * Exemplo: Panadol (Paracetamol), 500mg, Comprimido, 20 Unidades, GSK
 */
export const parseIndustrialString = (line: string) => {
    // Remove parênteses externos se existirem (comum em cópia de listas)
    const cleanLine = line.replace(/^\(|\)$/g, '').trim();
    const parts = cleanLine.split(',').map(p => p.trim());
    
    if (parts.length < 1) return null;

    return {
        name: parts[0] || "Produto Sem Nome",
        dosage: parts[1] || "",
        form: parts[2] || "",
        quantity: parts[3] || "",
        lab: parts[4] || "",
        fullName: cleanLine // O nome único do sistema é a linha completa formatada
    };
};

export interface ProcessedImportItem {
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    action: 'CREATE' | 'UPDATE' | 'IGNORE';
    matchId?: string;
    referencePrice?: number;
}

export const processBulkImportForMasterData = async (text: string): Promise<ProcessedImportItem[]> => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
        const parsed = parseIndustrialString(line);
        if (!parsed) return null;

        const category = inferCategory(parsed.name);

        return {
            name: parsed.fullName, // Nome completo formatado como identificador único
            description: `Lab: ${parsed.lab} | Form: ${parsed.form} | Qtd: ${parsed.quantity}`,
            price: 0,
            stock: 0,
            category: category,
            action: 'CREATE'
        };
    }).filter(item => item !== null) as ProcessedImportItem[];
};

export const processBulkImportForPharmacy = async (text: string, globalCatalog: GlobalProduct[]): Promise<ProcessedImportItem[]> => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
        // Tenta extrair preço se houver algo como "Kz 1500" no final da linha
        const priceMatch = line.match(/kz\s*(\d+)/i);
        const price = priceMatch ? parseInt(priceMatch[1]) : 0;
        const cleanLine = line.replace(/kz\s*\d+/i, '').trim();
        
        const parsed = parseIndustrialString(cleanLine);
        const name = parsed?.fullName || cleanLine;
        
        // Tenta encontrar no mestre
        const match = globalCatalog.find(g => normalizeString(g.name) === normalizeString(name));

        return {
            name: name,
            description: name,
            price: price,
            stock: 10,
            category: match?.category || inferCategory(name),
            action: 'CREATE',
            matchId: match?.id,
            referencePrice: match?.referencePrice
        };
    });
};
