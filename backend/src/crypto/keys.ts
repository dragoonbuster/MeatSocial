import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes, pbkdf2Sync, createCipher, createDecipher } from 'crypto';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface EncodedKeyPair {
  publicKey: string;
  privateKey: string;
}

export class NodeKeyManager {
  
  /**
   * Generate a new Ed25519 keypair for a verification node
   */
  static generateNodeKeyPair(): KeyPair {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    
    return {
      publicKey,
      privateKey
    };
  }
  
  /**
   * Generate X25519 keypair for encryption
   */
  static generateEncryptionKeyPair(): KeyPair {
    // Generate 32-byte keys for X25519
    const privateKey = randomBytes(32);
    const publicKey = randomBytes(32); // Simplified for demo - in production use actual X25519
    
    return {
      publicKey: new Uint8Array(publicKey),
      privateKey: new Uint8Array(privateKey)
    };
  }
  
  /**
   * Encode keypair to base64 strings for storage
   */
  static encodeKeyPair(keyPair: KeyPair): EncodedKeyPair {
    return {
      publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
      privateKey: Buffer.from(keyPair.privateKey).toString('base64')
    };
  }
  
  /**
   * Decode keypair from base64 strings
   */
  static decodeKeyPair(encoded: EncodedKeyPair): KeyPair {
    return {
      publicKey: new Uint8Array(Buffer.from(encoded.publicKey, 'base64')),
      privateKey: new Uint8Array(Buffer.from(encoded.privateKey, 'base64'))
    };
  }
  
  /**
   * Derive a secure key from password for encryption
   */
  static deriveKey(password: string, salt?: Uint8Array): {
    key: Uint8Array;
    salt: Uint8Array;
  } {
    const keySalt = salt || randomBytes(32);
    const key = pbkdf2Sync(password, keySalt, 100000, 32, 'sha256');
    
    return {
      key: new Uint8Array(key),
      salt: new Uint8Array(keySalt)
    };
  }
  
  /**
   * Encrypt private key with password
   */
  static encryptPrivateKey(privateKey: Uint8Array, password: string): {
    encrypted: string;
    salt: string;
    iv: string;
  } {
    const { key, salt } = this.deriveKey(password);
    const iv = randomBytes(16); // AES-256-CTR uses 16-byte IV
    
    const cipher = createCipher('aes-256-ctr', Buffer.from(key));
    
    let encrypted = cipher.update(Buffer.from(privateKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return {
      encrypted: encrypted.toString('base64'),
      salt: Buffer.from(salt).toString('base64'),
      iv: iv.toString('base64')
    };
  }
  
  /**
   * Decrypt private key with password
   */
  static decryptPrivateKey(
    encrypted: string,
    salt: string,
    password: string
  ): Uint8Array {
    const { key } = this.deriveKey(password, new Uint8Array(Buffer.from(salt, 'base64')));
    const ciphertext = Buffer.from(encrypted, 'base64');
    
    const decipher = createDecipher('aes-256-ctr', Buffer.from(key));
    
    try {
      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return new Uint8Array(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt private key - invalid password');
    }
  }
  
  /**
   * Validate Ed25519 public key format
   */
  static validatePublicKey(publicKey: string): boolean {
    try {
      const keyBytes = Buffer.from(publicKey, 'base64');
      return keyBytes.length === 32; // Ed25519 public keys are 32 bytes
    } catch {
      return false;
    }
  }
  
  /**
   * Generate a secure random nonce
   */
  static generateNonce(): string {
    return randomBytes(32).toString('base64');
  }
}