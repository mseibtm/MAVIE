/**
 * Utilities for Brazilian CPF / CNPJ validation and formatting
 */

export function cleanCPF(doc: string): string {
  return (doc || '').replace(/\D/g, '');
}

export function cleanCpfCnpj(doc: string): string {
  return cleanCPF(doc);
}

export function formatCNPJ(cnpj: string): string {
  const digits = cleanCPF(cnpj).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function formatCPF(cpf: string): string {
  const digits = cleanCPF(cpf);
  if (digits.length > 11) {
    return formatCNPJ(digits);
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCpfCnpj(doc: string): string {
  return formatCPF(doc);
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = cleanCPF(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

export function validateCPF(cpf: string): boolean {
  const clean = cleanCPF(cpf);
  if (clean.length === 14) {
    return validateCNPJ(clean);
  }
  if (clean.length !== 11) return false;
  
  // Reject repetitive digits (e.g. 111.111.111-11)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false;

  return true;
}

export function validateCpfCnpj(doc: string): boolean {
  return validateCPF(doc);
}

export function generateRandomBarcode(): string {
  const bank = '341'; // Itaú
  const currency = '9';
  const factor = Math.floor(1000 + Math.random() * 8000).toString();
  const value = Math.floor(10000 + Math.random() * 900000).toString().padStart(10, '0');
  const freeField = Array.from({ length: 25 }, () => Math.floor(Math.random() * 10)).join('');
  return `${bank}${currency}${factor}${value}${freeField}`;
}

export function generateDigitableLine(barcode?: string): string {
  // Returns standard formatted Brazilian line digitable: 34191.70007 01234.567890 12345.678901 8 91230000050000
  const p1 = Math.floor(10000 + Math.random() * 90000).toString() + '.' + Math.floor(10000 + Math.random() * 90000).toString();
  const p2 = Math.floor(10000 + Math.random() * 90000).toString() + '.' + Math.floor(100000 + Math.random() * 900000).toString();
  const p3 = Math.floor(10000 + Math.random() * 90000).toString() + '.' + Math.floor(100000 + Math.random() * 900000).toString();
  const p4 = '8';
  const p5 = Math.floor(10000000000000 + Math.random() * 89999999999999).toString();
  return `${p1} ${p2} ${p3} ${p4} ${p5}`;
}

export function generateNFeAccessKey(): string {
  // 44 digits NFe Key
  const uf = '35'; // SP
  const yearMonth = '2608';
  const cnpj = '12345678000195';
  const model = '55';
  const series = '001';
  const number = Math.floor(100000 + Math.random() * 900000).toString();
  const type = '1';
  const code = Math.floor(10000000 + Math.random() * 90000000).toString();
  const dv = Math.floor(Math.random() * 9).toString();
  return `${uf}${yearMonth}${cnpj}${model}${series}${number}${type}${code}${dv}`;
}
