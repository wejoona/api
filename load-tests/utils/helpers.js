/**
 * Shared helper functions for load tests
 */

import http from 'k6/http';

/**
 * Generate West African phone number
 * @param {string} countryCode - CI, SN, ML, etc.
 * @returns {string} Phone number
 */
export function generatePhoneNumber(countryCode = 'CI') {
  const prefixes = {
    CI: '+225', // Côte d'Ivoire
    SN: '+221', // Senegal
    ML: '+223', // Mali
    BF: '+226', // Burkina Faso
    NE: '+227', // Niger
    TG: '+228', // Togo
    BJ: '+229', // Benin
  };

  const prefix = prefixes[countryCode] || '+225';
  const number = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

  return `${prefix}${number}`;
}

/**
 * Generate West African name
 * @returns {object} { firstName, lastName }
 */
export function generateName() {
  const firstNames = [
    'Amadou', 'Fatou', 'Moussa', 'Aissata', 'Ibrahim', 'Mariama',
    'Ousmane', 'Fatoumata', 'Mamadou', 'Aminata', 'Sekou', 'Aisha',
    'Abdoulaye', 'Kadiatou', 'Boubacar', 'Mariam', 'Souleymane', 'Safiatou',
  ];

  const lastNames = [
    'Diallo', 'Traore', 'Kone', 'Coulibaly', 'Toure', 'Diop',
    'Sow', 'Kane', 'Fofana', 'Kante', 'Cisse', 'Bamba',
    'Dembele', 'Sylla', 'Diarra', 'Keita', 'Camara', 'Savane',
  ];

  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
  };
}

/**
 * Authenticate a user and return tokens
 * @param {string} baseUrl - Base API URL
 * @param {string} phone - Phone number
 * @param {string} countryCode - Country code
 * @returns {object|null} { accessToken, refreshToken }
 */
export function authenticateUser(baseUrl, phone, countryCode = 'CI') {
  // Register
  const registerPayload = JSON.stringify({
    phone: phone,
    countryCode: countryCode,
  });

  const registerResponse = http.post(
    `${baseUrl}/auth/register`,
    registerPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (![200, 201].includes(registerResponse.status)) {
    return null;
  }

  // Verify OTP
  const verifyPayload = JSON.stringify({
    phone: phone,
    otp: '123456', // Dev OTP
  });

  const verifyResponse = http.post(
    `${baseUrl}/auth/verify-otp`,
    verifyPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (verifyResponse.status === 200) {
    try {
      const body = JSON.parse(verifyResponse.body);
      return {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      };
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Generate random amount in specified range
 * @param {number} min - Minimum amount
 * @param {number} max - Maximum amount
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted amount
 */
export function randomAmount(min = 10, max = 1000, decimals = 2) {
  const amount = Math.random() * (max - min) + min;
  return amount.toFixed(decimals);
}

/**
 * Generate random XOF amount (whole numbers)
 * @param {number} min - Minimum amount
 * @param {number} max - Maximum amount
 * @returns {string} Amount in XOF
 */
export function randomXOFAmount(min = 5000, max = 100000) {
  return String(Math.floor(Math.random() * (max - min) + min));
}

/**
 * Generate mock PIN token
 * @param {string} accessToken - User access token
 * @returns {string} Mock PIN token
 */
export function generateMockPinToken(accessToken) {
  return `mock_pin_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate random Ethereum address
 * @returns {string} Ethereum address
 */
export function generateEthAddress() {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

/**
 * Generate random date of birth
 * @param {number} minAge - Minimum age
 * @param {number} maxAge - Maximum age
 * @returns {string} Date in YYYY-MM-DD format
 */
export function generateDateOfBirth(minAge = 18, maxAge = 65) {
  const year = new Date().getFullYear() - Math.floor(Math.random() * (maxAge - minAge) + minAge);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Sleep with jitter for more realistic traffic patterns
 * @param {number} baseMs - Base sleep time in milliseconds
 * @param {number} jitterMs - Maximum jitter in milliseconds
 * @returns {number} Total sleep time
 */
export function sleepWithJitter(baseMs, jitterMs = 1000) {
  const jitter = Math.random() * jitterMs;
  const total = baseMs + jitter;
  return total / 1000; // Convert to seconds for k6 sleep
}

/**
 * Weighted random choice
 * @param {object} choices - Object with choice: weight pairs
 * @returns {string} Selected choice
 */
export function weightedRandom(choices) {
  const total = Object.values(choices).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;

  for (const [choice, weight] of Object.entries(choices)) {
    random -= weight;
    if (random <= 0) {
      return choice;
    }
  }

  return Object.keys(choices)[0];
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes
 * @returns {string} Formatted size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calculate percentile
 * @param {array} values - Array of numbers
 * @param {number} percentile - Percentile (0-100)
 * @returns {number} Percentile value
 */
export function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;

  return sorted[index];
}

/**
 * Build authorization headers
 * @param {string} accessToken - JWT access token
 * @returns {object} Headers object
 */
export function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
}

/**
 * Check if response is successful
 * @param {object} response - k6 response object
 * @param {array} validStatuses - Valid status codes
 * @returns {boolean} Success status
 */
export function isSuccessful(response, validStatuses = [200, 201]) {
  return validStatuses.includes(response.status);
}

/**
 * Parse JSON response safely
 * @param {object} response - k6 response object
 * @returns {object|null} Parsed body or null
 */
export function parseResponse(response) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    return null;
  }
}

/**
 * Log error with context
 * @param {string} operation - Operation name
 * @param {object} response - k6 response object
 */
export function logError(operation, response) {
  console.error(`[${operation}] Failed: ${response.status} - ${response.body}`);
}

/**
 * Generate random transaction note
 * @returns {string} Transaction note
 */
export function generateTransactionNote() {
  const notes = [
    'Payment for services',
    'Lunch money',
    'Rent payment',
    'School fees',
    'Medical expenses',
    'Grocery shopping',
    'Phone credit',
    'Transportation',
    'Birthday gift',
    'Emergency fund',
    'Family support',
    'Business payment',
  ];

  return notes[Math.floor(Math.random() * notes.length)];
}

export default {
  generatePhoneNumber,
  generateName,
  authenticateUser,
  randomAmount,
  randomXOFAmount,
  generateMockPinToken,
  generateEthAddress,
  generateDateOfBirth,
  sleepWithJitter,
  weightedRandom,
  formatBytes,
  calculatePercentile,
  authHeaders,
  isSuccessful,
  parseResponse,
  logError,
  generateTransactionNote,
};
