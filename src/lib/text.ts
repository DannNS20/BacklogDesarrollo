export const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? '';

export const initialsOf = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

export const onlyDigits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);
