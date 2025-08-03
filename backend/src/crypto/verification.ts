import { ed25519 } from '@noble/curves/ed25519';
import { createHash, createHmac } from 'crypto';
import { NodeKeyManager } from './keys';

export interface VerificationProofData {
  userId: string;
  nodeId: string;
  timestamp: string;
  verifierSignature: string;
  proofHash: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

export interface VerificationCeremonyData {
  userId: string;
  nodeId: string;
  documentHash: string; // Hash of ID document data
  biometricHash: string; // Hash of biometric data (deleted after proof generation)
  timestamp: string;
  operatorId: string;
}

export class VerificationProofSystem {
  private static readonly PROOF_VERSION = 'v1';
  private static readonly VALIDITY_DAYS = 90;
  
  /**
   * Generate a verification proof for a user at a specific node
   */
  static async generateVerificationProof(
    ceremonyData: VerificationCeremonyData,
    nodePrivateKey: string
  ): Promise<VerificationProofData> {
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    
    // Create proof payload
    const proofPayload = {
      version: this.PROOF_VERSION,
      userId: ceremonyData.userId,
      nodeId: ceremonyData.nodeId,
      timestamp,
      expiresAt,
      documentHash: ceremonyData.documentHash,
      biometricHash: ceremonyData.biometricHash,
      operatorId: ceremonyData.operatorId
    };
    
    // Generate proof hash
    const proofHash = this.generateProofHash(proofPayload);
    
    // Sign the proof
    const privateKeyBytes = Buffer.from(nodePrivateKey, 'base64');
    const signature = ed25519.sign(proofHash, privateKeyBytes);
    const verifierSignature = Buffer.from(signature).toString('base64');
    
    return {
      userId: ceremonyData.userId,
      nodeId: ceremonyData.nodeId,
      timestamp,
      verifierSignature,
      proofHash,
      expiresAt,
      metadata: {
        version: this.PROOF_VERSION,
        operatorId: ceremonyData.operatorId
      }
    };
  }
  
  /**
   * Validate a verification proof
   */
  static async validateVerificationProof(
    proof: VerificationProofData,
    nodePublicKey: string
  ): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    try {
      // Check expiration
      if (new Date() > new Date(proof.expiresAt)) {
        return { isValid: false, reason: 'Proof has expired' };
      }
      
      // Validate signature
      const publicKeyBytes = Buffer.from(nodePublicKey, 'base64');
      const signatureBytes = Buffer.from(proof.verifierSignature, 'base64');
      const proofHashBytes = Buffer.from(proof.proofHash, 'hex');
      
      const isSignatureValid = ed25519.verify(
        signatureBytes,
        proofHashBytes,
        publicKeyBytes
      );
      
      if (!isSignatureValid) {
        return { isValid: false, reason: 'Invalid signature' };
      }
      
      // Additional timestamp validation
      const proofDate = new Date(proof.timestamp);
      const now = new Date();
      const daysDiff = (now.getTime() - proofDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > this.VALIDITY_DAYS) {
        return { isValid: false, reason: 'Proof is too old' };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, reason: `Validation error: ${error}` };
    }
  }
  
  /**
   * Generate a secure hash of proof data
   */
  private static generateProofHash(proofData: any): string {
    const dataString = JSON.stringify(proofData, Object.keys(proofData).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }
  
  /**
   * Create a tamper-evident proof token for client storage
   */
  static createProofToken(proof: VerificationProofData, secretKey: string): string {
    const payload = {
      userId: proof.userId,
      nodeId: proof.nodeId,
      timestamp: proof.timestamp,
      expiresAt: proof.expiresAt,
      proofHash: proof.proofHash
    };
    
    const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = createHmac('sha256', secretKey)
      .update(payloadString)
      .digest('base64');
    
    return `${payloadString}.${signature}`;
  }
  
  /**
   * Validate a proof token
   */
  static validateProofToken(token: string, secretKey: string): {
    isValid: boolean;
    proof?: VerificationProofData;
    reason?: string;
  } {
    try {
      const [payloadString, signature] = token.split('.');
      if (!payloadString || !signature) {
        return { isValid: false, reason: 'Invalid token format' };
      }
      
      // Verify signature
      const expectedSignature = createHmac('sha256', secretKey)
        .update(payloadString)
        .digest('base64');
      
      if (signature !== expectedSignature) {
        return { isValid: false, reason: 'Invalid token signature' };
      }
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadString, 'base64').toString());
      
      // Check expiration
      if (new Date() > new Date(payload.expiresAt)) {
        return { isValid: false, reason: 'Token has expired' };
      }
      
      return {
        isValid: true,
        proof: {
          userId: payload.userId,
          nodeId: payload.nodeId,
          timestamp: payload.timestamp,
          verifierSignature: '', // Not included in token for security
          proofHash: payload.proofHash,
          expiresAt: payload.expiresAt
        }
      };
    } catch (error) {
      return { isValid: false, reason: `Token validation error: ${error}` };
    }
  }
  
  /**
   * Generate challenge for proof-of-possession
   */
  static generateChallenge(): string {
    return NodeKeyManager.generateNonce();
  }
  
  /**
   * Verify proof-of-possession response
   */
  static verifyPossessionProof(
    challenge: string,
    response: string,
    userProofHash: string
  ): boolean {
    try {
      const expectedResponse = createHmac('sha256', userProofHash)
        .update(challenge)
        .digest('base64');
      
      return response === expectedResponse;
    } catch {
      return false;
    }
  }
  
  /**
   * Calculate trust score based on verification age and type
   */
  static calculateVerificationTrustScore(proof: VerificationProofData): number {
    const proofDate = new Date(proof.timestamp);
    const now = new Date();
    const daysSinceVerification = (now.getTime() - proofDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Base score starts at 100 and decreases over time
    let score = 100;
    
    // Decrease score by 0.5% per day
    score -= daysSinceVerification * 0.5;
    
    // Minimum score of 10
    score = Math.max(10, score);
    
    // Bonus for recent verification
    if (daysSinceVerification <= 7) {
      score += 10;
    }
    
    return Math.round(score);
  }
}