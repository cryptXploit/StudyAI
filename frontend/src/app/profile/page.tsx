'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { User, GraduationCap, MapPin, Calendar, Loader2, Save } from 'lucide-react';
import FamilyManagement from '@/components/profile/FamilyManagement';

const translations = {
  English: {
    yourProfile: "Your Profile",
    completeDetails: "Complete these details to unlock the 100 Token Bounty.",
    fullName: "Full Name",
    johnDoe: "John Doe",
    university: "University/School",
    harvard: "Harvard University",
    country: "Country",
    bangladesh: "Bangladesh",
    sessionYear: "Session / Year",
    sessionPlaceholder: "2022-2026",
    dob: "Date of Birth",
    saving: "Saving...",
    saveProfile: "Save Profile & Return",
    profileSaved: "Profile Saved Successfully!"
  },
  Bangla: {
    yourProfile: "আপনার প্রোফাইল",
    completeDetails: "১০০ টোকেন বাউন্টি আনলক করতে এই বিবরণগুলো পূরণ করুন।",
    fullName: "পুরো নাম",
    johnDoe: "জন ডো",
    university: "বিশ্ববিদ্যালয়/স্কুল",
    harvard: "হার্ভার্ড বিশ্ববিদ্যালয়",
    country: "দেশ",
    bangladesh: "বাংলাদেশ",
    sessionYear: "সেশন / বছর",
    sessionPlaceholder: "২০২২-২০২৬",
    dob: "জন্ম তারিখ",
    saving: "সংরক্ষণ করা হচ্ছে...",
    saveProfile: "প্রোফাইল সংরক্ষণ করুন এবং ফিরে যান",
    profileSaved: "প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!"
  },
  Hindi: {
    yourProfile: "आपकी प्रोफ़ाइल",
    completeDetails: "100 टोकन बाउंटी अनलॉक करने के लिए इन विवरणों को पूरा करें।",
    fullName: "पूरा नाम",
    johnDoe: "जॉन डो",
    university: "विश्वविद्यालय/स्कूल",
    harvard: "हार्वर्ड विश्वविद्यालय",
    country: "देश",
    bangladesh: "बांग्लादेश",
    sessionYear: "सत्र / वर्ष",
    sessionPlaceholder: "2022-2026",
    dob: "जन्म तिथि",
    saving: "सहेजा जा रहा है...",
    saveProfile: "प्रोफ़ाइल सहेजें और वापस जाएं",
    profileSaved: "प्रोफ़ाइल सफलतापूर्वक सहेजी गई!"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [language, setLanguage] = useState<LanguageType>('English');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', university: '', country: '', session_year: '', dob: ''
  });

  useEffect(() => {
    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as LanguageType);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 🟢 FIXED: Wait for session to be fully loaded
      if (!session?.access_token) {
        console.warn("Session not found or expired. Please log in again.");
        setLoading(false);
        return;
      }

      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/profile` : `${apiUrlBase}/api/profile`;

      const response = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Session expired. Please log out and log back in.");

        // 🟢 FIXED: Fetch the exact error message from the backend!
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.profile) {
        setFormData({
          full_name: data.profile.full_name || '',
          university: data.profile.university || '',
          country: data.profile.country || '',
          session_year: data.profile.session_year || '',
          dob: data.profile.dob || ''
        });
      }
    } catch (err: any) {
      console.error("Profile Fetch Error:", err);
      showPublicError();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 🟢 FIXED: Strict session check before saving
      if (!session?.access_token) {
        throw new Error("Authentication failed. Please log out and log back in.");
      }

      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/profile` : `${apiUrlBase}/api/profile`;

      const response = await fetch(fetchUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Session expired. Please log out and log back in.");

        // 🟢 FIXED: Fetch the exact error message from the backend!
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const t = translations[language];
        alert(t.profileSaved);
        router.push('/quests');
      } else {
        showPublicError(data);
      }
    } catch (err: any) {
      console.error(err);
      showPublicError();
    } finally {
      setSaving(false);
    }
  };

  const t = translations[language];

  if (loading) return <SecureLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48}/></div></SecureLayout>;

  return (
    <SecureLayout>
      <div className="max-w-3xl mx-auto p-6 md:p-10 mt-4 font-sans">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center"><User size={32}/></div>
            <div>
               <h1 className="text-2xl font-black text-slate-800">{t.yourProfile}</h1>
               <p className="text-sm font-medium text-slate-500">{t.completeDetails}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.fullName}</label>
              <input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-indigo-500 transition-colors font-medium text-slate-800" placeholder={t.johnDoe}/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><GraduationCap size={14}/> {t.university}</label>
                <input type="text" required value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-indigo-500 transition-colors font-medium text-slate-800" placeholder={t.harvard}/>
              </div>
              <div>
                <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><MapPin size={14}/> {t.country}</label>
                <input type="text" required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-indigo-500 transition-colors font-medium text-slate-800" placeholder={t.bangladesh}/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.sessionYear}</label>
                <input type="text" required value={formData.session_year} onChange={e => setFormData({...formData, session_year: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-indigo-500 transition-colors font-medium text-slate-800" placeholder={t.sessionPlaceholder}/>
              </div>
              <div>
                <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Calendar size={14}/> {t.dob}</label>
                <input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-indigo-500 transition-colors font-medium text-slate-800"/>
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>} {saving ? t.saving : t.saveProfile}
            </button>
          </form>
        </div>

        <FamilyManagement />
      </div>
    </SecureLayout>
  );
}
