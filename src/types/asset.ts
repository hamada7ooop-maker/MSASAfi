export interface Asset {
  id: string;
  name: string;
  category: 'real_estate' | 'vehicle' | 'electronics' | 'other';
  purchasePrice: number;
  purchaseDate: string; // صيغة YYYY-MM-DD
  lifespanYears: number; // العمر الافتراضي بالسنوات
  salvageValue: number; // القيمة التخريدية المتوقعة في نهاية العمر الخدمي
  warrantyExpiry?: string; // تاريخ انتهاء الضمان (اختياري)
  depreciationMethod: 'straight_line' | 'double_declining'; // طريقة الاستهلاك
  notes?: string;
  isDemo?: number; // مؤشر للبيانات التجريبية
}
