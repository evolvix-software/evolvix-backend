/**
 * Encryption utilities for sensitive KYC documents
 * Uses AES-256 encryption for document storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

// Get encryption key from environment or use a default (should be set in production)
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32-chars';
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  return crypto.scryptSync(key, 'salt', 32);
};

/**
 * Encrypt sensitive data (e.g., document URLs, account numbers)
 */
export const encrypt = (text: string): string => {
  if (!text) return text;
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted data
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return encryptedText;
  
  try {
    const key = getEncryptionKey();
    const data = Buffer.from(encryptedText, 'base64');
    
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.subarray(ENCRYPTED_POSITION);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error('Failed to decrypt data. Invalid encrypted text or key.');
  }
};

/**
 * Hash sensitive data (one-way, for comparison)
 */
export const hash = (text: string): string => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

