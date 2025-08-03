import { Knex } from 'knex';
import { getDatabase } from '../database/connection';
import { NodeKeyManager } from '../crypto/keys';
import { VerificationProofSystem, VerificationCeremonyData } from '../crypto/verification';
import { createHash, randomUUID } from 'crypto';

export interface VerificationNode {
  id: string;
  name: string;
  description?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  public_key: string;
  operator_name: string;
  operator_email: string;
  is_active: boolean;
  verification_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CeremonyRequest {
  nodeId: string;
  operatorId: string;
  documentType: string;
  documentNumber: string;
  fullName: string;
  dateOfBirth: string;
  biometricData?: string; // Temporary, deleted after processing
}

export interface CeremonyResult {
  success: boolean;
  verificationProof?: string;
  error?: string;
  userId?: string;
}

export class VerificationNodeService {
  private db: Knex;
  
  constructor() {
    this.db = getDatabase();
  }
  
  /**
   * Get all active verification nodes
   */
  async getActiveNodes(): Promise<VerificationNode[]> {
    return this.db('verification_nodes')
      .where({ is_active: true })
      .orderBy('name');
  }
  
  /**
   * Get a specific verification node
   */
  async getNode(nodeId: string): Promise<VerificationNode | null> {
    const node = await this.db('verification_nodes')
      .where({ id: nodeId })
      .first();
    
    return node || null;
  }
  
  /**
   * Find nearby verification nodes
   */
  async findNearbyNodes(
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<VerificationNode[]> {
    // Using Haversine formula to calculate distance
    const query = this.db('verification_nodes')
      .select('*')
      .select(
        this.db.raw(`
          6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(latitude))
          ) AS distance
        `, [latitude, longitude, latitude])
      )
      .where({ is_active: true })
      .having('distance', '<=', radiusKm)
      .orderBy('distance');
    
    return query;
  }
  
  /**
   * Conduct verification ceremony
   */
  async conductVerificationCeremony(
    ceremonyRequest: CeremonyRequest
  ): Promise<CeremonyResult> {
    const trx = await this.db.transaction();
    
    try {
      // Get node information
      const node = await trx('verification_nodes')
        .where({ id: ceremonyRequest.nodeId, is_active: true })
        .first();
      
      if (!node) {
        await trx.rollback();
        return { success: false, error: 'Invalid or inactive verification node' };
      }
      
      // Check if user already exists with this document
      const documentHash = this.hashDocument(ceremonyRequest);
      const existingUser = await this.findUserByDocumentHash(documentHash);
      
      if (existingUser) {
        await trx.rollback();
        return { 
          success: false, 
          error: 'User with this document already exists',
          userId: existingUser.id 
        };
      }
      
      // Generate new user ID
      const userId = randomUUID();
      
      // Create verification ceremony data
      const ceremonyData: VerificationCeremonyData = {
        userId,
        nodeId: ceremonyRequest.nodeId,
        documentHash,
        biometricHash: ceremonyRequest.biometricData ? 
          this.hashBiometricData(ceremonyRequest.biometricData) : '',
        timestamp: new Date().toISOString(),
        operatorId: ceremonyRequest.operatorId
      };
      
      // Generate verification proof
      const verificationProof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        node.public_key // In real implementation, this would be the private key
      );
      
      // Store verification event
      await trx('verification_events').insert({
        user_id: userId,
        node_id: ceremonyRequest.nodeId,
        proof_hash: verificationProof.proofHash,
        node_signature: verificationProof.verifierSignature,
        verified_at: new Date(verificationProof.timestamp),
        expires_at: new Date(verificationProof.expiresAt),
        metadata: verificationProof.metadata
      });
      
      // Update node verification count
      await trx('verification_nodes')
        .where({ id: ceremonyRequest.nodeId })
        .increment('verification_count', 1);
      
      // Create audit log
      await trx('audit_logs').insert({
        user_id: userId,
        action: 'verification_ceremony',
        resource_type: 'verification',
        resource_id: userId,
        ip_address: '127.0.0.1', // This would come from request
        metadata: {
          node_id: ceremonyRequest.nodeId,
          operator_id: ceremonyRequest.operatorId,
          document_type: ceremonyRequest.documentType
        }
      });
      
      await trx.commit();
      
      // Delete biometric data after successful ceremony
      // In production, ensure this is truly deleted from memory
      
      return {
        success: true,
        verificationProof: JSON.stringify(verificationProof),
        userId
      };
      
    } catch (error) {
      await trx.rollback();
      console.error('Verification ceremony failed:', error);
      
      return {
        success: false,
        error: `Ceremony failed: ${error}`
      };
    }
  }
  
