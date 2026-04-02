export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  highlight?: boolean;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
  products: Product[];
}

export interface DeliveryTier {
  maxKm: number;
  fee: number;
}

export interface Menu {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  primaryColor: string;
  categories: Category[];
  whatsappNumber: string;
  whatsappMessage: string;
  deliveryFeeCity?: number;
  deliveryFeeSitio?: number;
  description?: string;
  businessType?: string;
  address?: string;
  addressCep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  latitude?: number;
  longitude?: number;
  deliveryTiers?: DeliveryTier[];
  instagram?: string;
  phone?: string;
  estimatedDelivery?: string;
  minimumOrder?: number;
  paymentMethods?: string[];
  acceptsPickup?: boolean;
  isActive?: boolean;
  businessHours?: Record<string, { open: string; close: string; enabled: boolean }>;
  createdAt: string;
  updatedAt?: string;
}

export type PlanType = "basic" | "pro";
export type PlanInterval = "monthly" | "quarterly" | "annual";

export interface UserPlan {
  type: PlanType;
  interval?: PlanInterval;
  expiresAt?: string;
  startedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  plan: UserPlan;
  createdAt?: string;
}

export const PLAN_LIMITS = {
  basic: 8,
  pro: Infinity,
} as const;

export const PLAN_PRICES: Record<PlanInterval, number> = {
  monthly: 97,
  quarterly: 247,
  annual: 697,
};

export const PLAN_LABELS: Record<PlanInterval, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};
