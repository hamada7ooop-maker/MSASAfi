import { useMemo } from 'react';
import { bridge, AppBridgeService } from '../core/AppBridge';

/**
 * A React hook that provides type-safe access to global functions registered on the AppBridge.
 */
export function useAppBridge(): AppBridgeService {
  return useMemo(() => bridge, []);
}
