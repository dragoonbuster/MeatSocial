import { VerificationProofSystem, VerificationCeremonyData } from '../verification';
import { NodeKeyManager } from '../keys';

describe('VerificationProofSystem', () => {
  let nodeKeyPair: any;
  let ceremonyData: VerificationCeremonyData;
  
  beforeAll(() => {
    // Generate a test keypair
    nodeKeyPair = NodeKeyManager.generateNodeKeyPair();
    
    ceremonyData = {
      userId: 'test-user-123',
      nodeId: 'test-node-001',
      documentHash: 'doc_hash_123',
      biometricHash: 'bio_hash_456',
      timestamp: new Date().toISOString(),
      operatorId: 'operator-001'
    };
  });
  
  describe('generateVerificationProof', () => {
    it('should generate a valid verification proof', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      
      const proof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      expect(proof).toHaveProperty('userId', ceremonyData.userId);
      expect(proof).toHaveProperty('nodeId', ceremonyData.nodeId);
      expect(proof).toHaveProperty('timestamp');
      expect(proof).toHaveProperty('verifierSignature');
      expect(proof).toHaveProperty('proofHash');
      expect(proof).toHaveProperty('expiresAt');
      
      // Verify expiration is ~90 days from now
      const expirationDate = new Date(proof.expiresAt);
      const now = new Date();
      const daysDiff = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(90, 1);
    });
    
    it('should generate unique proofs for different users', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      
      const proof1 = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      const ceremony2 = { ...ceremonyData, userId: 'different-user' };
      const proof2 = await VerificationProofSystem.generateVerificationProof(
        ceremony2,
        privateKey
      );
      
      expect(proof1.proofHash).not.toBe(proof2.proofHash);
      expect(proof1.verifierSignature).not.toBe(proof2.verifierSignature);
    });
  });
  
  describe('validateVerificationProof', () => {
    it('should validate a correct proof', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      const publicKey = Buffer.from(nodeKeyPair.publicKey).toString('base64');
      
      const proof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      const validation = await VerificationProofSystem.validateVerificationProof(
        proof,
        publicKey
      );
      
      expect(validation.isValid).toBe(true);
    });
    
    it('should reject proof with wrong public key', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      const wrongKeyPair = NodeKeyManager.generateNodeKeyPair();
      const wrongPublicKey = Buffer.from(wrongKeyPair.publicKey).toString('base64');
      
      const proof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      const validation = await VerificationProofSystem.validateVerificationProof(
        proof,
        wrongPublicKey
      );
      
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Invalid signature');
    });
    
    it('should reject expired proof', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      const publicKey = Buffer.from(nodeKeyPair.publicKey).toString('base64');
      
      const proof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      // Manually set expiration to past
      proof.expiresAt = new Date(Date.now() - 1000).toISOString();
      
      const validation = await VerificationProofSystem.validateVerificationProof(
        proof,
        publicKey
      );
      
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('expired');
    });
  });
  
  describe('createProofToken and validateProofToken', () => {
    it('should create and validate proof tokens', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      const secretKey = 'test-secret-key';
      
      const proof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      const token = VerificationProofSystem.createProofToken(proof, secretKey);
      expect(typeof token).toBe('string');
      expect(token).toContain('.');
      
      const validation = VerificationProofSystem.validateProofToken(token, secretKey);
      expect(validation.isValid).toBe(true);
      expect(validation.proof).toBeDefined();
      expect(validation.proof?.userId).toBe(proof.userId);
    });
    
    it('should reject token with wrong secret', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      const secretKey = 'test-secret-key';
      const wrongSecret = 'wrong-secret';
      
      const proof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      const token = VerificationProofSystem.createProofToken(proof, secretKey);
      const validation = VerificationProofSystem.validateProofToken(token, wrongSecret);
      
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('signature');
    });
    
    it('should reject malformed token', () => {
      const validation = VerificationProofSystem.validateProofToken(
        'invalid.token.format',
        'secret'
      );
      
      expect(validation.isValid).toBe(false);
    });
  });
  
  describe('calculateVerificationTrustScore', () => {
    it('should calculate higher scores for recent verifications', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      
      const recentProof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        privateKey
      );
      
      const oldCeremony = {
        ...ceremonyData,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      };
      
      const oldProof = await VerificationProofSystem.generateVerificationProof(
        oldCeremony,
        privateKey
      );
      
      // Fix the timestamp for scoring
      oldProof.timestamp = oldCeremony.timestamp;
      
      const recentScore = VerificationProofSystem.calculateVerificationTrustScore(recentProof);
      const oldScore = VerificationProofSystem.calculateVerificationTrustScore(oldProof);
      
      expect(recentScore).toBeGreaterThan(oldScore);
    });
    
    it('should never return negative scores', async () => {
      const privateKey = Buffer.from(nodeKeyPair.privateKey).toString('base64');
      
      const veryOldCeremony = {
        ...ceremonyData,
        timestamp: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
      };
      
      const oldProof = await VerificationProofSystem.generateVerificationProof(
        veryOldCeremony,
        privateKey
      );
      
      oldProof.timestamp = veryOldCeremony.timestamp;
      
      const score = VerificationProofSystem.calculateVerificationTrustScore(oldProof);
      expect(score).toBeGreaterThanOrEqual(10);
    });
  });
  
  describe('generateChallenge and verifyPossessionProof', () => {
    it('should generate and verify possession proofs', () => {
      const challenge = VerificationProofSystem.generateChallenge();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
      
      const userProofHash = 'test_proof_hash';
      const response = require('crypto')
        .createHmac('sha256', userProofHash)
        .update(challenge)
        .digest('base64');
      
      const isValid = VerificationProofSystem.verifyPossessionProof(
        challenge,
        response,
        userProofHash
      );
      
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid possession proofs', () => {
      const challenge = VerificationProofSystem.generateChallenge();
      const userProofHash = 'test_proof_hash';
      const invalidResponse = 'invalid_response';
      
      const isValid = VerificationProofSystem.verifyPossessionProof(
        challenge,
        invalidResponse,
        userProofHash
      );
      
      expect(isValid).toBe(false);
    });
  });
});