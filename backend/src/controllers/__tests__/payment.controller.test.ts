const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockClaim = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));
jest.mock('../../services/creditLedger.service', () => ({
  claimBangladeshPayment: mockClaim,
}));

import { smsWebhookHandler, verifyBdPaymentHandler } from '../payment.controller';

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
}

describe('payment replay protection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a duplicate provider notification without granting credits', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505' } });
    const res = response();
    await smsWebhookHandler({
      headers: { 'x-sms-secret': 'test-sms-secret' },
      body: { message: 'Tk 99 from 01700000000 TrxID ABC123' },
    } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('returns a safe client error when the atomic claim rejects a replay', async () => {
    mockClaim.mockRejectedValue(new Error('Bangladesh payment verification failed: INVALID_OR_CLAIMED_TRANSACTION'));
    const res = response();
    await verifyBdPaymentHandler({
      user: { id: 'user-1' }, body: { trx_id: 'ABC123', tier_id: 'student' },
    } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
