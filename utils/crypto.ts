import { roundTo } from './helpers';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

export interface EncryptedData {
  iv: string;
  data: string;
  tag: string;
}

const getEncryptionKey = async (): Promise<CryptoKey> => {
  // C2 fix: Use sessionStorage instead of localStorage to prevent long-term persistence of the key.
  const storedKey = sessionStorage.getItem('atlas_encryption_key');

  if (storedKey) {
    const keyBuffer = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyArray = new Uint8Array(exportedKey);
  sessionStorage.setItem('atlas_encryption_key', btoa(String.fromCharCode(...keyArray)));

  return key;
};

export const encryptData = async (plaintext: string): Promise<EncryptedData> => {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encodedData = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encodedData
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  const data = encryptedArray.slice(0, -16);
  const tag = encryptedArray.slice(-16);

  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...data)),
    tag: btoa(String.fromCharCode(...tag))
  };
};

export const decryptData = async (encrypted: EncryptedData): Promise<string> => {
  const key = await getEncryptionKey();

  const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encrypted.data), c => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(encrypted.tag), c => c.charCodeAt(0));

  const combined = new Uint8Array([...data, ...tag]);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    combined
  );

  return new TextDecoder().decode(decryptedBuffer);
};

export const encryptPortfolioData = async (data: object): Promise<string> => {
  const plaintext = JSON.stringify(data);
  const encrypted = await encryptData(plaintext);
  return JSON.stringify(encrypted);
};

export const decryptPortfolioData = async (encryptedString: string): Promise<object | null> => {
  try {
    const encrypted = JSON.parse(encryptedString) as EncryptedData;
    const plaintext = await decryptData(encrypted);
    return JSON.parse(plaintext);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateSecureId = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

export const isEncryptionAvailable = (): boolean => {
  return typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues === 'function';
};

export const clearEncryptionKey = (): void => {
  sessionStorage.removeItem('atlas_encryption_key');
};

export interface DataChecksum {
  algorithm: string;
  value: string;
}

export const calculateChecksum = async (data: string): Promise<DataChecksum> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    algorithm: 'SHA-256',
    value: hashString
  };
};

export const verifyDataIntegrity = async (
  data: string,
  expectedChecksum: DataChecksum
): Promise<boolean> => {
  const actualChecksum = await calculateChecksum(data);
  return actualChecksum.value === expectedChecksum.value;
};
