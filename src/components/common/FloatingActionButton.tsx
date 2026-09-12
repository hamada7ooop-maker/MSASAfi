import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useI18n } from '../../i18n/index';
import { toast } from '../../toast';

/**
 * Modern Floating Action Menu (FAM) - Premium Design.
 * Optimized for both Dragging and Clicking using a unified Pointer Event system.
 */
export function FloatingActionButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL } = useI18n();
  const setQuickAddOpen = useAppStore((s) => s.setQuickAddOpen);
  
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ 
    x: 24, 
    bottom: 120 
  });
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs for interaction tracking
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, bottom: 0 });
  const startTime = useRef(0);
  const totalMovement = useRef(0);

  // Unified Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle left click / primary touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    setIsDragging(true);
    startTime.current = Date.now();
    totalMovement.current = 0;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { x: pos.x, bottom: pos.bottom };
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  };

  // Unified Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = dragStartPos.current.y - e.clientY;
    
    totalMovement.current += Math.abs(dx) + Math.abs(dy);
    
    // Smoothly update position
    setPos({
      x: Math.max(10, Math.min(window.innerWidth - 80, initialPos.current.x + (isRTL ? -dx : dx))),
      bottom: Math.max(20, Math.min(window.innerHeight - 200, initialPos.current.bottom + dy))
    });
  };

  // Unified Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    const duration = Date.now() - startTime.current;
    
    // Threshold: If moved < 10px and duration < 250ms, it's a CLICK
    if (totalMovement.current < 10 && duration < 250) {
      setIsOpen(!isOpen);
    }
  };

  const unlockedItems = useSettingsStore((s) => s.unlockedItems || []);
  const isTurboUnlocked = unlockedItems.includes('perk:turbo-scanner');

  const handleAction = (action: string) => {
    setIsOpen(false);
    if (action === 'add') setQuickAddOpen(true);
    else if (action === 'scan') {
      if (!isTurboUnlocked) {
        toast(t('shop.perk.turboScanner') + ' Required', 'warning');
        navigate('/shop');
        return;
      }
      setQuickAddOpen(true);
    }
    else if (action === 'chat') navigate('/chatbot');
    else if (action === 'search') navigate('/search');
  };

  const actions = [
    { id: 'add',    icon: 'post_add',         label: t('action.add'),          color: 'bg-emerald-500' },
    { id: 'scan',   icon: isTurboUnlocked ? 'document_scanner' : 'lock', label: t('txn.scan'), color: 'bg-blue-500' },
    { id: 'chat',   icon: 'smart_toy',        label: t('a11y.chatAssistant'), color: 'bg-indigo-500' },
    { id: 'search', icon: 'search',           label: t('action.search'),       color: 'bg-amber-500' },
  ];

  if (location.pathname === '/arcade') return null;

  return (
    <div 
      className={`fixed z-[9999] flex flex-col items-center transition-all duration-300 ${isDragging ? 'opacity-80 scale-95' : 'opacity-100'}`}
      style={{ 
        left: isRTL ? 'auto' : pos.x, 
        right: isRTL ? pos.x : 'auto', 
        bottom: pos.bottom,
        pointerEvents: 'none' // Parent container shouldn't block anything
      }}
    >
      {/* Sub-Actions (Speed Dial) */}
      <div className={`flex flex-col items-center gap-3 mb-4 transition-all duration-300 origin-bottom ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-10 pointer-events-none'}`}
           style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
        {actions.map((action, idx) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            type="button"
            className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg text-white transition-all hover:scale-110 active:scale-95 ${action.color} backdrop-blur-md border border-white/20`}
            style={{ transitionDelay: `${idx * 50}ms`, pointerEvents: 'auto' }}
          >
            <span className="material-symbols-outlined text-2xl !text-white">{action.icon}</span>
            <span className={`absolute ${isRTL ? 'right-14' : 'left-14'} px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none border border-white/10`}>
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Trigger Button */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative flex items-center justify-center w-16 h-16 rounded-[22px] shadow-2xl transition-all duration-500 hover:scale-105 active:scale-90 ${isOpen ? 'bg-slate-800 rotate-45' : 'bg-[var(--color-primary)]'} text-white border-2 border-white/20 overflow-hidden group`}
        style={{ pointerEvents: 'auto', touchAction: 'none' }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <span className={`material-symbols-outlined text-4xl transition-transform duration-500 pointer-events-none !text-white ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
          {isOpen ? 'close' : 'add'}
        </span>

        {!isOpen && !isDragging && (
          <div className="absolute inset-0 rounded-[22px] border-2 border-blue-400/50 animate-ping opacity-20 pointer-events-none" />
        )}
      </button>
    </div>
  );
}
