import crypto from "crypto";

// RSA Encryption Parameters
const ALGORITHM = "rsa";

function generateHash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}
// Function to generate a secure registration code (key) using crypto library
function generateRegistrationCode(length = 24) {
  // Generate a random buffer of the specified length (in bytes)
  const buffer = crypto.randomBytes(Math.ceil(length / 2));
  // Convert the buffer into a hex string and truncate or pad it to the required length
  const registrationCode = buffer.toString("hex").slice(0, length);
  return registrationCode;
}

/**
 * Function to hash data (string or object) using a registration code.
 * @param {string|object} data - The data to be hashed (can be a string or an object).
 * @param {string} registrationCode - The key used to hash the data.
 * @returns {string} - The hashed value in hex format.
 */
function hashDataWithKey(data, registrationCode) {
  // Convert object to a string if the input is an object
  const dataString = typeof data === "object" ? JSON.stringify(data) : data;

  // Create an HMAC using the registration code as the key
  const hash = crypto.createHmac("sha256", registrationCode);

  // Update the hash with the data
  hash.update(dataString);

  // Return the hashed value in hexadecimal format
  return hash.digest("hex");
}

const generateKeyPair = () => {
  // Generate RSA key pair (private and public keys)
  const { publicKey, privateKey } = crypto.generateKeyPairSync(ALGORITHM, {
    modulusLength: 2048, // 2048-bit key size
    publicKeyEncoding: {
      type: "spki", // PKCS#8 format for public key
      format: "pem", // PEM format for public key
    },
    privateKeyEncoding: {
      type: "pkcs8", // PKCS#8 format for private key
      format: "pem", // PEM format for private key
    },
  });
  return { publicKey, privateKey };
};

// Function to encrypt data using RSA Public Key
const encryptData = (data, publicKey) => {
  try {
    const bufferData = Buffer.from(JSON.stringify(data)); // Convert data to a Buffer
    const encryptedData = crypto.publicEncrypt(publicKey, bufferData); // Encrypt data using public key
    return encryptedData.toString("base64"); // Return as Base64 encoded string
  } catch (error) {
    throw new Error("Error encrypting data: " + error.message);
  }
};

// Function to decrypt data using RSA Private Key
const decryptData = (encryptedData, privateKey) => {
  try {
    const bufferData = Buffer.from(encryptedData, "base64"); // Convert from Base64 string to Buffer
    const decryptedData = crypto.privateDecrypt(privateKey, bufferData); // Decrypt data using private key
    return JSON.parse(decryptedData.toString()); // Convert decrypted data back to JSON object
  } catch (error) {
    throw new Error("Error decrypting data: " + error.message);
  }
};

export {
  generateHash,
  generateRegistrationCode,
  generateKeyPair,
  encryptData,
  decryptData,
  hashDataWithKey,
};
