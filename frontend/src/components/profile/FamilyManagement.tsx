'use client';
import React, { useState, useEffect } from 'react';
import { Users, Link as LinkIcon, Trash2, Key, Loader2, ShieldCheck, Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function FamilyManagement() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // { role, group }
  const [inviteCode, setInviteCode] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) return;

      const apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/family` : `${apiUrlBase}/api/family`;

      const response = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const res = await response.json();
      if (res.status === 'success') {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to fetch family data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsumeInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setProcessing(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) return;

      const apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/family/consume-invite` : `${apiUrlBase}/api/family/consume-invite`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ invite_code: inviteCode })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.detail || 'Failed to join');
      
      toast.success(res.message || 'Successfully joined the family plan!');
      setInviteCode('');
      fetchFamilyData(); // Refresh
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired invite code');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateInvite = async (slotNumber: number) => {
    setProcessing(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) return;

      const apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/family/generate-invite` : `${apiUrlBase}/api/family/generate-invite`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ group_id: data.group.id, slot_number: slotNumber })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.detail || 'Failed to generate invite');
      
      // Copy to clipboard
      await navigator.clipboard.writeText(res.invite_code);
      toast.success('Invite code generated and copied to clipboard!');
      fetchFamilyData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate invite');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeMember = async (memberUserId: string) => {
    if (!confirm('Are you sure you want to revoke this member? They will lose access to the family plan.')) return;
    setProcessing(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) return;

      const apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/family/revoke-member` : `${apiUrlBase}/api/family/revoke-member`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ group_id: data.group.id, member_user_id: memberUserId })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.detail || 'Failed to revoke member');
      
      toast.success('Member revoked successfully');
      fetchFamilyData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke member');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  // --- NO PLAN VIEW ---
  if (!data || data.role === 'none') {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Family Plan</h2>
            <p className="text-sm font-medium text-slate-500">Have an invite code? Join a family group.</p>
          </div>
        </div>
        
        <form onSubmit={handleConsumeInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Enter Invite Code (e.g. FAM-XXXX...)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-500 transition-colors uppercase font-mono tracking-wider"
            />
          </div>
          <button 
            type="submit" 
            disabled={processing || !inviteCode}
            className="py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
          >
            {processing ? <Loader2 className="animate-spin" size={18} /> : 'Join Family'}
          </button>
        </form>
      </div>
    );
  }

  // --- MEMBER VIEW ---
  if (data.role === 'member') {
    const ownerName = data.group.family_groups?.profiles?.name || data.group.family_groups?.profiles?.email || 'Owner';
    const periodEnd = new Date(data.group.family_groups?.current_period_end).toLocaleDateString();

    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-8 border border-indigo-100 shadow-sm mt-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Active Family Plan</h2>
            <p className="text-sm font-medium text-slate-500">You are a member of {ownerName}'s family group.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-indigo-50 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <p className="font-black text-emerald-500">Active</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Valid Until</p>
             <p className="font-black text-slate-700">{periodEnd}</p>
          </div>
        </div>
      </div>
    );
  }

  // --- OWNER VIEW ---
  if (data.role === 'owner') {
    const group = data.group;
    const periodEnd = new Date(group.current_period_end).toLocaleDateString();
    const members = group.members || [];
    const invites = group.invites || [];

    // Map all slots
    const slotsCount = group.member_limit - 1; // 1 is the owner
    const allSlots = Array.from({ length: slotsCount }, (_, i) => i + 1);

    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
            <Crown size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-800">Family Group Owner</h2>
            <p className="text-sm font-medium text-slate-500">{group.plan_type.replace(/_/g, ' ').toUpperCase()} • Expires {periodEnd}</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Members</p>
             <p className="font-black text-slate-700 text-lg">{members.length + 1} / {group.member_limit}</p>
          </div>
        </div>

        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Manage Members & Invites</h3>
        
        <div className="space-y-4">
          {/* Owner (Self) */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">You</div>
                <div>
                   <p className="font-bold text-slate-700">You (Owner)</p>
                   <p className="text-xs text-slate-500">Active</p>
                </div>
             </div>
             <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-lg">Owner</div>
          </div>

          {/* Members / Empty Slots */}
          {allSlots.map(slotNum => {
            const inviteRecord = invites.find((inv: any) => inv.slot_number === slotNum);
            const isConsumed = inviteRecord?.status === 'consumed';
            const member = isConsumed ? members.find((m: any) => m.user_id === inviteRecord.consumed_by) : null;

            if (member) {
              return (
                <div key={slotNum} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    {member.profiles.avatar_url ? (
                      <img src={member.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover"/>
                    ) : (
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                        {member.profiles.name?.charAt(0) || 'M'}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-700">{member.profiles.name || member.profiles.email || 'Member'}</p>
                      <p className="text-xs text-emerald-500 font-bold">Active Member</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRevokeMember(member.user_id)}
                    disabled={processing}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Revoke Access"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            }

            // Empty Slot (Needs Invite generation or pending)
            return (
              <div key={slotNum} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Users size={16}/></div>
                  <div>
                    <p className="font-bold text-slate-500">Empty Slot {slotNum}</p>
                    <p className="text-xs text-slate-400">Available to share</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleGenerateInvite(slotNum)}
                  disabled={processing}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <LinkIcon size={14} /> Generate Code
                </button>
              </div>
            );
          })}

        </div>
      </div>
    );
  }

  return null;
}
