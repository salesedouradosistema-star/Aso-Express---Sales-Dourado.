/**
 * Formatting and helper functions for Brazilian medical & occupational documents
 */

export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

export function maskDateBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.replace(/(\d{2})(\d{1,2})/, '$1/$2');
  return digits.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
}

export function parseBRDateToISO(dateBR: string): string {
  if (!dateBR) return '';
  const digits = dateBR.replace(/\D/g, '');
  if (digits.length === 8) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    return `${year}-${month}-${day}`;
  }
  return dateBR;
}

export function calculateAge(birthDateString: string): number | undefined {
  if (!birthDateString) return undefined;
  let str = birthDateString;
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      str = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  const birth = new Date(str);
  if (isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : undefined;
}

export function calculateIMC(weightKg: string, heightCm: string): string {
  const w = parseFloat(weightKg.replace(',', '.'));
  const h = parseFloat(heightCm.replace(',', '.')) / 100;
  if (!w || !h || h <= 0) return '';
  const imc = w / (h * h);
  return imc.toFixed(1);
}

export function formatDateBR(dateString: string): string {
  if (!dateString) return '';
  // dateString is typically YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function formatLongDate(dateString: string, city = 'São Paulo - SP'): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;

  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];

  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  const monthName = months[monthIdx] || '';
  return `${city}, ${day} de ${monthName} de ${year}`;
}
