import { db as DB } from '@/core/db/core';
import { t } from '../i18n/engine';
import { toast } from '../toast';

export interface BankCountry {
  id: string;
  nameKey: string;
  flag: string;
  name?: string;
}

export interface BankProvider {
  id: string;
  country: string;
  name: string;
  nameAr: string;
  color: string;
  logo: string;
}

export interface ConnectedBank extends BankProvider {
  connectedAt: string;
  lastSync: string;
  status: 'active' | 'inactive';
  isDemo?: boolean;
}

/**
 * Open Banking Interface Structure (Professional Mock v2.1)
 * Expanded Global Support for all major Open Banking compliant regions.
 */
export class OpenBankingService {
  countries: BankCountry[];
  providers: BankProvider[];

  constructor() {
    this.countries = [
      { id: 'saudi', nameKey: 'country.saudi', flag: '🇸🇦' },
      { id: 'uae', nameKey: 'country.uae', flag: '🇦🇪' },
      { id: 'kuwait', nameKey: 'country.kuwait', flag: '🇰🇼' },
      { id: 'bahrain', nameKey: 'country.bahrain', flag: '🇧🇭' },
      { id: 'qatar', nameKey: 'country.qatar', flag: '🇶🇦' },
      { id: 'oman', nameKey: 'country.oman', flag: '🇴🇲' },
      { id: 'egypt', nameKey: 'country.egypt', flag: '🇪🇬' },
      { id: 'jordan', nameKey: 'country.jordan', flag: '🇯🇴' },
      { id: 'morocco', nameKey: 'country.morocco', flag: '🇲🇦' },
      { id: 'turkey', nameKey: 'country.turkey', flag: '🇹🇷' },
      { id: 'uk', nameKey: 'country.uk', flag: '🇬🇧' },
      { id: 'usa', nameKey: 'country.usa', flag: '🇺🇸' },
      { id: 'canada', nameKey: 'country.canada', flag: '🇨🇦' },
      { id: 'brazil', nameKey: 'country.brazil', flag: '🇧🇷' },
      { id: 'germany', nameKey: 'country.germany', flag: '🇩🇪' },
      { id: 'france', nameKey: 'country.france', flag: '🇫🇷' },
      { id: 'spain', nameKey: 'country.spain', flag: '🇪🇸' },
      { id: 'italy', nameKey: 'country.italy', flag: '🇮🇹' },
      { id: 'australia', nameKey: 'country.australia', flag: '🇦🇺' },
      { id: 'india', nameKey: 'country.india', flag: '🇮🇳' },
      { id: 'singapore', nameKey: 'country.singapore', flag: '🇸🇬' }
    ];

    this.providers = [
      // Saudi Arabia
      { id: 'aljazira', country: 'saudi', name: 'Bank AlJazira', nameAr: 'بنك الجزيرة', color: '#006a4d', logo: 'J' },
      { id: 'alinma', country: 'saudi', name: 'Alinma Bank', nameAr: 'مصرف الإنماء', color: '#b39556', logo: 'I' },
      { id: 'anb', country: 'saudi', name: 'ANB', nameAr: 'البنك العربي الوطني', color: '#0056b3', logo: 'An' },
      { id: 'bsfr', country: 'saudi', name: 'Banque Saudi Fransi', nameAr: 'البنك السعودي الفرنسي', color: '#003366', logo: 'F' },
      { id: 'gib', country: 'saudi', name: 'Gulf International Bank', nameAr: 'بنك الخليج الدولي', color: '#002d72', logo: 'G' },
      { id: 'rajhi', country: 'saudi', name: 'Al Rajhi Bank', nameAr: 'مصرف الراجحي', color: '#0056b3', logo: 'R' },
      { id: 'riyad', country: 'saudi', name: 'Riyad Bank', nameAr: 'بنك الرياض', color: '#007a3d', logo: 'Ry' },
      { id: 'sab', country: 'saudi', name: 'SAB (Saudi Awwal Bank)', nameAr: 'البنك السعودي الأول', color: '#db0011', logo: 'S' },
      { id: 'sib', country: 'saudi', name: 'Saudi Investment Bank', nameAr: 'البنك السعودي للاستثمار', color: '#004a99', logo: 'Inv' },
      { id: 'snb', country: 'saudi', name: 'SNB (AlAhli)', nameAr: 'البنك الأهلي', color: '#006a4d', logo: 'A' },

      // UAE
      { id: 'adcb', country: 'uae', name: 'ADCB', nameAr: 'بنك أبوظبي التجاري', color: '#cc1e2c', logo: 'AD' },
      { id: 'adib', country: 'uae', name: 'Abu Dhabi Islamic Bank', nameAr: 'مصرف أبوظبي الإسلامي', color: '#004a99', logo: 'Adi' },
      { id: 'dib', country: 'uae', name: 'Dubai Islamic Bank', nameAr: 'بنك دبي الإسلامي', color: '#006a4d', logo: 'Dib' },
      { id: 'enbd', country: 'uae', name: 'Emirates NBD', nameAr: 'بنك الإمارات دبي الوطني', color: '#003366', logo: 'E' },
      { id: 'fab', country: 'uae', name: 'FAB', nameAr: 'بنك أبوظبي الأول', color: '#002d72', logo: 'F' },
      { id: 'mashreq', country: 'uae', name: 'Mashreq Bank', nameAr: 'بنك المشرق', color: '#ff6200', logo: 'M' },
      { id: 'rakbank', country: 'uae', name: 'RAKBANK', nameAr: 'بنك رأس الخيمة', color: '#cc1e2c', logo: 'Rak' },

      // Kuwait
      { id: 'burgan', country: 'kuwait', name: 'Burgan Bank', nameAr: 'بنك برقان', color: '#004a99', logo: 'B' },
      { id: 'gulfbank', country: 'kuwait', name: 'Gulf Bank', nameAr: 'بنك الخليج', color: '#cc1e2c', logo: 'G' },
      { id: 'kfh', country: 'kuwait', name: 'KFH', nameAr: 'بيت التمويل الكويتي', color: '#006a4d', logo: 'K' },
      { id: 'nbk', country: 'kuwait', name: 'NBK', nameAr: 'بنك الكويت الوطني', color: '#003366', logo: 'N' },

      // Qatar
      { id: 'cbq', country: 'qatar', name: 'Commercial Bank', nameAr: 'البنك التجاري', color: '#004a99', logo: 'C' },
      { id: 'dukhan', country: 'qatar', name: 'Dukhan Bank', nameAr: 'بنك دخان', color: '#7a3d00', logo: 'D' },
      { id: 'qnb', country: 'qatar', name: 'QNB', nameAr: 'بنك قطر الوطني', color: '#4d0011', logo: 'Q' },

      // Bahrain
      { id: 'bbk', country: 'bahrain', name: 'BBK', nameAr: 'بنك البحرين والكويت', color: '#cc1e2c', logo: 'B' },
      { id: 'bisb', country: 'bahrain', name: 'BisB', nameAr: 'بحرين الإسلامي', color: '#006a4d', logo: 'Bi' },

      // Oman
      { id: 'dhofar', country: 'oman', name: 'Bank Dhofar', nameAr: 'بنك ظفار', color: '#004a99', logo: 'D' },
      { id: 'muscat', country: 'oman', name: 'Bank Muscat', nameAr: 'بنك مسقط', color: '#cc1e2c', logo: 'M' },

      // Jordan
      { id: 'arab_bank', country: 'jordan', name: 'Arab Bank', nameAr: 'البنك العربي', color: '#003366', logo: 'A' },
      { id: 'housing_bank', country: 'jordan', name: 'Housing Bank', nameAr: 'بنك الإسكان', color: '#006a4d', logo: 'H' },

      // Egypt
      { id: 'bm', country: 'egypt', name: 'Banque Misr', nameAr: 'بنك مصر', color: '#cc1e2c', logo: 'M' },
      { id: 'cib', country: 'egypt', name: 'CIB', nameAr: 'البنك التجاري الدولي', color: '#004a99', logo: 'C' },
      { id: 'nbe', country: 'egypt', name: 'National Bank of Egypt', nameAr: 'البنك الأهلي المصري', color: '#006a4d', logo: 'N' },
      { id: 'qnb_egypt', country: 'egypt', name: 'QNB Alahli', nameAr: 'كيو إن بي الأهلي', color: '#4d0011', logo: 'Q' },

      // Morocco
      { id: 'attijari', country: 'morocco', name: 'Attijariwafa Bank', nameAr: 'التجاري وفا بنك', color: '#ff6200', logo: 'A' },
      { id: 'bmce', country: 'morocco', name: 'Bank of Africa', nameAr: 'بنك أفريقيا', color: '#004a99', logo: 'B' },

      // USA
      { id: 'boa', country: 'usa', name: 'Bank of America', nameAr: 'بنك أوف أمريكا', color: '#012169', logo: 'B' },
      { id: 'chase', country: 'usa', name: 'Chase', nameAr: 'تشيس', color: '#117aca', logo: 'C' },
      { id: 'citi', country: 'usa', name: 'Citi', nameAr: 'سيتي بنك', color: '#003a70', logo: 'Ci' },
      { id: 'gs', country: 'usa', name: 'Goldman Sachs', nameAr: 'غولدمان ساكس', color: '#7299c6', logo: 'Gs' },
      { id: 'wells', country: 'usa', name: 'Wells Fargo', nameAr: 'ويلز فارجو', color: '#d71e28', logo: 'W' },

      // UK
      { id: 'barclays', country: 'uk', name: 'Barclays', nameAr: 'باركليز', color: '#00aeef', logo: 'B' },
      { id: 'hsbc_uk', country: 'uk', name: 'HSBC UK', nameAr: 'إتش إس بي سي', color: '#db0011', logo: 'H' },
      { id: 'lloyds', country: 'uk', name: 'Lloyds Bank', nameAr: 'بنك لويدز', color: '#006a4d', logo: 'L' },
      { id: 'monzo', country: 'uk', name: 'Monzo', nameAr: 'مونزو', color: '#ff4d4d', logo: 'M' },

      // Turkey
      { id: 'akbank', country: 'turkey', name: 'Akbank', nameAr: 'أك بنك', color: '#cc1e2c', logo: 'Ak' },
      { id: 'garanti', country: 'turkey', name: 'Garanti BBVA', nameAr: 'جارانتي', color: '#00a3e0', logo: 'G' },
      { id: 'isbank', country: 'turkey', name: 'İşbank', nameAr: 'بنك العمل', color: '#004a99', logo: 'İ' },

      // India
      { id: 'hdfc', country: 'india', name: 'HDFC Bank', nameAr: 'بنك إتش دي إف سي', color: '#004a99', logo: 'H' },
      { id: 'icici', country: 'india', name: 'ICICI Bank', nameAr: 'بنك آي سي آي سي آي', color: '#ff6200', logo: 'Ic' },
      { id: 'sbi', country: 'india', name: 'State Bank of India', nameAr: 'بنك الهند الحكومي', color: '#29a9e0', logo: 'S' },

      // Brazil
      { id: 'itau', country: 'brazil', name: 'Itaú', nameAr: 'إيتاو', color: '#ff6200', logo: 'I' },
      { id: 'nubank', country: 'brazil', name: 'Nubank', nameAr: 'نوبانك', color: '#820ad1', logo: 'N' },

      // Europe
      { id: 'bnp', country: 'france', name: 'BNP Paribas', nameAr: 'بي إن بي باريبا', color: '#00965e', logo: 'B' },
      { id: 'db', country: 'germany', name: 'Deutsche Bank', nameAr: 'دويتشه بنك', color: '#0018a8', logo: 'D' },
      { id: 'ing', country: 'germany', name: 'ING', nameAr: 'آي إن جي', color: '#ff6200', logo: 'I' },
      { id: 'santander', country: 'spain', name: 'Santander', nameAr: 'سانتاندير', color: '#ec0000', logo: 'S' },
      { id: 'ubs', country: 'germany', name: 'UBS', nameAr: 'يو بي إس', color: '#000000', logo: 'U' }
    ];
  }
  
