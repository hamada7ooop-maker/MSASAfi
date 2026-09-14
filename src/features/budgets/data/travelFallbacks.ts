/**
 * Offline travel facts per destination.
 *
 * Static reference data, lifted out of TravelBudget.tsx as part of L-1: a
 * hundred lines of constants in the middle of a component make the logic
 * around them hard to find, and this table changes on a completely different
 * cadence from the UI that reads it.
 *
 * Used only as a fallback when the live forecast lookup fails.
 */
export const LOCAL_FALLBACKS: Record<string, {
  flag: string;
  capital: string;
  languages: string;
  temp: number;
  weatherCode: number;
  countryName: string;
  latlng: [number, number];
  countryCode: string;
}> = {
  'japan': {
    flag: 'https://flagcdn.com/w320/jp.png',
    capital: 'طوكيو (Tokyo)',
    languages: 'اليابانية (Japanese)',
    temp: 18,
    weatherCode: 1,
    countryName: 'اليابان (Japan)',
    latlng: [35.6762, 139.6503],
    countryCode: 'jp'
  },
  'united arab emirates': {
    flag: 'https://flagcdn.com/w320/ae.png',
    capital: 'أبوظبي (Abu Dhabi)',
    languages: 'العربية (Arabic)',
    temp: 32,
    weatherCode: 0,
    countryName: 'الإمارات العربية المتحدة (UAE)',
    latlng: [25.2048, 55.2708],
    countryCode: 'ae'
  },
  'united kingdom': {
    flag: 'https://flagcdn.com/w320/gb.png',
    capital: 'لندن (London)',
    languages: 'الإنجليزية (English)',
    temp: 14,
    weatherCode: 51,
    countryName: 'المملكة المتحدة (UK)',
    latlng: [51.5074, -0.1278],
    countryCode: 'gb'
  },
  'france': {
    flag: 'https://flagcdn.com/w320/fr.png',
    capital: 'باريس (Paris)',
    languages: 'الفرنسية (French)',
    temp: 16,
    weatherCode: 2,
    countryName: 'فرنسا (France)',
    latlng: [48.8566, 2.3522],
    countryCode: 'fr'
  },
  'saudi arabia': {
    flag: 'https://flagcdn.com/w320/sa.png',
    capital: 'الرياض (Riyadh)',
    languages: 'العربية (Arabic)',
    temp: 30,
    weatherCode: 0,
    countryName: 'المملكة العربية السعودية (KSA)',
    latlng: [24.7136, 46.6753],
    countryCode: 'sa'
  },
  'turkey': {
    flag: 'https://flagcdn.com/w320/tr.png',
    capital: 'أنقرة (Ankara)',
    languages: 'التركية (Turkish)',
    temp: 20,
    weatherCode: 1,
    countryName: 'تركيا (Turkey)',
    latlng: [41.0082, 28.9784],
    countryCode: 'tr'
  },
  'egypt': {
    flag: 'https://flagcdn.com/w320/eg.png',
    capital: 'القاهرة (Cairo)',
    languages: 'العربية (Arabic)',
    temp: 26,
    weatherCode: 0,
    countryName: 'جمهورية مصر العربية (Egypt)',
    latlng: [30.0444, 31.2357],
    countryCode: 'eg'
  },
  'malaysia': {
    flag: 'https://flagcdn.com/w320/my.png',
    capital: 'كوالالمبور (Kuala Lumpur)',
    languages: 'الملايو (Malay)',
    temp: 28,
    weatherCode: 95,
    countryName: 'ماليزيا (Malaysia)',
    latlng: [3.1390, 101.6869],
    countryCode: 'my'
  },
  'indonesia': {
    flag: 'https://flagcdn.com/w320/id.png',
    capital: 'جاكرتا (Jakarta)',
    languages: 'الإندونيسية (Indonesian)',
    temp: 29,
    weatherCode: 95,
    countryName: 'إندونيسيا (Indonesia)',
    latlng: [-6.2088, 106.8456],
    countryCode: 'id'
  }
};
