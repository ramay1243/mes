export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function normalizePhone(phone: string): string {
  // Убираем все нецифровые символы
  return phone.replace(/\D/g, '')
}

export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  // Форматируем как +7 (XXX) XXX-XX-XX
  if (normalized.length === 11 && normalized.startsWith('7')) {
    return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9)}`
  }
  return phone
}

