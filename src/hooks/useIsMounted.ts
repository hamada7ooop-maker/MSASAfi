import { useRef, useEffect } from 'react';

/**
 * Custom hook returning a ref indicating whether the component is currently mounted.
 * Prevents state updates after unmount during async data loading.
 */
export function useIsMounted(): { readonly current: boolean } {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}
