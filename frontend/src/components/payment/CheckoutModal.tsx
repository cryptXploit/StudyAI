'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Smartphone, CheckCircle, XCircle, ShieldCheck, Loader2, Info } from 'lucide-react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  selectedTier: {
    id: string;
    title: string;
    bdPrice: number;
    intPrice: number;
    originalBdPrice?: number;
    originalIntPrice?: number;
    paddlePriceId?: string;
  } | null;
  currency?: 'BDT' | 'USD';
}

export default function CheckoutModal({ isOpen, onClose, userId, selectedTier, currency }: CheckoutModalProps) {
  const [region, setRegion] = useState<'BD' | 'INT'>('INT');
  const [trxId, setTrxId] = useState('');
  const [bKashNumber, setBkashNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [isVerifying, setIsVerifying] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);

  useEffect(() => {
    if (currency) {
      setRegion(currency === 'BDT' ? 'BD' : 'INT');
    }

    // Auto-detect BD via timezone
    if (!currency && Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka') {
      setRegion('BD');
    }

    // Initialize Paddle
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (token) {
      initializePaddle({
        environment: process.env.NEXT_PUBLIC_PADDLE_ENV === 'production' ? 'production' : 'sandbox',
        token: token.replace(/['"]/g, '').trim(), // Ensure no quotes or spaces in token
      }).then(
        (paddleInstance: Paddle | undefined) => {
          if (paddleInstance) {
            setPaddle(paddleInstance);
          }
        }
      );
    }
  }, []);

  if (!isOpen || !selectedTier) return null;

  const handlePaddleCheckout = () => {
    if (!paddle) {
      toast.error('Paddle is not initialized. Please check your config.');
      return;
    }
    
    if (!selectedTier.paddlePriceId) {
      toast.error('Paddle Price ID is missing for this tier.');
      return;
    }

    paddle.Checkout.open({
      items: [
        {
          priceId: selectedTier.paddlePriceId, // Use the real paddle price ID
          quantity: 1
        }
      ],
      customData: {
        userId: userId || 'unknown_user',
        tierId: selectedTier.id
      }
    });
  };

  const handleBdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId || !bKashNumber) {
      toast.error('Please enter your mobile number and TrxID');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') 
        ? `${apiUrlBase}/payments/submit-bd-trx` 
        : `${apiUrlBase}/api/payments/submit-bd-trx`;
      const { data: { session } } = await (await import('../../lib/supabase/client')).createClient().auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in again before verifying your payment.');
      }

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trx_id: trxId,
          sender_number: bKashNumber,
          tier_id: selectedTier.id,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Verification failed');
      }

      toast.success(data.message || 'Payment submitted! Please wait for admin verification.', { duration: 8000 });
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <XCircle size={24} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{selectedTier.title}</h2>
            <p className="text-slate-400 text-xs">Unlock all premium features</p>
          </div>
        </div>

        {/* Region Toggle */}
        <div className="flex bg-slate-950 rounded-xl p-1 mb-3 border border-slate-800">
          <button 
            onClick={() => setRegion('BD')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${region === 'BD' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Bangladesh (Manual)
          </button>
          <button 
            onClick={() => setRegion('INT')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${region === 'INT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            International
          </button>
        </div>

        {/* --- BANGLADESH VIEW --- */}
        {region === 'BD' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* BD Payment Method Toggle */}
            <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
              <button 
                onClick={() => setPaymentMethod('bKash')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${paymentMethod === 'bKash' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
              >
                bKash
              </button>
              <button 
                onClick={() => setPaymentMethod('Nagad')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${paymentMethod === 'Nagad' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Nagad
              </button>
              <button 
                onClick={() => setPaymentMethod('Rocket')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${paymentMethod === 'Rocket' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Rocket
              </button>
            </div>

            <div className={`${paymentMethod === 'bKash' ? 'bg-pink-500/10 border-pink-500/20' : paymentMethod === 'Nagad' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-purple-500/10 border-purple-500/20'} border rounded-xl p-4 text-center transition-colors`}>
              <p className={`${paymentMethod === 'bKash' ? 'text-pink-400' : paymentMethod === 'Nagad' ? 'text-orange-400' : 'text-purple-400'} text-sm font-medium mb-1`}>Send exactly {selectedTier.bdPrice} BDT to</p>
              {selectedTier.originalBdPrice && (
                <p className="text-slate-400 text-xs mb-2">
                  Regularly <span className="line-through">{selectedTier.originalBdPrice} BDT</span>
                </p>
              )}
              <p className="text-2xl font-black text-white tracking-widest">
                {paymentMethod === 'Nagad' ? '01521731704' : '01639326220'}
              </p>
              <p className={`${paymentMethod === 'bKash' ? 'text-pink-400/60' : paymentMethod === 'Nagad' ? 'text-orange-400/60' : 'text-purple-400/60'} text-xs mt-1`}>
                {paymentMethod} Personal (Send Money Only)
              </p>
            </div>

            <form onSubmit={handleBdSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-2">Your {paymentMethod} Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="01XXXXXXXXX"
                    value={bKashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-2">Transaction ID (TrxID)</label>
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="e.g. 9J8A7B6C5D"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Our system will automatically verify your TrxID via SMS forwarder. Activation usually takes less than 30 seconds after submission.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isVerifying}
                className={`w-full py-3.5 text-white font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  paymentMethod === 'bKash' ? 'bg-pink-600 hover:bg-pink-700 shadow-[0_0_15px_rgba(219,39,119,0.3)]' :
                  paymentMethod === 'Nagad' ? 'bg-orange-600 hover:bg-orange-700 shadow-[0_0_15px_rgba(234,88,12,0.3)]' :
                  'bg-purple-600 hover:bg-purple-700 shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                }`}
              >
                {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                {isVerifying ? 'Verifying...' : `Verify ${selectedTier.bdPrice} BDT`}
              </button>
            </form>
          </div>
        )}

        {/* --- INTERNATIONAL VIEW --- */}
        {region === 'INT' && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300 py-6">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <CreditCard className="text-indigo-400" size={32} />
            </div>
            
            <div>
              <h3 className="text-white font-black text-xl mb-1">${selectedTier.intPrice} USD</h3>
              {selectedTier.originalIntPrice && (
                <p className="text-slate-400 text-xs mb-3">
                  Regularly <span className="line-through">${selectedTier.originalIntPrice} USD</span>
                </p>
              )}
              <p className="text-slate-400 text-sm max-w-[250px] mx-auto">
                Securely pay via Credit Card, PayPal, or Apple Pay through Paddle.
              </p>
            </div>

            <button 
              onClick={handlePaddleCheckout}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              Pay via Paddle
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
