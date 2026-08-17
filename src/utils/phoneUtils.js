export function displayPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+91') && trimmed.length === 13) {
    return trimmed.slice(3);
  }
  return trimmed;
}

export function isValidIndiaPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  return /^[6-9]\d{9}$/.test(cleaned);
}
