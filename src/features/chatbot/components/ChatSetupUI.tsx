import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { secureSet } from '../../../core/secureStore';
import { db as DB } from '@/core/db/core';
import { toast } from '../../../toast';
import { 
  hasGeminiKey, hasGroqKey, hasCustomKey, hasPuterKey, 
  saveGroqKey, savePuterKey,
  removeGeminiKey, removeGroqKey, removeCustomKey, removePuterKey
} from '../../../core/gemini';

interface ChatSetupUIProps {
  onComplete: () => void;
  onCancel: () => void;
  isInitialSetup?: boolean;
}

export function ChatSetupUI({ onComplete, onCancel, isInitialSetup = false }: ChatSetupUIProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState({ gemini: false, groq: false, custom: false, puter: false });
  const [generalKey, setGeneralKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [puterToken, setPuterToken] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const [g, gr, c, p] = await Promise.all([hasGeminiKey(), hasGroqKey(), hasCustomKey(), hasPuterKey()]);
    setStatus({ gemini: g, groq: gr, custom: c, puter: p });
  };

  const handleGeminiSave = async () => {
    if (!generalKey || generalKey.length < 10) {
      toast(t('chat.setup.keyInvalid') || 'Invalid key', 'error');
      return;
    }
    try {
      await secureSet('geminiApiKey', generalKey.trim());
      if (endpoint) await DB.setSetting('geminiApiEndpoint', endpoint.trim());
      toast(t('chat.geminiActivated') || 'Gemini Activated', 'success');
      onComplete();
    } catch {
      toast(t('chat.setup.saveFail') || 'Failed to save', 'error');
    }
  };

  const handleGroqSave = async () => {
    if (!generalKey || generalKey.length < 10) {
      toast(t('chat.setup.keyInvalid') || 'Invalid key', 'error');
      return;
    }
    const saved = await saveGroqKey(generalKey.trim(), endpoint.trim() || null);
    if (saved) {
      toast(t('chat.groqActivated') || 'Groq Activated', 'success');
      onComplete();
    }
  };

  const handlePuterSave = async () => {
    if (puterToken) {
      await DB.setSetting('puterAuthToken', puterToken.trim());
    }
    const saved = await savePuterKey();
    if (saved) {
      toast('Free AI Activated! 🎉', 'success');
      onComplete();
    }
  };

  const handleCustomSave = async () => {
    if (customUrl && customKey) {
      await DB.setSetting('customAiConfig', JSON.stringify({ url: customUrl.trim(), key: customKey.trim(), model: customModel.trim() }));
      toast(t('action.save') || 'Saved', 'success');
      onComplete();
    }
  };

  const handleRemoveAll = async () => {
    await Promise.all([removeGeminiKey(), removeGroqKey(), removeCustomKey(), removePuterKey()]);
    toast('All API keys removed', 'info');
    loadStatus();
  };

  const anyKeySet = status.gemini || status.groq || status.custom || status.puter;

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="px-2">
        <h3 className="text-sm font-black text-[#002b59] dark:text-blue-200 mb-1">
          {anyKeySet && !isInitialSetup ? (t('action.edit') + ' 🔧') : (t('chat.setup.question') || 'Do you want a smarter assistant?')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {t('chat.setup.desc') || 'Connect to cloud AI models for advanced analysis.'}
        </p>
      </div>

      <div className="bg-white/80 dark:bg-[#1c1f23]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-[#002b59] to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">
              {t('chat.setup.connectTitle') || 'Connect AI'}
            </h4>
            <div className="flex gap-1 mt-1 flex-wrap">
              {status.puter && <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[9px] px-2 py-0.5 rounded-full font-bold">Free AI ✓</span>}
              {status.gemini && <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-[9px] px-2 py-0.5 rounded-full font-bold">Gemini ✓</span>}
              {status.groq && <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-[9px] px-2 py-0.5 rounded-full font-bold">Groq ✓</span>}
              {status.custom && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] px-2 py-0.5 rounded-full font-bold">Custom ✓</span>}
              {!anyKeySet && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{t('chat.setup.noKeys') || 'NO KEYS CONFIGURED'}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Free AI */}
          <button aria-label={t('action.boost') || 'Boost'} onClick={handlePuterSave} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-2xl flex items-center gap-3 active:scale-95 transition-all shadow-md relative overflow-hidden">
            <span className="material-symbols-outlined relative z-10 text-xl" aria-hidden="true">bolt</span>
            <div className="text-start relative z-10">
              <h4 className="text-xs font-black">{t('chat.setup.freeBtn') || 'Use Free AI'}</h4>
              <p className="text-[9px] text-white/80 font-medium">{t('chat.setup.freeDesc') || 'No key required'}</p>
            </div>
          </button>

          <details className="bg-slate-50 dark:bg-[#1a1d21] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden group">
            <summary className="p-3 text-[10px] text-blue-600 dark:text-blue-400 font-bold cursor-pointer list-none flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-sm">upgrade</span> {t('chat.setup.puterUpgrade') || 'Add Puter.com Token (Optional)'}
            </summary>
            <div className="px-3 pb-3 space-y-2">
              <div className="flex gap-2">
                 <input type="password" value={puterToken} onChange={e => setPuterToken(e.target.value)} placeholder={t('chat.setup.puterTokenPh') || 'Puter Token'} className="flex-1 w-full bg-white dark:bg-[#121214] text-[10px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white font-mono"/>
                 <button onClick={handlePuterSave} className="bg-[#002b59] text-white px-3 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all">{t('action.save')}</button>
              </div>
            </div>
          </details>

          {/* Cloud APIs */}
          <div className="bg-slate-50 dark:bg-[#1a1d21] p-3 rounded-2xl border border-slate-100 dark:border-slate-800 mt-4">
            <p className="text-[10px] text-slate-500 font-bold mb-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">vpn_key</span> {t('chat.setup.proKeys') || 'Pro Cloud Models'}
            </p>
            
            <div className="flex gap-2 mb-3">
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="flex-1 bg-white dark:bg-[#121214] p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center active:scale-95">
                <p className="text-[9px] font-black text-purple-600">Google Gemini</p>
              </a>
              <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="flex-1 bg-white dark:bg-[#121214] p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center active:scale-95">
                <p className="text-[9px] font-black text-orange-600">Groq AI</p>
              </a>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input type="password" value={generalKey} onChange={e => setGeneralKey(e.target.value)} placeholder={t('chat.setup.pasteKey') || 'Paste API Key here'} className="w-full bg-white dark:bg-[#121214] text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white font-mono transition-all"/>
              </div>
              <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="Custom Endpoint (Optional)" className="w-full bg-white dark:bg-[#121214] text-[10px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white mb-1"/>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={handleGeminiSave} className="bg-purple-600 text-white py-2.5 rounded-xl text-[10px] font-black active:scale-95 transition-all">{t('chat.setup.linkGemini') || 'Link Gemini'}</button>
                <button onClick={handleGroqSave} className="bg-orange-600 text-white py-2.5 rounded-xl text-[10px] font-black active:scale-95 transition-all">{t('chat.setup.linkGroq') || 'Link Groq'}</button>
              </div>
            </div>
          </div>

          <details className="bg-slate-50 dark:bg-[#1a1d21] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden group">
            <summary className="p-3 text-[10px] font-bold text-slate-500 cursor-pointer list-none flex justify-between items-center transition-colors">
              {t('chat.setup.customProvider') || 'Custom OpenAI-Compatible API'}
              <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div className="p-3 space-y-2 border-t border-slate-200 dark:border-slate-700">
              <input type="text" value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder={t('chat.customUrl') || 'API URL'} className="w-full bg-white dark:bg-[#121214] text-[10px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white"/>
              <input type="password" value={customKey} onChange={e => setCustomKey(e.target.value)} placeholder={t('chat.setup.pasteKey') || 'API Key'} className="w-full bg-white dark:bg-[#121214] text-[10px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white font-mono"/>
              <input type="text" value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder={t('chat.customModel') || 'Model name'} className="w-full bg-white dark:bg-[#121214] text-[10px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white"/>
              <button onClick={handleCustomSave} className="w-full bg-[#002b59] text-white py-2 rounded-xl text-[10px] font-black active:scale-95 transition-all">{t('action.save')}</button>
            </div>
          </details>

          {anyKeySet && (
            <div className="pt-2">
              <button aria-label={t('action.deleteAll') || 'Delete all'} onClick={handleRemoveAll} className="w-full text-red-500 text-[10px] font-bold py-2 bg-red-50 dark:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">delete_sweep</span> {t('chat.setup.deleteAll') || 'Remove all API keys'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!isInitialSetup && (
        <button onClick={onCancel} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-2xl text-[10px] font-bold active:scale-95 transition-all mt-4">
          {t('action.cancel')}
        </button>
      )}
    </div>
  );
}
