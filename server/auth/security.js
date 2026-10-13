const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
function checkSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('JWT secret must be at least 32 characters');
}
async function hashPassword(password) { return bcrypt.hash(password, 12); }
async function verifyPassword(password, hash) { return bcrypt.compare(password, hash); }
function issueToken(user, secret) {
  checkSecret(secret);
  return jwt.sign({ version: user.tokenVersion }, secret, { subject: String(user._id), algorithm: 'HS256', expiresIn: '8h', issuer: 'barbershop', audience: 'barbershop-web' });
}
function readToken(token, secret) {
  checkSecret(secret);
  return jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'barbershop', audience: 'barbershop-web' });
}
module.exports = { hashPassword, verifyPassword, issueToken, readToken };
