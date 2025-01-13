const crypto = require("crypto");

/**
 * Generate a hash for a given input without using a salt.
 * @param {string} data - The data to hash.
 * @returns {string} - The hashed value.
 */
function generateHash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate an RSA key pair.
 * @returns {{ publicKey: string, privateKey: string }} - The key pair.
 */
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

/**
 * Encrypt data using the public key.
 * @param {object|string} data - The data to encrypt (either object or string).
 * @param {string} publicKey - The public key.
 * @returns {string} - The encrypted data (base64 encoded).
 */
function encryptData(data, publicKey) {
  // If the data is an object, convert it to a JSON string
  if (typeof data === "object") {
    data = JSON.stringify(data);
  }

  // Encrypt the data
  return crypto.publicEncrypt(publicKey, Buffer.from(data)).toString("base64");
}

/**
 * Decrypt data using the private key.
 * @param {string} encryptedData - The encrypted data (base64 encoded).
 * @param {string} privateKey - The private key.
 * @returns {string} - The decrypted data.
 */
function decryptData(encryptedData, privateKey) {
  return crypto
    .privateDecrypt(privateKey, Buffer.from(encryptedData, "base64"))
    .toString("utf-8");
}

module.exports = { generateHash, generateKeyPair, encryptData, decryptData };