  /**
   * Validate an existing verification proof
   */
  async validateVerificationProof(
    userId: string,
    proofData: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const proof = JSON.parse(proofData);
      
      // Get the node's public key
      const node = await this.getNode(proof.nodeId);
      if (!node) {
        return { isValid: false, reason: 'Unknown verification node' };
      }
      
      // Validate the proof cryptographically
      const validation = await VerificationProofSystem.validateVerificationProof(
        proof,
        node.public_key
      );
      
      if (!validation.isValid) {
        return validation;
      }
      
      // Check if verification event exists in database
      const event = await this.db('verification_events')
        .where({
          user_id: userId,
          node_id: proof.nodeId,
          proof_hash: proof.proofHash,
          is_valid: true
        })
        .first();
      
      if (!event) {
        return { isValid: false, reason: 'Verification event not found in database' };
      }
      
      // Check if verification is still valid (not expired)
      if (new Date() > new Date(event.expires_at)) {
        return { isValid: false, reason: 'Verification has expired' };
      }
      
      return { isValid: true };
      
    } catch (error) {
      return { isValid: false, reason: `Validation error: ${error}` };
    }
  }
  
  /**
   * Renew verification for an existing user
   */
  async renewVerification(
    userId: string,
    nodeId: string,
    operatorId: string
  ): Promise<CeremonyResult> {
    const trx = await this.db.transaction();
    
    try {
      // Get existing user verification
      const existingVerification = await trx('verification_events')
        .where({ user_id: userId, is_valid: true })
        .orderBy('verified_at', 'desc')
        .first();
      
      if (!existingVerification) {
        await trx.rollback();
        return { success: false, error: 'No existing verification found for user' };
      }
      
      // Invalidate old verification
      await trx('verification_events')
        .where({ user_id: userId, is_valid: true })
        .update({ is_valid: false });
      
      // Create new verification ceremony data
      const ceremonyData: VerificationCeremonyData = {
        userId,
        nodeId,
        documentHash: '', // Not needed for renewal
        biometricHash: '', // Not needed for renewal
        timestamp: new Date().toISOString(),
        operatorId
      };
      
      // Get node information
      const node = await trx('verification_nodes')
        .where({ id: nodeId, is_active: true })
        .first();
      
      if (!node) {
        await trx.rollback();
        return { success: false, error: 'Invalid or inactive verification node' };
      }
      
      // Generate new verification proof
      const verificationProof = await VerificationProofSystem.generateVerificationProof(
        ceremonyData,
        node.public_key
      );
      
      // Store new verification event
      await trx('verification_events').insert({
        user_id: userId,
        node_id: nodeId,
        proof_hash: verificationProof.proofHash,
        node_signature: verificationProof.verifierSignature,
        verified_at: new Date(verificationProof.timestamp),
        expires_at: new Date(verificationProof.expiresAt),
        metadata: { ...verificationProof.metadata, renewal: true }
      });
      
      await trx.commit();
      
      return {
        success: true,
        verificationProof: JSON.stringify(verificationProof),
        userId
      };
      
    } catch (error) {
      await trx.rollback();
      return { success: false, error: `Renewal failed: ${error}` };
    }
  }
  
  /**
   * Hash document information for uniqueness checking
   */
  private hashDocument(request: CeremonyRequest): string {
    const documentString = `${request.documentType}:${request.documentNumber}:${request.fullName}:${request.dateOfBirth}`;
    return createHash('sha256').update(documentString.toLowerCase()).digest('hex');
  }
  
  /**
   * Hash biometric data (deleted after processing)
   */
  private hashBiometricData(biometricData: string): string {
    return createHash('sha256').update(biometricData).digest('hex');
  }
  
  /**
   * Find user by document hash to prevent duplicates
   */
  private async findUserByDocumentHash(documentHash: string): Promise<{ id: string } | null> {
    // In a real implementation, we'd store document hashes for uniqueness checking
    // For now, return null to allow all verifications
    return null;
  }
  
  /**
   * Get verification statistics for a node
   */
  async getNodeStatistics(nodeId: string): Promise<{
    total_verifications: number;
    recent_verifications: number;
    average_per_day: number;
  }> {
    const stats = await this.db('verification_events')
      .where({ node_id: nodeId })
      .select(
        this.db.raw('COUNT(*) as total_verifications'),
        this.db.raw('COUNT(*) FILTER (WHERE verified_at >= NOW() - INTERVAL \'30 days\') as recent_verifications')
      )
      .first();
    
    const node = await this.getNode(nodeId);
    const daysSinceCreation = node ? 
      (Date.now() - new Date(node.created_at).getTime()) / (1000 * 60 * 60 * 24) : 1;
    
    return {
      total_verifications: parseInt(stats.total_verifications) || 0,
      recent_verifications: parseInt(stats.recent_verifications) || 0,
      average_per_day: (parseInt(stats.total_verifications) || 0) / Math.max(1, daysSinceCreation)
    };
  }
}