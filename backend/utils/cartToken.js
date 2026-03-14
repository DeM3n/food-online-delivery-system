const crypto = require('crypto');

const GUEST_CART_TTL_DAYS = parseInt(process.env.GUEST_CART_TTL_DAYS || '7', 10);

const generateGuestCartToken = () => crypto.randomBytes(48).toString('hex');

const hashGuestCartToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const getGuestCartExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + GUEST_CART_TTL_DAYS);
  return expiresAt;
};

module.exports = {
  GUEST_CART_TTL_DAYS,
  generateGuestCartToken,
  hashGuestCartToken,
  getGuestCartExpiryDate
};
