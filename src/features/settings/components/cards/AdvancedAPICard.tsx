import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../../i18n/index';
import { toast } from '../../../../toast';
import { getApiKey, setApiKey, MARKET_API_KEYS, type MarketApiKeyName } from '../../../../core/apiKeys';

interface AdvancedAPICardProps {
  /** Only used as a change signal to re-read the keys from secure storage. */
  settings: Record<string, unknown>;
}

const COLOR_MAP: Record<string, { track: string; ring: string; badge: string }> = {
  amber:  { track: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 shadow-sm',  ring: 'focus:ring-amber-500/20',  badge: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/20' },
  blue:   { track: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 shadow-sm',   ring: 'focus:ring-blue-500/20',   badge: 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/20' },
  purple: { track: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 shadow-sm', ring: 'focus:ring-purple-500/20', badge: 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-600/20' },
  indigo: { track: 'bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm', ring: 'focus:ring-indigo-500/20', badge: 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-600/20' },
};

export function AdvancedAPICard({ settings }: AdvancedAPICardProps) {
  const { t } = useI18n();

  const [goldKey,     setGoldKey]     = useState('');
  const [exchangeKey, setExchangeKey] = useState('');
  const [newsKey,     setNewsKey]     = useState('');
  const [fredKey,     setFredKey]     = useState('');
  const [expanded,    setExpanded]    = useState<string | null>(null);
  // Mirrors which keys are set, since the values no longer live in `settings`.
  const [present, setPresent] = useState<Record<string, boolean>>({});

  // API keys now live in secure storage (keystore / encrypted preferences),
  // not in the plaintext `settings` table — see core/apiKeys.ts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        MARKET_API_KEYS.map(async (k) => [k, (await getApiKey(k)) || ''] as const)
      );
      if (cancelled) return;
      const map = Object.fromEntries(entries) as Record<MarketApiKeyName, string>;
      setGoldKey(map.goldApiKey);
      setExchangeKey(map.exchangeRateApiKey);
      setNewsKey(map.currentsApiKey);
      setFredKey(map.fredApiKey);
      setPresent(Object.fromEntries(entries.map(([k, v]) => [k, Boolean(v)])));
    })();
    return () => { cancelled = true; };
  }, [settings]);

  const handleSave = async (key: string, stateValue: string) => {
    const name = key as MarketApiKeyName;
    const trimmed = stateValue.trim();

    if (!trimmed) {
      if (!present[name]) {
        toast(t('settings.msg.enterKey') || 'أدخل المفتاح أولاً', 'error');
        return;
      }
      await setApiKey(name, '');
      setPresent((p) => ({ ...p, [name]: false }));
      toast(t('settings.msg.cleared') || 'تم المسح', 'info');
      return;
    }

    const ok = await setApiKey(name, trimmed);
    if (!ok) {
      // Report the failure instead of implying the key was stored.
      toast(t('common.error') || 'تعذّر الحفظ الآمن', 'error');
      return;
    }
    setPresent((p) => ({ ...p, [name]: true }));
    toast(t('settings.msg.saved') || 'تم الحفظ ✓', 'success');
  };

  const apis = [
    { id: 'gold',     label: t('settings.goldApiKey'),         key: 'goldApiKey',         val: goldKey,     set: setGoldKey,     color: 'amber',  icon: 'payments' },
    { id: 'exchange', label: t('settings.exchangeRateApiKey'), key: 'exchangeRateApiKey', val: exchangeKey, set: setExchangeKey, color: 'blue',   icon: 'currency_exchange' },
    { id: 'news',     label: t('settings.newsApiKey'),         key: 'currentsApiKey',     val: newsKey,     set: setNewsKey,     color: 'purple', icon: 'newspaper' },
    { id: 'fred',     label: t('settings.fredApiKey'),         key: 'fredApiKey',         val: fredKey,     set: setFredKey,     color: 'indigo', icon: 'query_stats' },
  ];

  return (
    <div className="space-y-1 animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
        {t('settings.marketApiKeys')}
      </p>

      <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)]">

        {/* Description Banner */}
        <div className="px-4 pt-4 pb-3 flex gap-3 items-start border-b border-slate-100/70 dark:border-white/[0.04]">
          <div className="w-8 h-8 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-center shrink-0 mt-0.5 border border-black/[0.03] dark:border-white/[0.03]">
            <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {t('settings.marketApiDesc')}
          </p>
        </div>

        {/* API Accordions */}
        <div className="divide-y divide-slate-100/70 dark:divide-white/[0.04]">
          {apis.map((api) => {
            const colors = COLOR_MAP[api.color];
            const isExpanded = expanded === api.id;
            const hasKey = !!present[api.key];

            return (
              <div key={api.id}>
                {/* Header Row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : api.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 active:scale-[0.99] group text-start"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.track}`}>
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{api.icon}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">{api.label}</p>
                      <p className="text-[10px] mt-0.5 leading-none">
                        {hasKey ? (
                          <span className="text-emerald-500 font-black flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {t('settings.keyActive') || 'مفعّل'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">{t('settings.keyNotSet') || 'غير مُعيَّن'}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Input Panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder={`${api.label}...`}
                        value={api.val}
                        onChange={(e) => api.set(e.target.value)}
                        className={`flex-1 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 rounded-2xl text-[12px] font-bold border border-black/[0.03] dark:border-white/[0.03] outline-none focus:ring-2 ${colors.ring} dark:text-white transition-all`}
                      />
                      <button
                        onClick={() => handleSave(api.key, api.val)}
                        className={`h-[46px] w-[46px] rounded-2xl text-white flex items-center justify-center active:scale-90 transition-all shadow-lg ${colors.badge}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">save</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
