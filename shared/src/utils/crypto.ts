import { createHash, randomBytes, createHmac } from 'crypto';

export function generateSecureId(): string {
  return randomBytes(16).toString('hex');
}

export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || randomBytes(32).toString('hex');
  const hash = createHash('sha256')
    .update(password + passwordSalt)
    .digest('hex');
  return { hash, salt: passwordSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computedHash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return computedHash === hash;
}

export function hashEmail(email: string): string {
  return createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

export function createContentHash(content: string): string {
  return createHash('sha256')
    .update(content)
    .digest('hex');
}

export function createHmacSignature(data: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

export function verifyHmacSignature(data: string, signature: string, secret: string): boolean {
  const computedSignature = createHmacSignature(data, secret);
  return computedSignature === signature;
}

export function generateVerificationProofHash(
  userId: string,
  timestamp: string,
  nodeId: string
): string {
  return createHash('sha256')
    .update(`${userId}:${timestamp}:${nodeId}`)
    .digest('hex');
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}