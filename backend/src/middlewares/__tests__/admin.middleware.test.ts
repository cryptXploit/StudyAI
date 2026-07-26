const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: jest.fn(() => ({ select: mockSelect })) })),
}));

import { requireAdmin } from '../admin.middleware';

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
}

describe('database-backed admin guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows only a profile with is_admin=true', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
    const req: any = { user: { id: 'admin-user' } };
    const res = response(); const next = jest.fn();
    await requireAdmin(req, res, next);
    expect(mockEq).toHaveBeenCalledWith('id', 'admin-user');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('denies a regular user even with a valid authenticated request', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
    const res = response();
    await requireAdmin({ user: { id: 'regular-user' } } as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'ADMIN_REQUIRED' });
  });
});
