import nacl from 'tweetnacl';

export interface EncryptedPacket {
  alg: 'X25519+XSalsa20-Poly1305+Ed25519';
  epk: string;
  nonce: string;
  ct: string;
  sig: string;
  senderPub: string;
}

type PublicKeyBundle = {
  v: 2;
  boxPub: string;
  signPub: string;
};

type PrivateKeyBundle = {
  v: 2;
  boxSecret: string;
  signSecret: string;
};

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

const decodeBase64Json = <T>(value: string): T | null => {
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64(value))) as T;
  } catch {
    return null;
  }
};

const encodeBase64Json = (value: unknown): string => (
  toBase64(new TextEncoder().encode(JSON.stringify(value)))
);

const parsePublicKey = (publicKeyBase64: string): {
  boxPublicKey: Uint8Array;
  signingPublicKey: Uint8Array;
  normalizedPublicKey: string;
} => {
  const bundle = decodeBase64Json<PublicKeyBundle>(publicKeyBase64);

  if (bundle?.v !== 2 || !bundle.boxPub || !bundle.signPub) {
    throw new Error("Invalid public key format");
  }

  return {
    boxPublicKey: fromBase64(bundle.boxPub),
    signingPublicKey: fromBase64(bundle.signPub),
    normalizedPublicKey: publicKeyBase64,
  };
};

const signingPayload = (packet: Omit<EncryptedPacket, 'sig'>): Uint8Array => (
  new TextEncoder().encode(JSON.stringify({
    alg: packet.alg,
    epk: packet.epk,
    nonce: packet.nonce,
    ct: packet.ct,
    senderPub: packet.senderPub,
  }))
);

type DecryptResult = {
  message: string;
  senderPub: string;
};

export class CryptoService {
  private keyPair: any;
  private signingKeyPair: any;
  private publicKeyBase64: string;

  constructor(privateKeyBase64?: string) {
    if (privateKeyBase64) {
      try {
        const privateBundle = decodeBase64Json<PrivateKeyBundle>(privateKeyBase64);

        if (privateBundle?.v !== 2 || !privateBundle.boxSecret || !privateBundle.signSecret) {
          throw new Error("Invalid private key format");
        }

        const boxSecretKey = fromBase64(privateBundle.boxSecret);
        const signingSecretKey = fromBase64(privateBundle.signSecret);
        this.keyPair = (nacl.box.keyPair as any).fromSecretKey(boxSecretKey);
        this.signingKeyPair = (nacl.sign.keyPair as any).fromSecretKey(signingSecretKey);
      } catch (e) {
        console.error("Invalid private key provided:", e);
        throw new Error("提供された秘密鍵が無効です。");
      }
    } else {
      this.keyPair = (nacl.box.keyPair as any)();
      this.signingKeyPair = (nacl.sign.keyPair as any)();
    }

    this.publicKeyBase64 = encodeBase64Json({
      v: 2,
      boxPub: toBase64(this.keyPair.publicKey),
      signPub: toBase64(this.signingKeyPair.publicKey),
    } satisfies PublicKeyBundle);
  }

  getPublicKey(): string {
    return this.publicKeyBase64;
  }

  getPrivateKey(): string {
    return encodeBase64Json({
      v: 2,
      boxSecret: toBase64(this.keyPair.secretKey),
      signSecret: toBase64(this.signingKeyPair.secretKey),
    } satisfies PrivateKeyBundle);
  }

  encrypt(message: string, receiverPublicKeyBase64: string): string {
    try {
      const { boxPublicKey: receiverPublicKey } = parsePublicKey(receiverPublicKeyBase64);
      const messageBuffer = new TextEncoder().encode(message);
      const nonce = nacl.randomBytes((nacl.box as any).nonceLength);
      
      const ciphertext = (nacl.box as any)(
        messageBuffer,
        nonce,
        receiverPublicKey,
        this.keyPair.secretKey
      );

      if (!ciphertext) {
        throw new Error("Encryption failed");
      }

      const unsignedPacket: Omit<EncryptedPacket, 'sig'> = {
        alg: 'X25519+XSalsa20-Poly1305+Ed25519',
        epk: toBase64(this.keyPair.publicKey),
        nonce: toBase64(nonce),
        ct: toBase64(ciphertext),
        senderPub: this.getPublicKey()
      };

      const packet: EncryptedPacket = {
        ...unsignedPacket,
        sig: toBase64((nacl.sign.detached as any)(
          signingPayload(unsignedPacket),
          this.signingKeyPair.secretKey
        )),
      };

      return toBase64(
        new TextEncoder().encode(JSON.stringify(packet))
      );
    } catch (e) {
      console.error("Encryption error:", e);
      throw new Error("暗号化に失敗しました。");
    }
  }

  decrypt(
    encryptedDataBase64: string,
    senderPublicKeyBase64: string
  ): DecryptResult {
    try {
      const encryptedData = fromBase64(encryptedDataBase64);
      const packetStr = new TextDecoder().decode(encryptedData);
      const packet = JSON.parse(packetStr) as EncryptedPacket;

      if (packet.alg !== 'X25519+XSalsa20-Poly1305+Ed25519') {
        throw new Error("Unsupported algorithm");
      }

      const expectedSender = parsePublicKey(senderPublicKeyBase64);
      const packetSender = parsePublicKey(packet.senderPub);

      if (packet.senderPub !== expectedSender.normalizedPublicKey) {
        throw new Error("Sender key mismatch");
      }

      if (!packet.sig) {
        throw new Error("Signature is missing");
      }

      const isValidSignature = (nacl.sign.detached.verify as any)(
        signingPayload({
          alg: packet.alg,
          epk: packet.epk,
          nonce: packet.nonce,
          ct: packet.ct,
          senderPub: packet.senderPub,
        }),
        fromBase64(packet.sig),
        expectedSender.signingPublicKey
      );

      if (!isValidSignature) {
        throw new Error("Signature verification failed");
      }

      const senderPublicKey = packetSender.boxPublicKey;
      const nonce = fromBase64(packet.nonce);
      const ciphertext = fromBase64(packet.ct);

      const messageBuffer = (nacl.box as any).open(
        ciphertext,
        nonce,
        senderPublicKey,
        this.keyPair.secretKey
      );

      if (!messageBuffer) {
        throw new Error("Decryption failed");
      }

      const decryptedMessage = new TextDecoder().decode(messageBuffer);

      return {
        message: decryptedMessage,
        senderPub: expectedSender.normalizedPublicKey,
      };
    } catch (e) {
      console.error("Decryption error:", e);
      throw new Error("復号化に失敗しました。");
    }
  }
}
