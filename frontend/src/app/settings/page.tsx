'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { Globe, Settings2, Save, CheckCircle2, Sun, Moon, Palette, Crown, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    globalSettings: "Global Settings",
    managePreferences: "Manage your app preferences",
    appLanguage: "Application Language",
    languageDesc: "Choose your preferred language. This will automatically translate the UI and AI responses across all features (Chat, Story, Quiz, etc.).",
    preferencesSaved: "Preferences Saved!",
    saveChanges: "Save Changes",
    colorMode: "Color Mode (Theme)",
    themeDesc: "Choose between light and dark modes for a comfortable viewing experience.",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    unlockMatrix: "Unlock the Matrix",
    upgradePro: "Upgrade to Prepia PRO",
    premiumDesc: "Get access to all premium AI micro-apps, high compute models (GPT-4 / Claude 3 Opus), and massive token limits.",
    viewPricing: "View Pricing Plans"
  },
  Bangla: {
    globalSettings: "গ্লোবাল সেটিংস",
    managePreferences: "আপনার অ্যাপ প্রেফারেন্স ম্যানেজ করুন",
    appLanguage: "অ্যাপলিকেশন ল্যাঙ্গুয়েজ",
    languageDesc: "আপনার পছন্দের ভাষা নির্বাচন করুন। এটি স্বয়ংক্রিয়ভাবে সমস্ত ফিচারে (চ্যাট, স্টোরি, কুইজ ইত্যাদি) UI এবং AI রেসপন্স ট্রান্সলেট করবে।",
    preferencesSaved: "প্রেফারেন্স সেভ হয়েছে!",
    saveChanges: "পরিবর্তন সেভ করুন",
    colorMode: "কালার মোড (থিম)",
    themeDesc: "আরামদায়ক ভিউইং এক্সপেরিয়েন্সের জন্য লাইট এবং ডার্ক মোডের মধ্যে বেছে নিন।",
    lightMode: "লাইট মোড",
    darkMode: "ডার্ক মোড",
    unlockMatrix: "ম্যাট্রিক্স আনলক করুন",
    upgradePro: "Prepia PRO তে আপগ্রেড করুন",
    premiumDesc: "সমস্ত প্রিমিয়াম AI মাইক্রো-অ্যাপ, উচ্চ কম্পিউট মডেল (GPT-4 / Claude 3 Opus) এবং বিশাল টোকেন লিমিটগুলির অ্যাক্সেস পান।",
    viewPricing: "প্রাইসিং প্ল্যান দেখুন"
  },
  Hindi: {
    globalSettings: "ग्लोबल सेटिंग्स",
    managePreferences: "अपनी ऐप प्राथमिकताएं प्रबंधित करें",
    appLanguage: "एप्लिकेशन भाषा",
    languageDesc: "अपनी पसंदीदा भाषा चुनें। यह स्वचालित रूप से सभी सुविधाओं (चैट, स्टोरी, क्विज़ आदि) में UI और AI प्रतिक्रियाओं का अनुवाद करेगा।",
    preferencesSaved: "प्राथमिकताएं सहेजी गईं!",
    saveChanges: "परिवर्तन सहेजें",
    colorMode: "रंग मोड (थीम)",
    themeDesc: "आरामदायक देखने के अनुभव के लिए लाइट और डार्क मोड के बीच चुनें।",
    lightMode: "लाइट मोड",
    darkMode: "डार्क मोड",
    unlockMatrix: "मैट्रिक्स अनलॉक करें",
    upgradePro: "Prepia PRO में अपग्रेड करें",
    premiumDesc: "सभी प्रीमियम AI माइक्रो-ऐप्स, उच्च कंप्यूट मॉडल (GPT-4 / Claude 3 Opus), और बड़े टोकन लिमिट्स तक पहुंच प्राप्त करें।",
    viewPricing: "मूल्य निर्धारण योजनाएं देखें"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function SettingsPage() {
  const supabase = createClient();
  const [language, setLanguage] = useState<LanguageType>('English');
  const [uiTheme, setUiTheme] = useState<'dark' | 'light'>('light');
  const [isSaved, setIsSaved] = useState(false);
  const router = useRouter();

  // 🟢 Dynamically select the translated texts based on the current state
  const t = translations[language] || translations['English'];

  useEffect(() => {
    // 🟢 Load global settings on mount
    const loadData = async () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
      
      const savedTheme = localStorage.getItem('Prepia_theme');
      if (savedTheme) {
         setUiTheme(savedTheme as 'dark' | 'light');
      } else {
         // Fallback to Supabase
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           const { data } = await supabase.from('profiles').select('ui_theme').eq('id', user.id).single();
           if (data && data.ui_theme) {
             setUiTheme(data.ui_theme);
             localStorage.setItem('Prepia_theme', data.ui_theme);
           }
         }
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    // 🟢 Save globally
    localStorage.setItem('Prepia_language', language);
    localStorage.setItem('Prepia_theme', uiTheme);
    
    // Save to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
       await supabase.from('profiles').update({ ui_theme: uiTheme }).eq('id', user.id);
    }
    
    // 🟢 Trigger a global event so all other pages update instantly without refresh
    window.dispatchEvent(new Event('languageChanged'));
    window.dispatchEvent(new Event('settingsChanged'));

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <SecureLayout>
      <div className="flex h-[calc(100vh-80px)] max-w-4xl mx-auto overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-700 rounded-3xl shadow-sm mt-4 p-8 flex-col">
        
        <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-800 shrink-0">
          <div className="w-12 h-12 bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center shadow-inner">
            <Settings2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-200 tracking-tight">{t.globalSettings}</h2>
            <p className="text-sm font-bold text-slate-500">{t.managePreferences}</p>
          </div>
        </div>

        <div className="max-w-xl">
          {/* Language Preference Section */}
          <div className="bg-slate-950 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} className="text-indigo-500" />
              <h3 className="text-lg font-bold text-slate-200">{t.appLanguage}</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {t.languageDesc}
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {['English', 'Bangla', 'Hindi'].map((lang) => (
                <div 
                  key={lang}
                  onClick={() => setLanguage(lang as LanguageType)}
                  className={`p-4 rounded-xl cursor-pointer border-2 text-center transition-all ${language === lang ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-slate-900 border-slate-700 hover:border-indigo-300'}`}
                >
                  <p className={`font-bold ${language === lang ? 'text-indigo-700' : 'text-slate-400'}`}>
                    {lang === 'Bangla' ? 'বাংলা' : lang === 'Hindi' ? 'हिन्दी' : 'English'}
                  </p>
                </div>
              ))}
            </div>

            {/* Theme Preference Section */}
            <div className="flex items-center gap-2 mb-4 mt-8 pt-8 border-t border-slate-700">
              <Palette size={18} className="text-pink-500" />
              <h3 className="text-lg font-bold text-slate-200">{t.colorMode}</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {t.themeDesc}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div 
                onClick={() => setUiTheme('light')}
                className={`p-4 rounded-xl cursor-pointer border-2 text-center transition-all flex flex-col items-center gap-2 ${uiTheme === 'light' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-slate-900 border-slate-700 hover:border-indigo-300'}`}
              >
                <Sun size={24} className={uiTheme === 'light' ? 'text-indigo-600' : 'text-slate-400'} />
                <p className={`font-bold ${uiTheme === 'light' ? 'text-indigo-700' : 'text-slate-400'}`}>{t.lightMode}</p>
              </div>
              <div 
                onClick={() => setUiTheme('dark')}
                className={`p-4 rounded-xl cursor-pointer border-2 text-center transition-all flex flex-col items-center gap-2 ${uiTheme === 'dark' ? 'bg-slate-900 border-indigo-500 shadow-sm' : 'bg-slate-950 border-slate-700 hover:border-slate-800'}`}
              >
                <Moon size={24} className={uiTheme === 'dark' ? 'text-indigo-400' : 'text-slate-400'} />
                <p className={`font-bold ${uiTheme === 'dark' ? 'text-indigo-300' : 'text-slate-400'}`}>{t.darkMode}</p>
              </div>
            </div>

            <button 
              onClick={handleSave}
              className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${isSaved ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
            >
              {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
              {isSaved ? t.preferencesSaved : t.saveChanges}
            </button>
          </div>

          {/* Upgrade to Pro Section */}
          <div className="mt-8 bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-[-50%] right-[-20%] w-[100%] h-[200%] bg-gradient-to-bl from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Crown size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{t.unlockMatrix}</h3>
                <p className="text-sm text-slate-400 font-medium">{t.upgradePro}</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 mb-6 relative z-10">
              {t.premiumDesc}
            </p>
            
            <button 
              onClick={() => router.push('/pricing')}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center gap-2 relative z-10"
            >
              {t.viewPricing} <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </SecureLayout>
  );
}
