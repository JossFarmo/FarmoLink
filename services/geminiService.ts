
import { Product, PRODUCT_CATEGORIES, GlobalProduct } from '../types';

// SERVIÇO DE PROCESSAMENTO DE TEXTO E RECONCILIAÇÃO (SEM IA)

export const analyzePrescription = async (base64Image: string): Promise<string> => {
    return "Funcionalidade de IA desativada.";
};

export const suggestMedicinesFromText = async (text: string): Promise<any> => {
    return [];
}

export const matchInventoryToPrescription = async (prescriptionText: string, inventoryNames: string[], inventoryPrices: number[]): Promise<any[]> => {
    return [];
}

// Função auxiliar para limpar strings para comparação
const normalizeString = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        // Mantemos parenteses pois ajudam a distinguir "Paracetamol" de "Paracetamol (Ben-u-ron)"
        .replace(/[^a-z0-9\s()]/g, "") 
        .replace(/\s+/g, " ") // Remove espaços extras
        .trim();
};

// Algoritmo simples de similaridade (Token overlap / Jaccard simplificado)
const calculateSimilarity = (str1: string, str2: string) => {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);

    if (s1 === s2) return 1.0; // Identico
    if (s1.includes(s2) || s2.includes(s1)) return 0.85; // Um contem o outro (forte indicio)

    const tokens1 = new Set(s1.split(" "));
    const tokens2 = new Set(s2.split(" "));
    
    // Interseção
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    
    // União
    const union = new Set([...tokens1, ...tokens2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
};

// Mapa de palavras-chave para inferir categorias (Fallback)
const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
    "Antibióticos e Antimicrobianos": ["amoxicilina", "azitromicina", "ciprofloxacina", "bactrim", "metronidazol", "ceftriaxona", "doxiciclina", "penicilina", "clavulanato"],
    "Dor, Febre e Inflamação": ["paracetamol", "dipirona", "ibuprofeno", "aspirina", "diclofenac", "nimesulida", "naproxeno", "dorflex", "ben-u-ron", "brufen"],
    "Gripe, Tosse e Constipações": ["xarope", "tosse", "expectorante", "antigripal", "vick", "benegrip", "cimegripe", "resfenol", "nasal", "descongestionante"],
    "Vitaminas, Minerais e Suplementos": ["vitamina", "complexo b", "ferro", "calcio", "magnesio", "zinco", "omega", "suplemento", "polivitaminico", "lavitan"],
    "Antimaláricos e Doenças Tropicais": ["coartem", "artesunato", "quinino", "primaquina", "artequin", "malaria"],
    "Saúde Digestiva (Estômago e Intestinos)": ["omeprazol", "pantoprazol", "antiacido", "eno", "sonrisal", "simeticona", "loperamida", "probiotico", "lactobacilos"],
    "Diabetes e Controlo da Glicemia": ["insulina", "metformina", "gliclazida", "glifage", "accu-chek", "tiras", "lancetas", "diabetes"],
    "Pressão Arterial e Coração": ["losartana", "atenolol", "enalapril", "captopril", "anlodipina", "furosemida", "pressao", "hipertensao"],
    "Saúde Feminina": ["anticoncepcional", "pilula", "ciclo 21", "microvlar", "intimo", "candidiase", "clotrimazol"],
    "Saúde Masculina": ["tadalafila", "sildenafila", "viagra", "cialis", "azulzinho", "prostata"],
    "Primeiros Socorros e Emergência": ["alcool", "gaze", "esparadrapo", "curativo", "algodao", "agua oxigenada", "povidona", "iodo"],
    "Dermatologia e Cuidados com a Pele": ["creme", "pomada", "gel", "hidratante", "protetor", "solar", "acne", "micose", "cetoconazol"],
    "Higiene e Cuidados Pessoais": ["sabonete", "pasta", "escova", "fralda", "lenco", "papel"],
    "Testes Rápidos e Diagnóstico": ["teste", "gravidez", "hiv", "covid", "malaria", "termometro"]
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

// Estrutura do item processado
export interface ProcessedImportItem {
    rawName: string;
    description: string;
    price: number;
    stock: number;
    category: string; // Adicionado campo Categoria
    action: 'CREATE' | 'UPDATE' | 'IGNORE';
    matchId?: string; 
    matchName?: string; 
    similarity?: number;
}

// Helper para encontrar o melhor match em uma lista
const findBestMatch = (name: string, list: { id: string, name: string }[]) => {
    let best: any = null;
    let highestSim = 0;
    const normName = normalizeString(name);

    for (const item of list) {
        const sim = calculateSimilarity(name, item.name);
        
        // Match exato normalizado
        if (normalizeString(item.name) === normName) {
            return { item, similarity: 1.0 };
        }

        if (sim > highestSim) {
            highestSim = sim;
            best = item;
        }
    }
    return { item: best, similarity: highestSim };
}

// 1. Faz o Parse do texto
// 2. Compara com o Catálogo Global (para padronizar nome e categoria)
// 3. Compara com os produtos existentes da farmácia (para atualizar estoque/preço)
export const processBulkImportWithMatching = async (text: string, currentProducts: Product[], globalCatalog: GlobalProduct[] = []): Promise<ProcessedImportItem[]> => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    const results: ProcessedImportItem[] = lines.map(line => {
        // Limpeza básica e extração
        const cleanLine = line.replace(/kz|kwanza|aoa|\$|un|cx/gi, '').trim();
        let parts = cleanLine.split(/[-|;]+/).map(p => p.trim());
        if (parts.length < 2) parts = cleanLine.split(/[\t,]+/).map(p => p.trim()); 

        let name = parts[0];
        let price = 0;
        let stock = 0;
        let desc = "";

        // Procura numeros nas partes restantes
        const numberParts = parts.filter(p => !isNaN(parseFloat(p.replace(',', '.'))));
        const textParts = parts.filter(p => isNaN(parseFloat(p.replace(',', '.'))));

        if (numberParts.length > 0) {
            const n1 = parseFloat(numberParts[0].replace(',', '.'));
            const n2 = numberParts.length > 1 ? parseFloat(numberParts[1].replace(',', '.')) : 0;

            if (parts.length >= 3 && !isNaN(parseFloat(parts[1])) && !isNaN(parseFloat(parts[2]))) {
                 stock = parseFloat(parts[1]);
                 price = parseFloat(parts[2]);
            } else {
                 if (n1 > 500) { price = n1; stock = n2 || 10; } 
                 else { stock = n1; price = n2 || 0; }
            }
        }
        
        if (textParts.length > 1) {
            desc = textParts[1];
        }

        // --- 1. MATCHING COM CATÁLOGO GLOBAL (PRIORITÁRIO) ---
        let finalName = name;
        let finalCategory = "Outros / Uso Especial";
        let globalId = undefined;

        const globalMatch = findBestMatch(name, globalCatalog);
        const GLOBAL_THRESHOLD = 0.8;

        if (globalMatch.item && globalMatch.similarity >= GLOBAL_THRESHOLD) {
            finalName = globalMatch.item.name; // Usa o nome padronizado do mestre
            finalCategory = globalMatch.item.category; // Usa a categoria correta do mestre
            globalId = globalMatch.item.id;
        } else {
             finalCategory = inferCategory(name); // Fallback
        }

        // --- 2. MATCHING COM ESTOQUE LOCAL (FARMÁCIA) ---
        // Aqui comparamos usando o nome original OU o nome padronizado
        const localMatchByName = findBestMatch(name, currentProducts);
        const localMatchByStandard = findBestMatch(finalName, currentProducts);
        
        let bestLocalMatch = localMatchByName.similarity > localMatchByStandard.similarity ? localMatchByName : localMatchByStandard;
        
        const LOCAL_THRESHOLD = 0.65; 
        let action: 'CREATE' | 'UPDATE' | 'IGNORE' = 'CREATE';
        
        // Se já existe no estoque da farmácia (por ID global ou nome similar)
        const matchByGlobalId = globalId ? currentProducts.find(p => p.globalProductId === globalId) : null;
        
        let existingProd = matchByGlobalId || (bestLocalMatch.similarity >= LOCAL_THRESHOLD ? bestLocalMatch.item : null);

        if (existingProd) {
            // Se o produto já existe, mantemos a categoria que ele já tem cadastrado na farmácia (a menos que seja update forçado)
            finalCategory = (existingProd as Product).category || finalCategory; 

            if ((existingProd as Product).price !== price || (existingProd as Product).stock !== stock) {
                action = 'UPDATE';
            } else {
                action = 'IGNORE'; 
            }
        }

        return {
            rawName: finalName, // Nome padronizado se encontrado no mestre
            description: desc || finalName,
            price: price || 0,
            stock: stock || 0,
            category: finalCategory,
            action: action,
            matchId: existingProd?.id || globalId, // Se for CREATE e tiver globalId, passamos ele para vincular
            matchName: existingProd?.name,
            similarity: existingProd ? 1.0 : 0
        };
    });

    return results;
}

