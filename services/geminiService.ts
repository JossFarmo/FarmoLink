
import { Product, GlobalProduct } from '../types';

const normalizeString = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s()]/g, "") 
        .replace(/\s+/g, " ")
        .trim();
};

export const formatProductNameForCustomer = (fullName: string): string => {
    if (!fullName || !fullName.includes(',')) return fullName;
    const parts = fullName.split(',').map(p => p.trim());
    if (parts.length < 2) return fullName;
    const nameWithDci = parts[0];
    const cleanName = nameWithDci.replace(/\s*\([^)]*\)/g, '').trim();
    const displayParts = [cleanName];
    if (parts[1]) displayParts.push(parts[1]); 
    if (parts[2]) displayParts.push(parts[2]); 
    return displayParts.join(', ');
};

// NOTE:
// The askFarmoBot logic was moved to a serverless function (`/api/genai`) to avoid
// bundling the `@google/genai` SDK into the client. Keep only client-safe helpers here.

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

export const processBulkImportForPharmacy = async (text: string, globalCatalog: GlobalProduct[]): Promise<ProcessedImportItem[]> => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
        const priceMatch = line.match(/kz\s*(\d+)/i);
        const price = priceMatch ? parseInt(priceMatch[1]) : 0;
        const cleanLine = line.replace(/kz\s*\d+/i, '').trim();
        const match = globalCatalog.find(g => normalizeString(g.name) === normalizeString(cleanLine));
        return {
            name: cleanLine,
            description: cleanLine,
            price: price,
            stock: 10,
            category: match?.category || "Outros",
            action: 'CREATE',
            matchId: match?.id,
            referencePrice: match?.referencePrice
        };
    });
};

// Fix: Adicionada a função ausente para importação do catálogo mestre (Admin) para resolver erro de importação no AdminCatalogView.tsx
export const processBulkImportForMasterData = async (text: string): Promise<ProcessedImportItem[]> => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
        const priceMatch = line.match(/kz\s*(\d+)/i);
        const price = priceMatch ? parseInt(priceMatch[1]) : 0;
        const cleanLine = line.replace(/kz\s*\d+/i, '').trim();
        return {
            name: cleanLine,
            description: cleanLine,
            price: 0,
            stock: 0,
            category: "Outros / Uso Especial",
            action: 'CREATE',
            referencePrice: price
        };
    });
};
