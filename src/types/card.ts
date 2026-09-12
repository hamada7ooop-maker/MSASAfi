/**
 * Represents a bank card (credit/debit/prepaid)
 */
export interface BankCard {
  id: string;
  number: string;        // Stored encrypted or masked
  numberMasked: string;  // Last 4 digits: e.g. "•••• •••• •••• 1234"
  holder: string;
  expiry: string;        // MM/YY format
  bankId: string;        // Unique identifier for provider
  bankName: string;
  bankColor?: string;
  bankLogo?: string;
  countryId: string;
  countryName: string;
  countryFlag: string;
  style: {
    bgType: 'gradient' | 'glass' | 'solid' | (string & {});
    gradientName: string;
    glowColor?: string;
    textColor?: string;
  };
  createdAt?: string | number;
  isDemo?: number;
}
