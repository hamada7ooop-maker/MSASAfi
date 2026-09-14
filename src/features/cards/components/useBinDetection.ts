import { useRef, useState } from 'react';
import { silentFail } from '../../../core/utils';
import { LOCAL_BINS } from '../data/cardConstants';
import type { OpenBankingService } from '../../../services/openBanking';

export type DetectionStatus = 'idle' | 'detecting' | 'success' | 'failed';

/**
 * BIN (Bank Identification Number) auto-detection for the card sheet.
 *
 * Extracted from AddCardModal.tsx (632 lines) as part of L-1. This is network
 * and mapping logic, not presentation: it takes the first six digits, tries a
 * local lookup table, then falls back to binlist.net behind a 4-second abort,
 * and translates whatever comes back into this app's country, bank and style
 * ids.
 *
 * Isolating it matters for two reasons beyond size. It is the only part of the
 * sheet that talks to the network, so a reviewer checking what the card screen
 * sends externally reads one file. And it fails soft by design -- a failed
 * lookup must leave the user's own input untouched, never overwrite it.
 */
export interface BinDetectionDeps {
  obService: { current: OpenBankingService };
  /** Applies detected values without clobbering fields the user has edited. */
  applyDetected: (patch: { countryId?: string; bankId?: string; styleName?: string }) => void;
}

export function useBinDetection({ obService, applyDetected }: BinDetectionDeps) {
  const [, setDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle');
  const lastQueriedBin = useRef<string>('');

const mapCountryCode = (code: string): string => {
  const c = code?.toLowerCase();
  if (c === 'sa') return 'saudi';
  if (c === 'ae') return 'uae';
  if (c === 'kw') return 'kuwait';
  if (c === 'bh') return 'bahrain';
  if (c === 'qa') return 'qatar';
  if (c === 'om') return 'oman';
  if (c === 'eg') return 'egypt';
  if (c === 'jo') return 'jordan';
  if (c === 'ma') return 'morocco';
  if (c === 'tr') return 'turkey';
  if (c === 'gb') return 'uk';
  if (c === 'us') return 'usa';
  if (c === 'ca') return 'canada';
  if (c === 'de') return 'germany';
  if (c === 'fr') return 'france';
  if (c === 'in') return 'india';
  if (c === 'sg') return 'singapore';
  return 'saudi';
};

const mapBankName = (bankName: string, countryId: string): string => {
  const nameLower = bankName?.toLowerCase() || '';
  const providers = obService.current.getProvidersByCountry(countryId);
  const found = providers.find(p => 
    nameLower.includes(p.id.toLowerCase()) || 
    nameLower.includes(p.name.toLowerCase()) || 
    p.name.toLowerCase().includes(nameLower)
  );
  return found ? found.id : (providers.length > 0 ? providers[0].id : '');
};

const mapBankToStyle = (bankId: string): string => {
  if (['rajhi', 'anb', 'bsfr', 'enbd', 'fab', 'cib', 'chase', 'boa'].includes(bankId)) return 'sapphire';
  if (['snb', 'riyad', 'aljazira', 'bisb', 'housing_bank', 'nbe', 'bnp', 'lloyds'].includes(bankId)) return 'emerald';
  if (['alinma', 'dukhan'].includes(bankId)) return 'gold';
  if (['sab', 'adcb', 'rakbank', 'gulfbank', 'bbk', 'muscat', 'bm', 'hsbc_uk', 'akbank', 'santander'].includes(bankId)) return 'crimson';
  if (['monzo', 'itau', 'icici', 'ing'].includes(bankId)) return 'glass';
  return 'slate';
};

const detectCardDetails = async (rawNumber: string) => {
  const cleaned = rawNumber.replace(/\D/g, '');
  if (cleaned.length < 6) {
    setDetectionStatus('idle');
    return;
  }

  const bin = cleaned.substring(0, 6);
  if (bin === lastQueriedBin.current) return;
  lastQueriedBin.current = bin;

  // 1. Local BIN Match
  const localMatch = LOCAL_BINS[bin];
  if (localMatch) {
    setDetectionStatus('success');
    applyDetected({
      countryId: localMatch.countryId,
      bankId: localMatch.bankId,
      styleName: localMatch.styleName
    })
    return;
  }

  // 2. Fetch from Binlist API
  setDetecting(true);
  setDetectionStatus('detecting');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`https://lookup.binlist.net/${bin}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('BIN lookup failed');
    }

    const data = await response.json();
    const apiCountryCode = data.country?.alpha2 || '';
    const apiBankName = data.bank?.name || '';

    const mappedCountry = mapCountryCode(apiCountryCode);
    const mappedBank = mapBankName(apiBankName, mappedCountry);
    const mappedStyle = mapBankToStyle(mappedBank);

    setDetectionStatus('success');
    applyDetected({
      countryId: mappedCountry,
      bankId: mappedBank,
      styleName: mappedStyle
    })
  } catch (err) {
    silentFail('Auto-detect card details failed')(err);
    setDetectionStatus('failed');
  } finally {
    setDetecting(false);
  }
};

  return {
    detectionStatus,
    setDetectionStatus,
    detectCardDetails,
    lastQueriedBin,
  };
}
