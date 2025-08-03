import { TrustLevel } from './auth';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  encrypted_content: string;
  created_at: string;
  read_at?: string;
  message_type: MessageType;
}

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system'
}

export interface DecryptedMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at?: string;
  message_type: MessageType;
  sender_username: string;
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_username: string;
  participant_trust_level: TrustLevel;
  last_message?: DecryptedMessage;
  unread_count: number;
  updated_at: string;
}

export interface SendMessageRequest {
  recipient_id: string;
  content: string;
  message_type: MessageType;
}

export interface MessageHistory {
  messages: DecryptedMessage[];
  has_more: boolean;
  next_cursor?: string;
}

export interface EncryptionKeyPair {
  public_key: string;
  private_key: string;
}

export interface MessageEncryptionData {
  encrypted_content: string;
  sender_public_key: string;
  recipient_public_key: string;
}