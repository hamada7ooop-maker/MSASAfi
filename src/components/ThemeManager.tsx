import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * ThemeManager - Syncs theme and palette settings with the DOM.
 */
export function ThemeManager() {
  const { theme, darkPalette, lightPalette, fontSize } = useSettingsStore(
    useShallow((s) => ({
      theme: s.theme,
      darkPalette: s.darkPalette,
      lightPalette: s.lightPalette,
      fontSize: s.fontSize
    }))
  );

  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Determine if we should be in dark mode
    let isDark = false;
    if (theme === 'dark') {
      isDark = true;
    } else if (theme === 'auto') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // 2. Toggle dark class
    root.classList.toggle('dark', isDark);
    
    // 3. Apply Palettes
    if (isDark) {
      root.setAttribute('data-palette', darkPalette);
      root.removeAttribute('data-light-palette');
    } else {
      root.setAttribute('data-light-palette', lightPalette);
      root.removeAttribute('data-palette');
    }

    // 4. Apply Font Size
    root.setAttribute('data-font-size', fontSize || 'normal');

    // 5. Add specific theme body classes for legacy compatibility
    document.body.className = isDark ? `theme-dark palette-${darkPalette}` : `theme-light palette-${lightPalette}`;
    
  }, [theme, darkPalette, lightPalette, fontSize]);

  return null;
}
