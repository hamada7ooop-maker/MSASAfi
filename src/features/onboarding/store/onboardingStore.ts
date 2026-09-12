import { create } from 'zustand';

type OnboardingScreen = 'splash' | 'slides' | 'quickstart' | 'complete';

interface OnboardingState {
  screen: OnboardingScreen;
  slideIndex: number;
  quickStartStep: number;
  
  setScreen: (screen: OnboardingScreen) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  nextQuickStep: () => void;
  prevQuickStep: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  screen: 'splash',
  slideIndex: 0,
  quickStartStep: 0,

  setScreen: (screen) => set({ screen }),
  
  nextSlide: () => set((state) => ({ 
    slideIndex: Math.min(state.slideIndex + 1, 3) 
  })),
  
  prevSlide: () => set((state) => ({ 
    slideIndex: Math.max(state.slideIndex - 1, 0) 
  })),

  nextQuickStep: () => set((state) => ({ 
    quickStartStep: state.quickStartStep + 1 
  })),

  prevQuickStep: () => set((state) => ({ 
    quickStartStep: Math.max(state.quickStartStep - 1, 0) 
  })),

  reset: () => set({ screen: 'splash', slideIndex: 0, quickStartStep: 0 })
}));
