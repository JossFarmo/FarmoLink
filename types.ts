
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PHARMACY = 'PHARMACY',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string; 
  address?: string; 
  role: UserRole;
  pharmacyId?: string;
  status?: 'ACTIVE' | 'BLOCKED';
  createdAt?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  nif?: string;
  address: string;
  rating: number;
  deliveryFee: number;
  minTime: string;
  isAvailable: boolean;
  status: string;
  ownerEmail: string;
  commissionRate?: number;
  phone?: string;
  distance?: string;
}

// Added PharmacyInput for settings and management
export interface PharmacyInput {
  name: string;
  nif: string;
  address: string;
  deliveryFee: number;
  minTime: string;
  rating: number;
  phone: string;
}

// Added PharmacyFinancials for accounting views
export interface PharmacyFinancials {
  id: string;
  name: string;
  commissionRate: number;
  stats: {
    totalSales: number;
    platformFees: number;
    netEarnings: number;
    pendingClearance: number;
  }
}

export interface GlobalProduct {
    id: string;
    name: string;
    description: string;
    category: string;
    image: string;
    common: boolean; 
    referencePrice?: number; // Preço base para governança
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pharmacyId: string;
  image: string;
  requiresPrescription: boolean;
  stock: number;
  category?: string; 
  globalProductId?: string; 
}

export const PRODUCT_CATEGORIES = [
    "Alergias e Reações Alérgicas",
    "Antibióticos e Antimicrobianos",
    "Antimaláricos e Doenças Tropicais",
    "Antiparasitários e Vermífugos",
    "Dermatologia e Cuidados com a Pele",
    "Diabetes e Controlo da Glicemia",
    "Dor, Febre e Inflamação",
    "Gravidez e Fertilidade",
    "Gripe, Tosse e Constipações",
    "Higiene e Cuidados Pessoais",
    "Hormonas e Endocrinologia",
    "Material Médico e Hospitalar",
    "Oftalmologia (Olhos)",
    "Oncologia e Tratamentos Especiais",
    "Otorrinolaringologia (Ouvidos/Nariz)",
    "Pressão Arterial e Coração",
    "Primeiros Socorros e Emergência",
    "Produtos Naturais e Fitoterápicos",
    "Saúde Digestiva (Estômago e Intestinos)",
    "Saúde Feminina",
    "Saúde Infantil e Pediátrica",
    "Saúde Masculina",
    "Saúde Mental e Neurologia",
    "Saúde Respiratória",
    "Testes Rápidos e Diagnóstico",
    "Uso Veterinário",
    "Vacinas e Imunização",
    "Vitaminas, Minerais e Suplementos",
    "Outros / Uso Especial"
];

export interface CartItem extends Product {
  quantity: number;
}

export enum OrderStatus {
  PENDING = 'Pendente',
  CONFIRMED = 'Confirmado',
  PREPARING = 'Em Preparação',
  OUT_FOR_DELIVERY = 'Saiu para Entrega',
  READY_FOR_PICKUP = 'Pronto para Retirada',
  COMPLETED = 'Concluído',
  CANCELLED = 'Cancelado pelo Cliente',
  REJECTED = 'Cancelado pela Farmácia'
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string; 
  items: CartItem[];
  total: number;
  status: OrderStatus;
  date: string;
  type: 'DELIVERY' | 'PICKUP';
  pharmacyId: string;
  address?: string;
  commissionAmount?: number;
}

export interface QuotedItem {
  name: string;
  quantity: number;
  price: number;
  available: boolean;
}

export interface PrescriptionQuote {
  id: string;
  prescriptionId: string;
  pharmacyId: string;
  pharmacyName: string;
  items: QuotedItem[];
  totalPrice: number;
  deliveryFee: number;
  status: 'RESPONDED' | 'REJECTED' | 'ACCEPTED';
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface PrescriptionRequest {
  id: string;
  customerId: string;
  imageUrl: string;
  date: string;
  status: string;
  targetPharmacies: string[]; 
  notes?: string;
  quotes?: PrescriptionQuote[]; 
}

export interface DashboardStats {
  totalOrders: number;
  revenue: number;
  pendingOrders: number;
  productsCount: number;
}

// Added Notification for system alerts
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  date: string;
  link?: string;
}

// Added CarouselSlide for landing page management
export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  order: number;
}

// Added Partner for brand logos display
export interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  active: boolean;
}
