declare module 'tweetnacl' {
  export interface BoxKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface SignKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export namespace box {
    function keyPair(): BoxKeyPair;
    namespace keyPair {
      function fromSecretKey(secretKey: Uint8Array): BoxKeyPair;
    }
    function randomBytes(n: number): Uint8Array;
  }

  export namespace sign {
    function keyPair(): SignKeyPair;
    namespace keyPair {
      function fromSecretKey(secretKey: Uint8Array): SignKeyPair;
    }
    function detached(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    namespace detached {
      function verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
    }
  }

  export namespace secretbox {
    function keyFromString(str: string): Uint8Array;
  }

  export function randomBytes(n: number): Uint8Array;
}

declare module 'tweetnacl-util' {
  export function encodeBase64(arr: Uint8Array): string;
  export function decodeBase64(str: string): Uint8Array;
}
