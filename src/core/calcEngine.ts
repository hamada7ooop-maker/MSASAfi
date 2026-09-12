interface OperatorDef {
  p: number;
  a: 'L' | 'R';
  fn: (a: number, b: number) => number;
}

const OPS: Record<string, OperatorDef> = {
  '+': { p: 1, a: 'L', fn: (a, b) => a + b },
  '-': { p: 1, a: 'L', fn: (a, b) => a - b },
  '*': { p: 2, a: 'L', fn: (a, b) => a * b },
  '/': { p: 2, a: 'L', fn: (a, b) => a / b },
};

type Token = number | string;

function tokenize(expr: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[+\-*/()]/.test(ch)) {
      const prev = out[out.length - 1];
      const isUnaryMinus = ch === '-' && (!prev || (typeof prev === 'string' && prev !== ')'));
      if (isUnaryMinus) {
        let j = i + 1;
        let num = '-';
        while (j < expr.length && /[\d.]/.test(expr[j])) {
          num += expr[j];
          j += 1;
        }
        if (num !== '-') {
          out.push(Number(num));
          i = j;
          continue;
        }
      }
      out.push(ch);
      i += 1;
      continue;
    }
    if (/[\d.]/.test(ch)) {
      let j = i;
      let num = '';
      while (j < expr.length && /[\d.]/.test(expr[j])) {
        num += expr[j];
        j += 1;
      }
      out.push(Number(num));
      i = j;
      continue;
    }
    throw new Error('Invalid token');
  }
  return out;
}

function toRpn(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: string[] = [];
  for (const tk of tokens) {
    if (typeof tk === 'number' && Number.isFinite(tk)) {
      out.push(tk);
      continue;
    }
    const strTk = String(tk);
    if (strTk in OPS) {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (!(top in OPS)) break;
        const c1 = OPS[strTk];
        const c2 = OPS[top];
        if ((c1.a === 'L' && c1.p <= c2.p) || (c1.a === 'R' && c1.p < c2.p)) {
          const popped = stack.pop();
          if (popped) out.push(popped);
        } else {
          break;
        }
      }
      stack.push(strTk);
      continue;
    }
    if (strTk === '(') {
      stack.push(strTk);
      continue;
    }
    if (strTk === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') {
        const popped = stack.pop();
        if (popped) out.push(popped);
      }
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop();
    }
  }
  while (stack.length) {
    const op = stack.pop();
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses');
    if (op) out.push(op);
  }
  return out;
}

function evalRpn(rpn: Token[]): number {
  const stack: number[] = [];
  for (const tk of rpn) {
    if (typeof tk === 'number') {
      stack.push(tk);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error('Malformed expression');
    }
    const opDef = OPS[tk];
    if (!opDef) throw new Error('Unknown operator');
    stack.push(opDef.fn(a, b));
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Malformed expression');
  return stack[0];
}

export function evaluateExpression(raw: string | number | null | undefined): number {
  const expr = String(raw || '').replace(/×/g, '*').replace(/÷/g, '/');
  if (!expr.trim()) return 0;
  const tokens = tokenize(expr);
  return evalRpn(toRpn(tokens));
}
