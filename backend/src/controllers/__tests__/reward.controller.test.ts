const mockSingle = jest.fn();
const chain: any = {
  select: jest.fn(() => chain),
  eq: jest.fn(() => chain),
  is: jest.fn(() => chain),
  update: jest.fn(() => chain),
  single: mockSingle,
};
const mockFrom = jest.fn(() => chain);
const mockCreditMutation = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));
jest.mock('../../services/creditLedger.service', () => ({
  applyCreditMutation: mockCreditMutation,
}));

import { applyReferralHandler } from '../reward.controller';

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
}

describe('referral duplicate protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'sender-id', referral_code: 'REF123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'already referred' } });
  });

  it('does not issue a second referral reward when the atomic profile update loses the race', async () => {
    const res = response();
    await applyReferralHandler({
      user: { id: 'new-user' },
      body: { referralCode: 'ref123' },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Referral already claimed or invalid account status.' });
    expect(mockCreditMutation).not.toHaveBeenCalled();
  });

  it('rejects self-referral before changing profile data', async () => {
    mockSingle.mockReset();
    mockSingle.mockResolvedValue({ data: { id: 'same-user', referral_code: 'REF123' }, error: null });
    const res = response();
    await applyReferralHandler({
      user: { id: 'same-user' },
      body: { referralCode: 'ref123' },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCreditMutation).not.toHaveBeenCalled();
  });
});
