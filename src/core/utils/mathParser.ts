/**
 * mathParser.ts
 * 
 * Safe mathematical expression evaluator.
 * Strictly parses and calculates mathematical expressions without using eval() or new Function().
 * Supports: +, -, *, /, (, ), and %
 */

export function evaluateExpression(expr: string): number {
  // Replace characters for standard math symbols and clean spaces
  const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  
  // Strict character whitelist check to prevent potential script injection
  if (/[^0-9+\-*/().%]/.test(sanitized)) {
    throw new Error('Invalid characters in expression');
  }

  // 1. Check parenthesis matching
  let openCount = 0;
  for (const c of sanitized) {
    if (c === '(') {
      openCount++;
    } else if (c === ')') {
      openCount--;
      if (openCount < 0) {
        throw new Error('Unmatched parentheses');
      }
    }
  }
  if (openCount !== 0) {
    throw new Error('Unmatched parentheses');
  }

  // 2. Check that expression does not end with an operator
  if (/[+\-*/]$/.test(sanitized)) {
    throw new Error('Expression cannot end with an operator');
  }

  // 3. Block invalid operator sequences
  // We can allow double operators only if the second is a minus (unary negative), e.g. 5*-3 or 5+-3
  // But block ++, --, +*, +/, *+, /+, **, //, etc.
  if (/[+\-*/]{2,}/.test(sanitized)) {
    if (/[+\-*/][+*/]/.test(sanitized) || /[+\-*/]{3,}/.test(sanitized) || /\+\+/.test(sanitized) || /--/.test(sanitized)) {
      throw new Error('Invalid operator sequence');
    }
  }

  let index = 0;

  function peek(): string {
    return index < sanitized.length ? sanitized[index] : '';
  }

  function consume(): string {
    return index < sanitized.length ? sanitized[index++] : '';
  }

  // Parse a primary factor (numbers, parentheses, or unary operators)
  function parsePrimary(): number {
    const char = peek();
    if (char === '(') {
      consume(); // consume '('
      const result = parseExpression();
      if (peek() === ')') {
        consume(); // consume ')'
      }
      // Handle percentage immediately after parenthesis, e.g., (2+3)%
      if (peek() === '%') {
        consume();
        return result / 100;
      }
      return result;
    }

    if (char === '-') {
      consume();
      return -parsePrimary();
    }
    if (char === '+') {
      consume();
      return parsePrimary();
    }


    let numStr = '';
    // Match digits and decimal points
    while (/[0-9.]/.test(peek())) {
      numStr += consume();
    }

    if (numStr === '') {
      throw new Error('Expected number');
    }

    let val = parseFloat(numStr);
    
    // Percentage operator directly attached to a number, e.g., 5%
    if (peek() === '%') {
      consume();
      val = val / 100;
    }

    return val;
  }

  // Parse multiplicative operations (*, /)
  function parseMultiplicative(): number {
    let left = parsePrimary();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parsePrimary();
      if (op === '*') {
        left *= right;
      } else {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        left /= right;
      }
    }
    return left;
  }

  // Parse additive operations (+, -)
  function parseExpression(): number {
    let left = parseMultiplicative();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseMultiplicative();
      if (op === '+') {
        left += right;
      } else {
        left -= right;
      }
    }
    return left;
  }

  try {
    const finalResult = parseExpression();
    if (index < sanitized.length) {
      throw new Error('Extraneous characters at end of expression');
    }
    if (isNaN(finalResult) || !isFinite(finalResult)) {
      throw new Error('Invalid math result');
    }
    return finalResult;
  } catch (e) {
    throw new Error('Invalid expression', { cause: e });
  }
}
