import nacl from 'tweetnacl';

// Base64 utility for browser environment
const toBase64 = (buf: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < buf.byteLength; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return globalThis.btoa(binary);
};

const fromBase64 = (str: string): Uint8Array => {
  const binary = globalThis.atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export interface Contact {
  name: string;
  publicKey: string;
}

const STORAGE_KEY_PREFIX = 'secure_chat_tool_';
const PBKDF2_ITERATIONS = 310_000;

type StoredKeyData = {
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  nonce: string;
  encrypted: string;
};

const deriveEncryptionKey = async (
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<Uint8Array> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const keyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    keyMaterial,
    256
  );

  return new Uint8Array(keyBits);
};

export const saveKeyEncrypted = async (keyData: string, password: string): Promise<void> => {
  try {
    const salt = nacl.randomBytes(16);
    const keyBytes = await deriveEncryptionKey(password, salt);
    const nonce = nacl.randomBytes((nacl.secretbox as any).nonceLength);
    
    const encryptedData = (nacl.secretbox as any)(
      new TextEncoder().encode(keyData),
      nonce,
      new Uint8Array(keyBytes)
    );

    const fullData: StoredKeyData = {
      kdf: 'PBKDF2-SHA-256',
      iterations: PBKDF2_ITERATIONS,
      salt: toBase64(salt),
      nonce: toBase64(nonce),
      encrypted: toBase64(encryptedData)
    };

    localStorage.setItem(STORAGE_KEY_PREFIX + 'private_key', JSON.stringify(fullData));
  } catch (error) {
    throw new Error("鍵の暗号化に失敗しました: " + (error instanceof Error ? error.message : ''));
  }
};

export const loadKeyEncrypted = async (password: string): Promise<string | null> => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY_PREFIX + 'private_key');
    if (!storedData) {
      return null;
    }

    const fullData = JSON.parse(storedData) as StoredKeyData;
    if (fullData.kdf !== 'PBKDF2-SHA-256' || typeof fullData.iterations !== 'number') {
      throw new Error("保存済みの鍵形式が古いため読み込めません。新しい鍵ペアを生成してください。");
    }

    const salt = fromBase64(fullData.salt);
    const keyBytes = await deriveEncryptionKey(password, salt, fullData.iterations);
    const nonce = fromBase64(fullData.nonce);
    const encrypted = fromBase64(fullData.encrypted);

    const decryptedData = (nacl.secretbox as any).open(
      encrypted,
      nonce,
      new Uint8Array(keyBytes)
    );

    if (!decryptedData) {
      throw new Error("復号化に失敗しました。パスワードが間違っている可能性があります。");
    }

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    throw new Error("鍵の復号化に失敗しました: " + (error instanceof Error ? error.message : ''));
  }
};

export const clearStoredKey = (): void => {
  localStorage.removeItem(STORAGE_KEY_PREFIX + 'private_key');
};

export const hasStoredKey = (): boolean => {
  return localStorage.getItem(STORAGE_KEY_PREFIX + 'private_key') !== null;
};

export const saveContact = (contact: Contact): void => {
  const contacts = getAllContacts();
  const existing = contacts.findIndex(c => c.publicKey === contact.publicKey);
  if (existing >= 0) {
    contacts[existing] = contact;
  } else {
    contacts.push(contact);
  }
  localStorage.setItem(STORAGE_KEY_PREFIX + 'contacts', JSON.stringify(contacts));
};

export const getAllContacts = (): Contact[] => {
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'contacts');
  return stored ? JSON.parse(stored) : [];
};

export const deleteContact = (publicKey: string): void => {
  const contacts = getAllContacts();
  const filtered = contacts.filter(c => c.publicKey !== publicKey);
  localStorage.setItem(STORAGE_KEY_PREFIX + 'contacts', JSON.stringify(filtered));
};

export const saveMessage = (message: {
  id: string;
  senderPublicKey: string;
  senderName: string;
  receiverPublicKey: string;
  encryptedData: string;
  timestamp: number;
}): void => {
  const messages = getAllMessages();
  messages.push(message);
  localStorage.setItem(STORAGE_KEY_PREFIX + 'messages', JSON.stringify(messages));
};

export const getAllMessages = (): Array<{
  id: string;
  senderPublicKey: string;
  senderName: string;
  receiverPublicKey: string;
  encryptedData: string;
  timestamp: number;
}> => {
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'messages');
  return stored ? JSON.parse(stored) : [];
};

export const deleteMessage = (messageId: string): void => {
  const messages = getAllMessages();
  const filtered = messages.filter((m: any) => m.id !== messageId);
  localStorage.setItem(STORAGE_KEY_PREFIX + 'messages', JSON.stringify(filtered));
};

export const clearAllData = (): void => {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
};
