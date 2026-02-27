import crypto from 'crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function derive(password: string, salt: string) {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = derive(password, salt).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${derived}`;
}

export function isHashedPassword(stored: string) {
  return stored.startsWith(`${SCRYPT_PREFIX}$`);
}

export function verifyPassword(password: string, stored: string) {
  if (!isHashedPassword(stored)) {
    return password === stored;
  }

  const parts = stored.split('$');
  if (parts.length !== 3) return false;

  const salt = parts[1];
  const expectedHex = parts[2];

  const expected = Buffer.from(expectedHex, 'hex');
  const received = derive(password, salt);

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}
