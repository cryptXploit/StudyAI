const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));
jest.mock('../../services/retrieval.service', () => ({ RetrievalService: {} }));
jest.mock('../../ai/ModelRouter', () => ({ ModelRouter: jest.fn() }));
jest.mock('../../services/creditLedger.service', () => ({ applyCreditMutation: jest.fn() }));

import { updateHistoryHandler } from '../presentation.controller';

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
}

describe('presentation editor persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates only the authenticated user\'s selected deck', async () => {
    const query = {
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'deck-1' }, error: null }),
    };
    const update = jest.fn(() => query);
    mockFrom.mockReturnValue({ update });
    const res = response();

    await updateHistoryHandler({
      user: { id: 'user-1' },
      params: { id: 'deck-1' },
      body: { slidesData: { templateId: 'orbit', slides: [{ title: 'A', points: ['B'], speakerNotes: 'C' }] } },
    } as any, res);

    expect(mockFrom).toHaveBeenCalledWith('saved_presentations');
    expect(update).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('id', 'deck-1');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('rejects an invalid editable payload before it reaches the database', async () => {
    const res = response();
    await updateHistoryHandler({ user: { id: 'user-1' }, params: { id: 'deck-1' }, body: { slidesData: {} } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
