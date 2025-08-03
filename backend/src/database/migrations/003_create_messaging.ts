import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create message_type enum
  await knex.raw(`
    CREATE TYPE message_type AS ENUM (
      'text',
      'system'
    )
  `);

  // Create encryption_keys table for E2E encryption
  await knex.schema.createTable('encryption_keys', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.text('public_key').notNullable(); // X25519 public key for encryption
    table.text('private_key_encrypted').notNullable(); // Encrypted with user's password
    table.string('key_version', 10).notNullable().defaultTo('v1');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['key_version']);
  });

  // Create conversations table
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('participant_1').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('participant_2').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('last_message_at').nullable();
    table.boolean('is_archived_p1').notNullable().defaultTo(false);
    table.boolean('is_archived_p2').notNullable().defaultTo(false);
    table.timestamps(true, true);
    
    // Ensure unique conversations and prevent self-messages
    table.unique(['participant_1', 'participant_2']);
    table.check('participant_1 != participant_2');
    
    // Indexes
    table.index(['participant_1']);
    table.index(['participant_2']);
    table.index(['last_message_at']);
  });

  // Create messages table
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('encrypted_content').notNullable(); // Encrypted message content
    table.string('content_hash', 64).notNullable(); // SHA-256 of plaintext for integrity
    table.specificType('message_type', 'message_type').notNullable().defaultTo('text');
    table.timestamp('read_at').nullable();
    table.boolean('is_deleted_sender').notNullable().defaultTo(false);
    table.boolean('is_deleted_recipient').notNullable().defaultTo(false);
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['conversation_id', 'created_at']);
    table.index(['sender_id']);
    table.index(['recipient_id']);
    table.index(['read_at']);
    table.index(['created_at']);
  });

  // Create message_keys table for forward secrecy
  await knex.schema.createTable('message_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    table.text('sender_ephemeral_key').notNullable(); // Ephemeral key for this message
    table.text('recipient_ephemeral_key').notNullable();
    table.string('key_exchange_hash', 64).notNullable(); // For key verification
    table.timestamps(true, true);
    
    // Indexes
    table.index(['message_id']);
  });

  // Create function to update conversation last_message_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_conversation_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE conversations 
      SET last_message_at = NEW.created_at 
      WHERE id = NEW.conversation_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger for conversation updates
  await knex.raw(`
    CREATE TRIGGER messages_conversation_trigger
      AFTER INSERT ON messages
      FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
  `);

  // Create function to automatically create conversations
  await knex.raw(`
    CREATE OR REPLACE FUNCTION ensure_conversation()
    RETURNS TRIGGER AS $$
    DECLARE
      conv_id uuid;
      p1 uuid;
      p2 uuid;
    BEGIN
      -- Order participants to ensure consistency
      IF NEW.sender_id < NEW.recipient_id THEN
        p1 := NEW.sender_id;
        p2 := NEW.recipient_id;
      ELSE
        p1 := NEW.recipient_id;
        p2 := NEW.sender_id;
      END IF;
      
      -- Find or create conversation
      SELECT id INTO conv_id
      FROM conversations
      WHERE participant_1 = p1 AND participant_2 = p2;
      
      IF conv_id IS NULL THEN
        INSERT INTO conversations (participant_1, participant_2)
        VALUES (p1, p2)
        RETURNING id INTO conv_id;
      END IF;
      
      NEW.conversation_id := conv_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger to auto-create conversations
  await knex.raw(`
    CREATE TRIGGER messages_ensure_conversation_trigger
      BEFORE INSERT ON messages
      FOR EACH ROW EXECUTE FUNCTION ensure_conversation();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS messages_conversation_trigger ON messages');
  await knex.raw('DROP TRIGGER IF EXISTS messages_ensure_conversation_trigger ON messages');
  await knex.raw('DROP FUNCTION IF EXISTS update_conversation_timestamp()');
  await knex.raw('DROP FUNCTION IF EXISTS ensure_conversation()');
  
  await knex.schema.dropTableIfExists('message_keys');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversations');
  await knex.schema.dropTableIfExists('encryption_keys');
  await knex.raw('DROP TYPE IF EXISTS message_type');
}