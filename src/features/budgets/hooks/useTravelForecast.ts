import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { checkMilestone } from '../../../core/loyalty';
import { silentFail } from '../../../core/utils';
import { LOCAL_FALLBACKS } from '../data/travelFallbacks';
import { extractCountry } from '../utils/travelWeather';
import type { Trip } from '@/types';

/**
 * Directive 19 — decomposition continuation: the live travel forecast.
 *
 * The whole effect lifted verbatim from TravelBudget.tsx: cache first (zero
 * delay on re-selection), then a local-fallback pre-population so the hub
 * never flickers, then Open-Meteo geocoding + current weather with abort on
 * trip change, and a graceful offline fallback on any failure. checkMilestone
 * ('FIRST_WEATHER') still fires only on a live fetch.
 */

export interface TravelForecast {
  flag: string;
  capital: string;
  languages: string;
  temp: number;
  weatherCode: number;
  countryName: string;
  isOffline?: boolean;
}

export function useTravelForecast(selectedTrip: Trip | null) {
  const { t } = useI18n();
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastData, setForecastData] = useState<TravelForecast | null>(null);
  const forecastCacheRef = useRef<Record<string, TravelForecast>>({});

  const selectedTripId = selectedTrip?.id;
  const selectedTripName = selectedTrip?.name;

useEffect(() => {
  if (!selectedTripId || !selectedTripName) {
    setForecastData(null);
    setForecastLoading(false);
    return;
  }
  
  const countryQuery = extractCountry(selectedTripName);
  const cacheKey = countryQuery.toLowerCase();

  // 1. If cached, use it immediately with zero delay
  if (forecastCacheRef.current[cacheKey]) {
    setForecastData(forecastCacheRef.current[cacheKey]);
    setForecastLoading(false);
    return;
  }

  // 2. Pre-populate with matching local fallback to prevent layout shifts/flickering
  const matchedKey = Object.keys(LOCAL_FALLBACKS).find(k => cacheKey.includes(k) || k.includes(cacheKey));
  const fallback = matchedKey ? LOCAL_FALLBACKS[matchedKey] : null;

  if (fallback) {
    setForecastData({ ...fallback, isOffline: true });
  }

  const controller = new AbortController();
  let isCancelled = false;

  const fetchForecast = async () => {
    setForecastLoading(true);
    try {
      let lat: number;
      let lng: number;
      let flag = fallback?.flag || '';
      let capital = fallback?.capital || '';
      let languages = fallback?.languages || '';
      let commonName = fallback?.countryName || selectedTripName;

      if (fallback?.latlng) {
        [lat, lng] = fallback.latlng;
      } else {
        // Open-Meteo Geocoding API with full CORS support
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(countryQuery)}&count=1&language=en&format=json`, {
          signal: controller.signal
        });
        if (!geoRes.ok) throw new Error('Geocoding failed');
        const geoData = await geoRes.json();
        const place = geoData?.results?.[0];
        if (!place) throw new Error('Location not found');
        lat = place.latitude;
        lng = place.longitude;
        if (place.country_code) {
          flag = `https://flagcdn.com/w320/${place.country_code.toLowerCase()}.png`;
        }
        commonName = place.country || place.name || selectedTripName;
        capital = place.name || '';
        languages = t('travel.forecast.unknownLang') || 'متعددة';
      }

      // Fetch live weather from Open-Meteo (open CORS)
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`, {
        signal: controller.signal
      });
      if (!weatherRes.ok) throw new Error('Weather not available');
      const weatherInfo = await weatherRes.json();
      
      if (!isCancelled && !controller.signal.aborted) {
        const liveData = {
          flag: flag || 'https://flagcdn.com/w320/un.png',
          capital: capital || t('travel.forecast.noCapital') || 'العاصمة',
          languages: languages || t('travel.forecast.unknownLang') || 'غير محدد',
          temp: Math.round(weatherInfo?.current_weather?.temperature ?? 20),
          weatherCode: weatherInfo?.current_weather?.weathercode || 0,
          countryName: commonName,
          isOffline: false
        };
        forecastCacheRef.current[cacheKey] = liveData;
        setForecastData(liveData);
        
        // Award Loyalty 2.0 milestone
        checkMilestone('FIRST_WEATHER');
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      silentFail('[TravelForecast] Failed to load travel info')(err);
      
      if (!isCancelled && !controller.signal.aborted) {
        if (fallback) {
          const fbData = { ...fallback, isOffline: true };
          forecastCacheRef.current[cacheKey] = fbData;
          setForecastData(fbData);
        } else {
          const genericData = {
            flag: 'https://flagcdn.com/w320/un.png',
            capital: t('travel.forecast.noCapital') || 'غير محدد',
            languages: t('travel.forecast.unknownLang') || 'غير محدد',
            temp: 22,
            weatherCode: 99,
            countryName: selectedTripName,
            isOffline: true
          };
          forecastCacheRef.current[cacheKey] = genericData;
          setForecastData(genericData);
        }
      }
    } finally {
      if (!isCancelled && !controller.signal.aborted) {
        setForecastLoading(false);
      }
    }
  };
  
  fetchForecast();
  return () => {
    isCancelled = true;
    controller.abort();
  };
}, [selectedTripId, selectedTripName, t]);

  return { forecastData, forecastLoading };
}