// Processador Exclusivo para o Admin (Master Data)
export const processBulkImportForMasterData = async (text: string, currentGlobalCatalog: GlobalProduct[]): Promise<ProcessedImportItem[]> => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    const results: ProcessedImportItem[] = lines.map(line => {
        // Tenta extrair apenas o nome, ignorando preços se houver
        const cleanLine = line.replace(/kz|kwanza|aoa|\$|un|cx/gi, '').trim();
        let parts = cleanLine.split(/[-|;]+/).map(p => p.trim());
        if (parts.length < 2) parts = cleanLine.split(/[\t,]+/).map(p => p.trim()); 

        let name = parts[0];
        
        // Matching interno para evitar duplicatas no catálogo global
        const match = findBestMatch(name, currentGlobalCatalog);
        
        let action: 'CREATE' | 'UPDATE' | 'IGNORE' = 'CREATE';
        if (match.item && match.similarity > 0.85) {
            action = 'IGNORE'; // Já existe no mestre
        }

        const category = match.item ? match.item.category : inferCategory(name);

        return {
            rawName: match.item ? match.item.name : name, // Normaliza capitulação se parecido
            description: `Produto de referência para ${category}`,
            price: 0,
            stock: 0,
            category: category,
            action: action,
            matchId: match.item?.id,
            matchName: match.item?.name,
            similarity: match.similarity
        };
    });

    return results;
}

export const parseBulkProducts = async (text: string): Promise<any[]> => {
    const res = await processBulkImportWithMatching(text, [], []);
    return res.map(r => ({
        name: r.rawName,
        description: r.description,
        price: r.price,
        stock: r.stock,
        category: r.category,
        requiresPrescription: false
    }));
}