  async getConnectedBanks(): Promise<ConnectedBank[]> {
    return ((await DB.getSetting('connectedBanks')) as ConnectedBank[] | undefined) || [];
  }

  getProvidersByCountry(countryId: string): BankProvider[] {
    return this.providers.filter((p) => p.country === countryId);
  }

  async connectBank(providerId: string): Promise<boolean> {
    const provider = this.providers.find((p) => p.id === providerId);
    if (!provider) throw new Error('Unsupported Provider');
    
    await new Promise((r) => setTimeout(r, 2000));
    
    const current = await this.getConnectedBanks();
    if (current.find((b) => b.id === providerId)) {
      toast(
        t('settings.bankDemoNotice') || 
        '💡 تنبيه أمني: هذا اتصال تجريبي ومحاكاة لأغراض العرض والتقييم فقط. لا يتم الاتصال الفعلي بحسابك المصرفي.\nSecurity Notice: This is a simulated demo connection. No actual link is established with your bank account.',
        'info'
      );
      return true;
    }

    const newConnection: ConnectedBank = {
      ...provider,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      status: 'active',
      isDemo: true
    };

    await DB.setSetting('connectedBanks', [...current, newConnection]);
    
    toast(
      t('settings.bankDemoNotice') || 
      '💡 تنبيه أمني: هذا اتصال تجريبي ومحاكاة لأغراض العرض والتقييم فقط. لا يتم الاتصال الفعلي بحسابك المصرفي.\nSecurity Notice: This is a simulated demo connection. No actual link is established with your bank account.',
      'info'
    );
    
    return true;
  }

  async disconnectBank(providerId: string): Promise<boolean> {
    const current = await this.getConnectedBanks();
    const updated = current.filter((b) => b.id !== providerId);
    await DB.setSetting('connectedBanks', updated);
    return true;
  }
}

export const openBanking = new OpenBankingService();
