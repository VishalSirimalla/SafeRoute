function normalizeIndiaPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Remove whitespace, hyphens, parentheses, etc.
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Validate 10-digit Indian mobile number starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return null;
  }

  return `+91${cleaned}`;
}

function displayPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+91') && trimmed.length === 13) {
    return trimmed.slice(3);
  }
  return trimmed;
}

module.exports = {
  normalizeIndiaPhone,
  displayPhone,
};
