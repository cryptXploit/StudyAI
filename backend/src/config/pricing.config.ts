// backend/src/config/pricing.config.ts

export const FREE_TIER_TOKENS = 500;

export interface PricingTier {
  id: string;
  title: string;
  durationDays: number;
  tokens: number;
  bdPrice: number;    // In BDT
  intPrice: number;   // In USD
  popular?: boolean;
  paddlePriceId?: string; // 👈 Paddle-এর আসল Price ID (pri_...) বসানোর জন্য
}

// Admins can change these values easily. Changes will automatically reflect in UI and Backend Logic.
export const PRICING_TIERS: Record<string, PricingTier> = {
  '7_days': {
    id: '7_days',
    title: '7 Days Pro',
    durationDays: 7,
    tokens: 2500,
    bdPrice: 99,
    intPrice: 0.99,
    paddlePriceId: 'pri_01ky2pa6pt3t4y2gk3tprwcd79'
  },
  '1_month': {
    id: '1_month',
    title: '1 Month Pro',
    durationDays: 30,
    tokens: 10000,
    bdPrice: 299,
    intPrice: 3.99,
    paddlePriceId: 'pri_01ky2vxdzsjjgqye7bzp915cg3',
    popular: true
  },
  '3_months': {
    id: '3_months',
    title: '3 Months Pro',
    durationDays: 90,
    tokens: 30000,
    bdPrice: 799,
    intPrice: 9.99,
    paddlePriceId: 'pri_01ky2vz9mw6fzez11mc028e50m',
  },
  '6_months': {
    id: '6_months',
    title: '6 Months Pro',
    durationDays: 180,
    tokens: 60000,
    bdPrice: 1399,
    intPrice: 18.99,
    paddlePriceId: 'pri_01ky2w17b6bkjc4agezvjrv8hb'
  },
  '1_year': {
    id: '1_year',
    title: '1 Year Pro',
    durationDays: 365,
    tokens: 120000,
    bdPrice: 2599,
    intPrice: 29.99,
    paddlePriceId: 'pri_01ky2w2wbds003x1t6v5cecjj6'
  }
};
