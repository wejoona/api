// CJS mock for nanoid (ESM package)
const { randomBytes } = require('crypto');

function nanoid(size = 21) {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';
  const bytes = randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

function customAlphabet(alphabet, defaultSize = 21) {
  return (size = defaultSize) => {
    const bytes = randomBytes(size);
    let id = '';
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
  };
}

module.exports = { nanoid, customAlphabet };
