import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAIAdvisor } from '../hooks/useAIAdvisor';
import { useI18n } from '../../../i18n/index';
import { ChatBubble } from './ChatBubble';
import { ChatSetupUI } from './ChatSetupUI';
import { hasAnyKey } from '../../../core/gemini';
import { db as DB } from '@/core/db/core';
import { voiceAssistant } from '../../../services/voiceAssistant';
import { toast } from '../../../toast';
import { checkMilestone } from '../../../core/loyalty';
import { bridge } from '../../../core/AppBridge';
import { silentFail } from '../../../core/utils';


export function ChatScreen() {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clear } = useAIAdvisor();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showSetup, setShowSetup] = useState(false);
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);
  const [pinnedQs, setPinnedQs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Dynamic Qs logic
  const CHAT_DYNAMIC_KEYS = useMemo(() => Array.from({ length: 21 }, (_, i) => `chat.q.d${i}`), []);
  const allDynamic = useMemo(() => CHAT_DYNAMIC_KEYS.map((k) => t(k)), [t, CHAT_DYNAMIC_KEYS]);
  const [randomQs, setRandomQs] = useState<string[]>([]);

  const refreshRandomQs = useCallback(() => {
    setRandomQs([...allDynamic].sort(() => 0.5 - Math.random()).slice(0, 5));
  }, [allDynamic]);

  // Runs once on mount. refreshRandomQs is deliberately NOT a dependency:
  // it changes identity whenever the language changes (via `allDynamic`), and
  // depending on it would reshuffle the suggested questions under the user
  // mid-conversation. The initial shuffle is all this effect is for.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    checkKeys();
    loadPinnedQs();
    refreshRandomQs();
  }, [refreshRandomQs]);

  const loadPinnedQs = async () => {
    const pinned = await DB.getSetting('pinnedChatQs');
    setPinnedQs(Array.isArray(pinned) ? (pinned as string[]) : []);
  };

  const checkKeys = async () => {
    const keys = await hasAnyKey();
    setHasKeys(keys);
  };

  const handlePin = async (q: string) => {
    const raw = await DB.getSetting('pinnedChatQs');
    const pinned = Array.isArray(raw) ? [...(raw as string[])] : [];
    if (!pinned.includes(q)) {
      pinned.push(q);
      await DB.setSetting('pinnedChatQs', pinned);
      setPinnedQs(pinned);
    }
  };

  const handleUnpin = async (q: string) => {
    const raw = await DB.getSetting('pinnedChatQs');
    const pinned = (Array.isArray(raw) ? (raw as string[]) : []).filter((p: string) => p !== q);
    await DB.setSetting('pinnedChatQs', pinned);
    setPinnedQs(pinned);
  };

  const handleAddCustomPin = () => {
    bridge.promptSheet(
      t('chat.customQTitle') || 'Add custom question:',
      (q) => {
        if (q && q.trim()) {
          handlePin(q.trim());
        }
      }
    );
  };


  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, showSetup]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
    checkMilestone('FIRST_AI_CHAT');
  };

  const handleVoiceAssistant = () => {
    if (!voiceAssistant.isSupported()) {
      toast(t('chat.voiceNotSupported') || 'Voice not supported', 'error');
      return;
    }

    if (isListening) {
      voiceAssistant.stop();
      setIsListening(false);
      
      // Send the accumulated input if not empty after a tiny delay to ensure state updates
      setTimeout(() => {
        setInput(prev => {
          if (prev.trim()) {
            sendMessage(prev.trim());
            checkMilestone('FIRST_AI_CHAT');
            return '';
          }
          return prev;
        });
      }, 100);
      return;
    }

    setIsListening(true);
    voiceAssistant.onResult = (transcript: string) => {
      if (transcript.trim()) {
        setInput(transcript);
      }
    };

    voiceAssistant.onError = (error: string) => {
      silentFail('[ChatScreen] Voice Assistant Error')(error);
      toast(t('chat.voiceFail') || 'Voice recognition failed', 'error');
      setIsListening(false);
    };

    voiceAssistant.start();
  };

  const unpinnedQs = randomQs.filter((q) => !pinnedQs.includes(q));

  if (hasKeys === null) return <div className="h-full flex items-center justify-center"><div className="skeleton w-16 h-16 rounded-full"></div></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500 bg-[#f8f9fa] dark:bg-[#121214]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3 bg-white dark:bg-[#1c1f23] shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-colors ${hasKeys ? 'bg-gradient-to-br from-[#002b59] to-blue-600' : 'bg-slate-400'}`}>
            <span className="material-symbols-outlined text-xl">{hasKeys ? 'auto_awesome' : 'smart_toy'}</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-[#002b59] dark:text-blue-100 leading-tight">
              {t('chat.title') || 'AI Advisor'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold">{t('chat.subtitleAssistant') || 'Financial Assistant'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={clear} className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          )}
          <button onClick={() => setShowSetup(!showSetup)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-90 transition-transform shadow-sm">
            <span className="material-symbols-outlined text-lg">settings</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth pb-10"
      >
        {(!hasKeys && messages.length === 0) || showSetup ? (
          <ChatSetupUI 
            isInitialSetup={!hasKeys && !showSetup} 
            onComplete={() => { checkKeys(); setShowSetup(false); }} 
            onCancel={() => setShowSetup(false)} 
          />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center mt-8">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-[#002b59] to-[#1a4175] flex items-center justify-center shadow-xl shadow-blue-900/20 mb-2 animate-bounce-slow">
              <span className="material-symbols-outlined text-4xl text-white">magic_button</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">
              {t('chat.welcome') || 'How can I help you today?'}
            </h3>
            <div className="bg-[#002b59]/10 dark:bg-blue-900/20 text-[#002b59] dark:text-blue-300 px-4 py-3 rounded-2xl max-w-xs mx-auto border border-[#002b59]/20 dark:border-blue-800/30">
               <p className="text-xs font-bold leading-relaxed">{t('chat.helloAI') || 'I am Masarifi AI. I can analyze your transactions, provide financial insights, and help you save money.'}</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isLoading && (messages[messages.length - 1]?.role !== 'assistant') && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-[#1e2124] text-slate-400 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] rounded-bl-sm px-5 py-3 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse delay-150"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse delay-300"></span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Action Area (Suggestions & Input) */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-[#1c1f23]/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-3 pt-2 space-y-2">
        {/* Carousel */}
        {!showSetup && hasKeys && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={refreshRandomQs} className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-[#25282d] hover:bg-slate-200 text-[#002b59] dark:text-blue-300 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 active:rotate-180 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
            
            {pinnedQs.map((q) => (
              <div key={`p-${q}`} className="flex items-center bg-[#002b59]/10 dark:bg-blue-900/30 text-[#002b59] dark:text-blue-200 border border-[#002b59]/20 dark:border-blue-800/40 rounded-xl whitespace-nowrap shadow-sm transition-all group">
                <button 
                  onClick={() => { if (!isLoading) sendMessage(q); }} 
                  className="px-3 py-1.5 text-[10px] font-bold active:scale-95 transition-all disabled:opacity-50"
                  disabled={isLoading}
                >
                  {q}
                </button>
                <button onClick={() => handleUnpin(q)} className="px-2 py-1.5 border-l border-[#002b59]/20 dark:border-blue-800/40 active:scale-90 flex items-center justify-center text-red-500 opacity-70 hover:opacity-100 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">keep_off</span>
                </button>
              </div>
            ))}

            {unpinnedQs.map((q) => (
              <div key={`u-${q}`} className="flex items-center bg-white dark:bg-[#1c1f23] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl whitespace-nowrap shadow-sm transition-all group">
                <button 
                  onClick={() => { if (!isLoading) sendMessage(q); }} 
                  className="px-3 py-1.5 text-[10px] font-bold active:scale-95 transition-all disabled:opacity-50"
                  disabled={isLoading}
                >
                  {q}
                </button>
                <button onClick={() => handlePin(q)} className="px-2 py-1.5 border-l border-slate-200 dark:border-slate-700 active:scale-90 flex items-center justify-center text-slate-400 hover:text-[#002b59] dark:hover:text-blue-400 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">keep</span>
                </button>
              </div>
            ))}

            <button onClick={handleAddCustomPin} className="flex-shrink-0 w-8 h-8 bg-white dark:bg-[#1c1f23] text-slate-400 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 active:scale-95 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex gap-2 w-full p-1 bg-slate-100 dark:bg-[#25282d] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner focus-within:ring-2 focus-within:ring-[#002b59]/20 transition-all">
          <button 
            onClick={handleVoiceAssistant}
            className={`w-10 h-10 flex items-center justify-center rounded-xl shadow-sm active:scale-90 transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white dark:bg-[#1c1f23] text-slate-500'}`}
          >
            <span className="material-symbols-outlined text-[18px]">mic</span>
          </button>
          
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onCompositionEnd={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!hasKeys && !showSetup}
            placeholder={isListening ? (t('chat.listening') || 'Listening...') : (t('chat.placeholder') || 'Type a message...')}
            className="flex-1 bg-transparent border-none px-2 text-sm focus:ring-0 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
            dir="auto"
          />
          
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || (!hasKeys && !showSetup)}
            className="w-10 h-10 bg-[#002b59] hover:bg-blue-800 active:bg-blue-900 text-white flex items-center justify-center rounded-xl shadow-md active:scale-90 transition-all disabled:opacity-50 disabled:bg-slate-400"
          >
            <span className="material-symbols-outlined text-[18px] ml-0.5">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
