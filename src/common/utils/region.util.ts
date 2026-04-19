export type UserRegion = 'monterrey' | 'national';

export function detectRegion(waId: string): UserRegion {
  if (!waId) return 'national';

  // limpiar prefijos comunes de WhatsApp
  const clean = waId.replace('521', '').replace('52', '');

  if (clean.startsWith('81')) {
    return 'monterrey';
  }

  return 'national';
}
