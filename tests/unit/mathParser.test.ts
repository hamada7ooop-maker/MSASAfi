import { describe, it, expect } from 'vitest';
import { evaluateExpression } from '@/core/utils/mathParser';

describe('Safe Math Parser (mathParser)', () => {
  it('should evaluate simple addition and subtraction', () => {
    expect(evaluateExpression('5+3')).toBe(8);
    expect(evaluateExpression('10-4')).toBe(6);
    expect(evaluateExpression('100 - 50 + 20')).toBe(70);
  });

  it('should respect mathematical order of operations (MDAS)', () => {
    expect(evaluateExpression('2+3*4')).toBe(14);
    expect(evaluateExpression('20-10/2')).toBe(15);
    expect(evaluateExpression('2*3+4*5')).toBe(26);
  });

  it('should support parenthesized expressions', () => {
    expect(evaluateExpression('(2+3)*4')).toBe(20);
    expect(evaluateExpression('2*(3+4)*5')).toBe(70);
    expect(evaluateExpression('((2+3)*2)-2')).toBe(8);
  });

  it('should handle decimal numbers', () => {
    expect(evaluateExpression('5.5 + 4.5')).toBe(10);
    expect(evaluateExpression('10/4')).toBe(2.5);
    expect(evaluateExpression('0.1 * 0.2')).toBeCloseTo(0.02);
  });

  it('should support percentage calculations', () => {
    expect(evaluateExpression('50%')).toBe(0.5);
    expect(evaluateExpression('10 + 20%')).toBe(10.2);
    expect(evaluateExpression('(10+10)%')).toBe(0.2);
    expect(evaluateExpression('5 * 10%')).toBe(0.5);
  });

  it('should parse custom operators symbols like x and ÷', () => {
    expect(evaluateExpression('10 ÷ 2')).toBe(5);
    expect(evaluateExpression('5 × 4')).toBe(20);
    expect(evaluateExpression('10÷2 + 5×4')).toBe(25);
  });

  it('should block unsafe injections and invalid characters', () => {
    expect(() => evaluateExpression('alert(1)')).toThrow();
    expect(() => evaluateExpression('window.location')).toThrow();
    expect(() => evaluateExpression('eval("2+2")')).toThrow();
    expect(() => evaluateExpression('10 + console.log(1)')).toThrow();
  });

  it('should handle negative numbers correctly', () => {
    expect(evaluateExpression('-5 + 10')).toBe(5);
    expect(evaluateExpression('10 * -2')).toBe(-20);
    expect(evaluateExpression('-5 * -5')).toBe(25);
  });

  it('should throw error for division by zero', () => {
    expect(() => evaluateExpression('10/0')).toThrow();
  });

  it('should throw error for invalid mathematical syntax', () => {
    expect(() => evaluateExpression('5++3')).toThrow();
    expect(() => evaluateExpression('5+')).toThrow();
    expect(() => evaluateExpression('(5+3')).toThrow();
    expect(() => evaluateExpression('5+3)')).toThrow();
  });
});
