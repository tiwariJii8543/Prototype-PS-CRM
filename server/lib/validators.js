function isNonEmptyString(value, min = 1, max = 1000) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function isValidMobile(value) {
  return /^\d{10}$/.test(String(value || '').trim());
}

function isValidUsername(value) {
  return /^[a-zA-Z0-9_]{4,30}$/.test(String(value || '').trim());
}

function isSafeUrl(value) {
  return typeof value === 'string' && /^https?:\/\/.+/i.test(value.trim());
}

function isValidCoordinate(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function rejectValidation(res, message) {
  return res.status(400).json({ message });
}

module.exports = {
  isNonEmptyString,
  isValidMobile,
  isValidUsername,
  isSafeUrl,
  isValidCoordinate,
  rejectValidation
};
