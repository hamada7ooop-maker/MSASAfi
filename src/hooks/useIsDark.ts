import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * useIsDark - React hook to detect if dark mode is currently active,
 * automatically reacting to class changes on document.documentElement or system preference.
 */
export function useIsDark(): boolean {
  const theme = useSettingsStore((s) => s.theme);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const checkDark = () => {
      if (typeof document !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };

    checkDark();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          checkDark();
        }
      }
    });

    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      checkDark();
    };
    media.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', handleMediaChange);
    };
  }, [theme]);

  return isDark;
}
