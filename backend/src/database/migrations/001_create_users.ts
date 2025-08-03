import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  
  // Create trust_level enum
  await knex.raw(`
    CREATE TYPE trust_level AS ENUM (
      'visitor',
      'resident', 
      'citizen',
      'elder'
    )
  `);

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('username', 30).notNullable().unique();
    table.string('email_hash', 64).notNullable().unique(); // SHA-256 hash of email
    table.string('password_hash', 255).notNullable();
    table.string('password_salt', 64).notNullable();
    table.text('verification_proof').notNullable(); // Cryptographic proof from node
    table.specificType('trust_level', 'trust_level').notNullable().defaultTo('visitor');
    table.boolean('is_verified').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at').nullable();
    table.string('last_login_ip', 45).nullable(); // IPv6 compatible
    table.integer('failed_login_attempts').notNullable().defaultTo(0);
    table.timestamp('locked_until').nullable();
    table.timestamps(true, true); // created_at, updated_at with timezone
    
    // Indexes for performance
    table.index(['username']);
    table.index(['email_hash']);
    table.index(['trust_level']);
    table.index(['is_verified', 'is_active']);
    table.index(['created_at']);
  });

  // Create verification_events table for audit trail
  await knex.schema.createTable('verification_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('node_id', 100).notNullable(); // Verification node identifier
    table.string('proof_hash', 64).notNullable(); // SHA-256 of verification data
    table.text('node_signature').notNullable(); // Ed25519 signature from node
    table.timestamp('verified_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable(); // 90 days from verification
    table.boolean('is_valid').notNullable().defaultTo(true);
    table.jsonb('metadata').nullable(); // Additional verification metadata
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['node_id']);
    table.index(['verified_at']);
    table.index(['expires_at']);
    table.index(['is_valid']);
  });

  // Create verification_nodes table
  await knex.schema.createTable('verification_nodes', (table) => {
    table.string('id', 100).primary(); // node identifier
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.string('location', 255).notNullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.text('public_key').notNullable(); // Ed25519 public key
    table.string('operator_name', 255).notNullable();
    table.string('operator_email', 255).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('verification_count').notNullable().defaultTo(0);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['is_active']);
    table.index(['location']);
  });

  // Add foreign key constraint for verification_events
  await knex.schema.alterTable('verification_events', (table) => {
    table.foreign('node_id').references('id').inTable('verification_nodes');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('verification_events');
  await knex.schema.dropTableIfExists('verification_nodes');
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP TYPE IF EXISTS trust_level');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}