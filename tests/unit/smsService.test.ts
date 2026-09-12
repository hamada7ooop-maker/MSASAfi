import { describe, it, expect } from 'vitest';
import { parseSMS } from '../../src/services/smsService';

describe('SMSParser Unit Tests', () => {
  it('should parse Saudi bank expense SMS in Arabic', () => {
    const sms = 'شراء بقيمة 150.75 ريال لدى بنده بتاريخ 2026/05/20 عبر بطاقة مدى';
    const result = parseSMS(sms);

    expect(result).not.toBeNull();
    expect(result?.amount).toBe(150.75);
    expect(result?.type).toBe('expense');
    expect(result?.description).toContain('بنده');
  });

  it('should parse deposit / salary SMS as income', () => {
    const sms = 'تم إيداع مبلغ 12500.00 ريال راتب في حسابك لدى مصرف الراجحي';
    const result = parseSMS(sms);

    expect(result).not.toBeNull();
    expect(result?.amount).toBe(12500);
    expect(result?.type).toBe('income');
  });

  it('should parse English bank SMS', () => {
    const sms = 'Purchase of USD 45.50 at Amazon on 2026-05-18 with Card ending 1234';
    const result = parseSMS(sms);

    expect(result).not.toBeNull();
    expect(result?.amount).toBe(45.50);
    expect(result?.type).toBe('expense');
    expect(result?.description).toContain('Amazon');
  });

  it('should return null for short or invalid SMS', () => {
    expect(parseSMS('')).toBeNull();
    expect(parseSMS('Hi')).toBeNull();
  });
});
