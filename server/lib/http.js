function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function string(value, label, max = 80) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, 'Invalid ' + label);
  return value.trim();
}
function password(value) {
  if (typeof value !== 'string' || value.length < 10 || Buffer.byteLength(value) > 72) fail(400, 'Password must be 10 characters or longer and at most 72 bytes');
  return value;
}
function email(value) {
  const normalized = string(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) fail(400, 'Invalid email');
  return normalized;
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, 'Invalid record ID');
  return value;
}
function pagination(query) {
  const page = Number(query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) fail(400, 'Invalid page');
  return { page, limit: 10, skip: (page - 1) * 10 };
}
function literalSearch(value) { return String(value || '').slice(0,80).replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&'); }
module.exports = { fail, string, password, email, id, pagination, literalSearch };
