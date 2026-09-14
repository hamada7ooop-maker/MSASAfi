import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../../i18n/index';
import {
  exportEncrypted,
  exportCSV,
  cloudSignIn,
  cloudSignUp,
  cloudSignOut,
  cloudBackup,
  cloudRestore,
  getCloudSession,
  restoreBackup,
} from '../../services/settingsService';
import { checkMilestone } from '../../../../core/loyalty';
import { bridge } from '../../../../core/AppBridge';
import { silentFail } from '../../../../core/utils';
import { toast } from '../../../../toast';

export function BackupSyncCard() {
  const { t } = useI18n();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail,  setUserEmail]  = useState('');
  const [busy,       setBusy]       = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await getCloudSession();
        if (session?.access_token) {
          setIsLoggedIn(true);
          setUserEmail(session.user?.email || '');
        }
      } catch {
        /* Supabase cloud session unavailable or offline mode active — expected */
      }
    })();
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await restoreBackup(file);
    } catch (err: unknown) {
      // Directive 15 (silentFail audit): a failed restore is the single most
      // dangerous error to swallow — the user picked a backup file expecting
      // their data to come back, and without this toast the app just sits
      // there as if nothing happened. restoreBackup itself toasts its known
      // failure modes (invalid file, wrong password); this catch covers the
      // remaining ones (e.g. FileReader failure) that used to vanish.
      silentFail('[BackupSyncCard] Restore error')(err);
      toast(t('settings.msg.restoreFailed') || 'فشل استعادة النسخة الاحتياطية', 'error');
    }
    e.target.value = '';
  };

  const sections = [
    {
      id: 'cloud',
      icon: 'cloud_sync',
      iconColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      label: t('settings.cloud.sync'),
      sublabel: isLoggedIn
        ? `✓ ${userEmail}`
        : t('settings.cloud.notConnected') || 'غير متصل',
      sublabelColor: isLoggedIn ? 'text-emerald-500' : 'text-slate-400',
    },
    {
      id: 'local',
      icon: 'save',
      iconColor: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
      label: t('settings.localBackup'),
      sublabel: t('settings.localBackupDesc') || 'تصدير واستيراد محلياً',
      sublabelColor: 'text-slate-400',
    },
  ];

  return (
    <div className="space-y-1 animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
        {t('settings.sectionStorage')}
      </p>

      <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] divide-y divide-slate-100/30 dark:divide-white/[0.02]">
        {sections.map((sec) => (
          <div key={sec.id}>
            {/* Accordion Header */}
            <button aria-label={t('action.expand') || 'Expand'}
              onClick={() => setExpanded(expanded === sec.id ? null : sec.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 group text-start active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sec.iconColor} shadow-sm`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{sec.icon}</span>
                </div>
                <div>
                  <p className="text-[13px] font-black text-on-surface dark:text-white leading-tight">{sec.label}</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${sec.sublabelColor}`}>{sec.sublabel}</p>
                </div>
              </div>
              <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px] transition-transform duration-300 ${expanded === sec.id ? 'rotate-180 text-blue-500' : ''}`} aria-hidden="true">
                expand_more
              </span>
            </button>

            {/* Cloud Sync Panel */}
            {sec.id === 'cloud' && expanded === 'cloud' && (
              <div className="px-4 pb-4 space-y-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
                {!isLoggedIn ? (
                  <>
                    <input
                      type="email"
                      placeholder={t('settings.cloud.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 rounded-2xl text-[12px] font-bold border border-black/[0.03] dark:border-white/[0.03] outline-none focus:ring-2 focus:ring-blue-400/30 dark:text-white"
                    />
                    <input
                      type="password"
                      placeholder={t('settings.cloud.password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 rounded-2xl text-[12px] font-bold border border-black/[0.03] dark:border-white/[0.03] outline-none focus:ring-2 focus:ring-blue-400/30 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => run(async () => {
                          const data = await cloudSignIn(email, password);
                          if (data?.access_token) {
                            setIsLoggedIn(true);
                            setUserEmail(data.user?.email || email);
                          }
                        })}
                        disabled={busy || !email || !password}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-2xl text-[12px] font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-40"
                      >
                        {busy ? '...' : t('settings.cloud.signIn')}
                      </button>
                      <button
                        onClick={() => run(async () => {
                          const data = await cloudSignUp(email, password);
                          if (data?.access_token) {
                            setIsLoggedIn(true);
                            setUserEmail(data.user?.email || email);
                          }
                        })}
                        disabled={busy || !email || !password}
                        className="flex-1 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] text-slate-700 dark:text-white py-3 rounded-2xl text-[12px] font-black active:scale-95 transition-all disabled:opacity-40"
                      >
                        {t('settings.cloud.signUp')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          bridge.promptSheet(
                            t('settings.cloud.encPrompt') || 'أدخل كلمة مرور التشفير للنسخة السحابية:',
                            (encPassword) => {
                              if (!encPassword) return;
                              run(async () => {
                                await cloudBackup(encPassword);
                                checkMilestone('FIRST_SYNC');
                              });
                            },
                            '••••••',
                            true
                          );
                        }}
                        disabled={busy}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-2xl text-[12px] font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[16px]">backup</span>
                        {t('settings.cloud.backupNow')}
                      </button>
                      <button
                        onClick={() => {
                          bridge.promptSheet(
                            t('settings.cloud.encPrompt') || 'أدخل كلمة مرور التشفير للنسخة السحابية:',
                            (encPassword) => {
                              if (!encPassword) return;
                              run(async () => {
                                await cloudRestore(encPassword);
                              });
                            },
                            '••••••',
                            true
                          );
                        }}
                        disabled={busy}
                        className="flex-1 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] text-slate-700 dark:text-white py-3 rounded-2xl text-[12px] font-black active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[16px]">restore</span>
                        {t('settings.cloud.restore')}
                      </button>
                    </div>
                    <button
                      onClick={() => run(async () => {
                        await cloudSignOut();
                        setIsLoggedIn(false);
                        setUserEmail('');
                      })}
                      className="w-full py-2.5 text-rose-500 text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-colors active:scale-95"
                    >
                      {t('settings.cloud.signOut')}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Local Backup Panel */}
            {sec.id === 'local' && expanded === 'local' && (
              <div className="px-4 pb-4 space-y-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => run(async () => { await exportEncrypted(); checkMilestone('FIRST_BACKUP'); })}
                    disabled={busy}
                    className="py-3.5 rounded-2xl bg-slate-800 dark:bg-slate-900 text-white text-[11px] font-black active:scale-95 transition-all flex flex-col items-center gap-1 disabled:opacity-40 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    {t('settings.exportEnc')}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="py-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] text-slate-700 dark:text-white text-[11px] font-black active:scale-95 transition-all flex flex-col items-center gap-1 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">folder_open</span>
                    {t('settings.importEnc')}
                  </button>
                </div>
                <button
                  onClick={() => run(exportCSV)}
                  disabled={busy}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">table_view</span>
                  {t('settings.exportCsv')}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept=".enc,.json" onChange={handleFileChange} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
