/**
 * Directive 19 — decomposition continuation: the travel weather vocabulary.
 *
 * extractCountry maps an Arabic/English trip name to a geocoding query;
 * getWeatherInfo maps an Open-Meteo weather code to the icon/label/gradient
 * pair the forecast hub renders. Both lifted verbatim from TravelBudget.tsx
 * — pure functions, now unit-testable apart from the screen.
 */

/** The i18n translate function (structural — the real t satisfies it). */
export type TranslateFn = (key: string) => string;

export const extractCountry = (nameStr: string): string => {
  const lowercase = nameStr.toLowerCase();
  if (lowercase.includes('يابان') || lowercase.includes('japan')) return 'Japan';
  if (lowercase.includes('دبي') || lowercase.includes('امارات') || lowercase.includes('dubai') || lowercase.includes('uae')) return 'United Arab Emirates';
  if (lowercase.includes('لندن') || lowercase.includes('بريطانيا') || lowercase.includes('london') || lowercase.includes('uk')) return 'United Kingdom';
  if (lowercase.includes('باريس') || lowercase.includes('فرنسا') || lowercase.includes('paris') || lowercase.includes('france')) return 'France';
  if (lowercase.includes('سعودي') || lowercase.includes('جدة') || lowercase.includes('رياض') || lowercase.includes('saudi') || lowercase.includes('ksa')) return 'Saudi Arabia';
  if (lowercase.includes('تركيا') || lowercase.includes('اسطنبول') || lowercase.includes('turkey') || lowercase.includes('istanbul')) return 'Turkey';
  if (lowercase.includes('مصر') || lowercase.includes('قاهرة') || lowercase.includes('egypt') || lowercase.includes('cairo')) return 'Egypt';
  if (lowercase.includes('ماليزيا') || lowercase.includes('malaysia')) return 'Malaysia';
  if (lowercase.includes('اندونيسيا') || lowercase.includes('indonesia')) return 'Indonesia';
  
  return nameStr.replace(/(رحلة|سفر|صيف|شتاء|إلى|الي|سياحة|travel|trip|to|summer|winter)/gi, '').trim();
};

export function getWeatherInfo(code: number, t: TranslateFn) {
  if (code === 0) return { icon: 'wb_sunny', text: t('travel.weather.sunny') || 'سماء صافية ☀️', color: 'from-amber-400 to-orange-500' };
  if (code >= 1 && code <= 3) return { icon: 'partly_cloudy_day', text: t('travel.weather.cloudy') || 'غائم جزئياً 🌤️', color: 'from-slate-400 to-blue-400' };
  if (code >= 45 && code <= 48) return { icon: 'foggy', text: t('travel.weather.foggy') || 'ضباب كثيف 🌫️', color: 'from-slate-400 to-slate-500' };
  if (code >= 51 && code <= 67) return { icon: 'rainy', text: t('travel.weather.rainy') || 'رذاذ/أمطار خفيفة 🌧️', color: 'from-blue-400 to-indigo-500' };
  if (code >= 71 && code <= 77) return { icon: 'ac_unit', text: t('travel.weather.snowy') || 'تساقط ثلوج ❄️', color: 'from-sky-300 to-blue-400' };
  if (code >= 80 && code <= 82) return { icon: 'rainy_heavy', text: t('travel.weather.rainHeavy') || 'زخات مطرية ⛈️', color: 'from-indigo-500 to-purple-600' };
  if (code >= 95) return { icon: 'thunderstorm', text: t('travel.weather.stormy') || 'عواصف رعدية 🌩️', color: 'from-slate-800 to-purple-950' };
  return { icon: 'device_thermostat', text: t('travel.weather.moderate') || 'طقس معتدل 🌡️', color: 'from-teal-400 to-emerald-500' };
}
