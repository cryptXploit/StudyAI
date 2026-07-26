const mockRpc = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ rpc: mockRpc })),
}));

import { applyCreditMutation, claimBangladeshPayment } from '../creditLedger.service';

describe('central credit ledger', () => {
  beforeEach(() => mockRpc.mockReset());

  it('rejects an unstable idempotency key before any database call', async () => {
    await expect(applyCreditMutation({
      userId: 'user-1', amount: -5, reason: 'Quiz', idempotencyKey: 'short',
    })).rejects.toThrow('stable idempotency key');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('uses the atomic mutation RPC for a token deduction', async () => {
    mockRpc.mockResolvedValue({ data: 45, error: null });
    await expect(applyCreditMutation({
      userId: 'user-1', amount: -5, reason: 'Quiz', idempotencyKey: 'quiz:user-1:request-1', tier: 'Free',
    })).resolves.toBe(45);
    expect(mockRpc).toHaveBeenCalledWith('apply_credit_mutation', expect.objectContaining({
      p_user_id: 'user-1', p_amount: -5, p_idempotency_key: 'quiz:user-1:request-1',
    }));
  });

  it('surfaces an already-claimed Bangladesh transaction as a failed atomic RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'INVALID_OR_CLAIMED_TRANSACTION' } });
    await expect(claimBangladeshPayment({
      userId: 'user-1', transactionId: 'TX123', expectedAmount: 99, credits: 100,
      planType: 'student', periodEnd: '2030-01-01T00:00:00.000Z',
    })).rejects.toThrow('INVALID_OR_CLAIMED_TRANSACTION');
  });
});
