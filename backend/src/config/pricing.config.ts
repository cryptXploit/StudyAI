// backend/src/config/pricing.config.ts

export const FREE_TIER_TOKENS = 500;

export type PricingPlanKind = 'solo' | 'family';

export interface PricingTier {
  id: string;
  title: string;
  durationDays: number;
  // For family plans this is deliberately per member, never a shared pool.
  tokens: number;
  tokensPerMember?: number;
  planKind?: PricingPlanKind;
  // Includes the paying owner: 3 = owner + 2 invitees; 5 = owner + 4 invitees.
  memberLimit?: 1 | 3 | 5;
  bdPrice: number;
  intPrice: number;
  // Regular comparison price. The offer price above is the only price charged.
  originalBdPrice?: number;
  originalIntPrice?: number;
  popular?: boolean;
  // Add the real Paddle pri_... ID here when its matching catalog price exists.
  paddlePriceId?: string;
}

// This is the single editable source of truth for pricing, duration and credits.
// Changing an offer price here changes backend BD verification and the UI price.
export const PRICING_TIERS: Record<string, PricingTier> = {
  '7_days': {
    id: '7_days', title: '7 Days Pro', durationDays: 7, tokens: 2500,
    bdPrice: 99, originalBdPrice: 149, intPrice: 0.99, originalIntPrice: 1.49,
    paddlePriceId: 'pri_01ky2pa6pt3t4y2gk3tprwcd79',
  },
  '1_month': {
    id: '1_month', title: '1 Month Pro', durationDays: 30, tokens: 10000,
    bdPrice: 299, originalBdPrice: 399, intPrice: 3.99, originalIntPrice: 4.99,
    paddlePriceId: 'pri_01ky2vxdzsjjgqye7bzp915cg3', popular: true,
  },
  '3_months': {
    id: '3_months', title: '3 Months Pro', durationDays: 90, tokens: 30000,
    bdPrice: 799, originalBdPrice: 999, intPrice: 9.99, originalIntPrice: 12.99,
    paddlePriceId: 'pri_01ky2vz9mw6fzez11mc028e50m',
  },
  '6_months': {
    id: '6_months', title: '6 Months Pro', durationDays: 180, tokens: 60000,
    bdPrice: 1399, originalBdPrice: 1799, intPrice: 18.99, originalIntPrice: 22.99,
    paddlePriceId: 'pri_01ky2w17b6bkjc4agezvjrv8hb',
  },
  '1_year': {
    id: '1_year', title: '1 Year Pro', durationDays: 365, tokens: 120000,
    bdPrice: 2599, originalBdPrice: 3499, intPrice: 29.99, originalIntPrice: 39.99,
    paddlePriceId: 'pri_01ky2w2wbds003x1t6v5cecjj6',
  },

  // Family offer prices: each active member receives the same credits as Solo.
  // Paddle IDs are intentionally omitted until matching Paddle catalog prices exist.
  'family_3_1_month': {
    id: 'family_3_1_month', title: 'Family Pro · 3 Members · 1 Month', durationDays: 30,
    planKind: 'family', memberLimit: 3, tokens: 10000, tokensPerMember: 10000,
    bdPrice: 400, originalBdPrice: 599, intPrice: 5.99, originalIntPrice: 8.99,
  },
  'family_5_1_month': {
    id: 'family_5_1_month', title: 'Family Pro · 5 Members · 1 Month', durationDays: 30,
    planKind: 'family', memberLimit: 5, tokens: 10000, tokensPerMember: 10000,
    bdPrice: 500, originalBdPrice: 749, intPrice: 7.99, originalIntPrice: 11.99,
  },
  'family_3_3_months': {
    id: 'family_3_3_months', title: 'Family Pro · 3 Members · 3 Months', durationDays: 90,
    planKind: 'family', memberLimit: 3, tokens: 30000, tokensPerMember: 30000,
    bdPrice: 1200, originalBdPrice: 1599, intPrice: 17.99, originalIntPrice: 24.99,
  },
  'family_5_3_months': {
    id: 'family_5_3_months', title: 'Family Pro · 5 Members · 3 Months', durationDays: 90,
    planKind: 'family', memberLimit: 5, tokens: 30000, tokensPerMember: 30000,
    bdPrice: 1500, originalBdPrice: 1999, intPrice: 21.99, originalIntPrice: 29.99,
  },
  'family_3_6_months': {
    id: 'family_3_6_months', title: 'Family Pro · 3 Members · 6 Months', durationDays: 180,
    planKind: 'family', memberLimit: 3, tokens: 60000, tokensPerMember: 60000,
    bdPrice: 2000, originalBdPrice: 2699, intPrice: 29.99, originalIntPrice: 39.99,
  },
  'family_5_6_months': {
    id: 'family_5_6_months', title: 'Family Pro · 5 Members · 6 Months', durationDays: 180,
    planKind: 'family', memberLimit: 5, tokens: 60000, tokensPerMember: 60000,
    bdPrice: 2500, originalBdPrice: 3299, intPrice: 37.99, originalIntPrice: 49.99,
  },
  'family_3_1_year': {
    id: 'family_3_1_year', title: 'Family Pro · 3 Members · 1 Year', durationDays: 365,
    planKind: 'family', memberLimit: 3, tokens: 120000, tokensPerMember: 120000,
    bdPrice: 3500, originalBdPrice: 4699, intPrice: 49.99, originalIntPrice: 69.99,
  },
  'family_5_1_year': {
    id: 'family_5_1_year', title: 'Family Pro · 5 Members · 1 Year', durationDays: 365,
    planKind: 'family', memberLimit: 5, tokens: 120000, tokensPerMember: 120000,
    bdPrice: 4000, originalBdPrice: 5499, intPrice: 59.99, originalIntPrice: 79.99,
  },
};
