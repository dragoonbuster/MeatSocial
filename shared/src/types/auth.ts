export interface User {
  id: string;
  username: string;
  email_hash: string;
  verification_proof: string;
  trust_level: TrustLevel;
  created_at: string;
  updated_at: string;
}

export enum TrustLevel {
  VISITOR = 'visitor',
  RESIDENT = 'resident', 
  CITIZEN = 'citizen',
  ELDER = 'elder'
}

export interface VerificationProof {
  user_id: string;
  verification_timestamp: string;
  node_id: string;
  proof_hash: string;
  signature: string;
  expires_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  verification_proof: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}