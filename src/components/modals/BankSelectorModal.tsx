import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/index';
import { openBanking, type BankCountry, type BankProvider, type ConnectedBank } from '../../services/openBanking';
import { toast } from '../../toast';
import { useIsMounted } from '../../hooks/useIsMounted';

interface BankSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BankSelectorModal({ isOpen, onClose }: BankSelectorModalProps) {
  const { t, isRTL } = useI18n();
  const isMounted = useIsMounted();
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  const [connectedBanks, setConnectedBanks] = useState<ConnectedBank[]>([]);
  const [simulatingBank, setSimulatingBank] = useState<BankProvider | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentCountry(null);
      setSimulatingBank(null);
      openBanking.getConnectedBanks().then((banks) => {
        if (isMounted.current) {
          setConnectedBanks(banks);
        }
      });
    }
  }, [isOpen, isMounted]);

  if (!isOpen) return null;

  const handleSelectBank = async (provider: BankProvider) => {
    setSimulatingBank(provider);

    try {
      const success = await openBanking.connectBank(provider.id);
      if (!isMounted.current) return;

      if (success) {
        setTimeout(() => {
          if (!isMounted.current) return;
          setSimulatingBank(null);
          onClose();
          toast(t('settings.bank.simulationSuccess') || 'انتهت المحاكاة بنجاح!', 'info');
        }, 2200);
      }
    } catch (e: unknown) {
      if (!isMounted.current) return;
      setSimulatingBank(null);
      const err = e as Error;
      toast(err.message || 'Error', 'error');
    }
  };

  const countries = openBanking.countries as BankCountry[];
  const providers = currentCountry ? openBanking.getProvidersByCountry(currentCountry) : [];
  const activeCountry = countries.find((c) => c.id === currentCountry);

  return (
    <>
      {/* Main Bank Selection Modal */}
      <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#1c1f23] w-full max-w-md rounded-t-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto my-3 shrink-0" />

          {/* Header */}
          <div className="px-6 py-2 flex justify-between items-center shrink-0">
            {currentCountry ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentCountry(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label={t('common.back') || 'Back'}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{isRTL ? 'arrow_forward' : 'arrow_back'}</span>
                </button>
                <h2 className="text-xl font-black text-slate-900 dark:text-blue-100">{t('settings.bank.selectBank')}</h2>
              </div>
            ) : (
              <h2 className="text-xl font-black text-slate-900 dark:text-blue-100">{t('settings.bank.selectCountry')}</h2>
            )}

            <div className="flex items-center gap-2">
              {currentCountry && <span className="text-2xl">{activeCountry?.flag}</span>}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={t('common.close') || 'Close'}
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar">
            {/* Development Notice */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-amber-600 text-sm">construction</span>
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">
                  {t('settings.bank.underDev')}
                </span>
              </div>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60 leading-tight">
                {t('settings.bank.mockupDesc')}
              </p>
            </div>

            {!currentCountry ? (
              /* Step 1: Country List */
              <div className="grid grid-cols-1 gap-3">
                {countries
                  .map((c) => ({ ...c, name: t(c.nameKey) }))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <button
                      aria-label={c.name}
                      key={c.id}
                      type="button"
                      onClick={() => setCurrentCountry(c.id)}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group cursor-pointer active:scale-95"
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'} font-bold text-sm text-slate-800 dark:text-slate-100`}>
                        {c.name}
                      </span>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500 transition-colors" aria-hidden="true">
                        {isRTL ? 'chevron_left' : 'chevron_right'}
                      </span>
                    </button>
                  ))}
              </div>
            ) : (
              /* Step 2: Bank Providers List */
              <div className="grid grid-cols-2 gap-4">
                {providers.map((p) => {
                  const isConnected = connectedBanks.some((b) => b.id === p.id);
                  return (
                    <button aria-label={t('action.confirm') || 'Confirm'}
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectBank(p)}
                      disabled={isConnected}
                      className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex flex-col items-center gap-3 relative transition-all active:scale-95 ${
                        isConnected ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-md"
                        style={{ backgroundColor: p.color, color: 'white' }}
                      >
                        {p.logo}
                      </div>
                      <span className="text-[11px] font-black text-center text-slate-800 dark:text-slate-200">
                        {isRTL ? p.nameAr : p.name}
                      </span>
                      {isConnected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center scale-75">
                          <span className="material-symbols-outlined !text-[14px]" aria-hidden="true">check</span>
                        </div>
                      )}
                    </button>
                  );
                })}
                {providers.length === 0 && (
                  <p className="col-span-2 text-center text-slate-400 py-10">{t('settings.bank.noBanks')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Simulation Overlay Modal */}
      {simulatingBank && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1c1f22] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-3xl font-black text-white shadow-xl animate-pulse"
              style={{ backgroundColor: simulatingBank.color }}
            >
              {simulatingBank.logo}
            </div>

            <h2 className="text-xl font-black mb-2 text-slate-900 dark:text-slate-100">
              {t('settings.bank.connecting')} {isRTL ? simulatingBank.nameAr : simulatingBank.name}
            </h2>
            <p className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full inline-block mb-4 tracking-tighter">
              {t('settings.bank.simulation')}
            </p>
            <p className="text-xs text-slate-400 mb-8">{t('settings.bank.redirecting')}</p>

            <div className="flex justify-center mb-8">
              <div className="w-12 h-12 border-4 border-t-blue-600 border-slate-100 dark:border-slate-800 rounded-full animate-spin" />
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center gap-3">
                <span className="material-symbols-outlined text-green-500">lock</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  HTTPS://SECURE.{simulatingBank.id.toUpperCase()}.COM
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
