import { Pharmacy, Product, Order, PrescriptionRequest } from './types';

// DADOS MOCKADOS REMOVIDOS
// O aplicativo agora é 100% dependente da conexão com o Supabase.
// Se não houver internet, o App.tsx exibirá uma tela de erro.

export const MOCK_PHARMACIES: Pharmacy[] = [];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_ORDERS: Order[] = [];
export const INITIAL_PRESCRIPTIONS: PrescriptionRequest[] = [];