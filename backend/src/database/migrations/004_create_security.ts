import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create session table for JWT token management
  await knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 64).notNullable(); // SHA-256 hash of JWT
    table.string('refresh_token_hash', 64).notNullable(); // SHA-256 hash of refresh token
    table.string('ip_address', 45).notNullable(); // IPv6 compatible
    table.string('user_agent', 500).nullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('last_used_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['token_hash']);
    table.index(['refresh_token_hash']);
    table.index(['expires_at']);
    table.index(['is_active']);
  });

  // Create audit_logs table for security events
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable(); // login, logout, verify, post_create, etc.
    table.string('resource_type', 50).nullable(); // user, post, message, etc.
    table.uuid('resource_id').nullable();
    table.string('ip_address', 45).notNullable();
    table.string('user_agent', 500).nullable();
    table.jsonb('metadata').nullable(); // Additional context
    table.string('severity', 20).notNullable().defaultTo('info'); // info, warning, error, critical
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['user_id']);
    table.index(['action']);
    table.index(['resource_type', 'resource_id']);
    table.index(['ip_address']);
    table.index(['severity']);
    table.index(['timestamp']);
  });

  // Create rate_limits table for rate limiting
  await knex.schema.createTable('rate_limits', (table) => {
    table.string('key', 255).primary(); // IP:endpoint or user:endpoint
    table.integer('requests').notNullable().defaultTo(1);
    table.timestamp('window_start').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    
    // Indexes
    table.index(['expires_at']);
  });

  // Create security_incidents table for anomaly detection
  await knex.schema.createTable('security_incidents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('incident_type', 100).notNullable(); // brute_force, suspicious_login, etc.
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('ip_address', 45).notNullable();
    table.string('severity', 20).notNullable(); // low, medium, high, critical
    table.text('description').notNullable();
    table.jsonb('evidence').nullable(); // Supporting data
    table.string('status', 20).notNullable().defaultTo('open'); // open, investigating, resolved
    table.uuid('assigned_to').nullable().references('id').inTable('users');
    table.timestamp('resolved_at').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['incident_type']);
    table.index(['user_id']);
    table.index(['ip_address']);
    table.index(['severity']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // Create trust_scores table for user trust calculation
  await knex.schema.createTable('trust_scores', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('base_score', 5, 2).notNullable().defaultTo(50.0); // 0-100 scale
    table.decimal('verification_score', 5, 2).notNullable().defaultTo(0.0);
    table.decimal('social_score', 5, 2).notNullable().defaultTo(0.0);
    table.decimal('behavior_score', 5, 2).notNullable().defaultTo(0.0);
    table.decimal('final_score', 5, 2).notNullable().defaultTo(50.0);
    table.integer('days_verified').notNullable().defaultTo(0);
    table.integer('reports_received').notNullable().defaultTo(0);
    table.integer('reports_made').notNullable().defaultTo(0);
    table.timestamp('last_calculated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Indexes
    table.index(['final_score']);
    table.index(['days_verified']);
    table.index(['last_calculated_at']);
  });

  // Create API keys table for programmatic access
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable(); // User-friendly name
    table.string('key_hash', 64).notNullable(); // SHA-256 of API key
    table.jsonb('permissions').notNullable().defaultTo('[]'); // Array of allowed actions
    table.integer('rate_limit').notNullable().defaultTo(1000); // Requests per hour
    table.timestamp('last_used_at').nullable();
    table.timestamp('expires_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['key_hash']);
    table.index(['is_active']);
    table.index(['expires_at']);
  });

  // Create function to update trust scores
  await knex.raw(`
    CREATE OR REPLACE FUNCTION calculate_trust_score(target_user_id uuid)
    RETURNS void AS $$
    DECLARE
      verification_days integer;
      report_ratio decimal;
      verification_score decimal;
      social_score decimal;
      behavior_score decimal;
      final_score decimal;
    BEGIN
      -- Calculate days since verification
      SELECT COALESCE(
        EXTRACT(DAY FROM NOW() - MAX(verified_at))::integer, 
        0
      ) INTO verification_days
      FROM verification_events 
      WHERE user_id = target_user_id AND is_valid = true;
      
      -- Verification score (0-40 points)
      verification_score := LEAST(40, verification_days * 0.2);
      
      -- Social score based on followers/following ratio (0-30 points)
      SELECT CASE 
        WHEN following_count = 0 THEN 0
        WHEN follower_count::decimal / following_count > 2 THEN 30
        WHEN follower_count::decimal / following_count > 1 THEN 20
        WHEN follower_count::decimal / following_count > 0.5 THEN 10
        ELSE 5
      END INTO social_score
      FROM user_profiles
      WHERE user_id = target_user_id;
      
      -- Behavior score based on reports (0-30 points, can go negative)
      SELECT 
        reports_received,
        CASE 
          WHEN reports_received = 0 THEN 30
          WHEN reports_received <= 2 THEN 20
          WHEN reports_received <= 5 THEN 10
          ELSE -10
        END INTO behavior_score
      FROM trust_scores
      WHERE user_id = target_user_id;
      
      -- Calculate final score
      final_score := GREATEST(0, LEAST(100, 50 + verification_score + social_score + behavior_score));
      
      -- Update trust scores
      INSERT INTO trust_scores (
        user_id, verification_score, social_score, behavior_score, 
        final_score, days_verified, last_calculated_at
      ) VALUES (
        target_user_id, verification_score, social_score, behavior_score,
        final_score, verification_days, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        verification_score = EXCLUDED.verification_score,
        social_score = EXCLUDED.social_score,
        behavior_score = EXCLUDED.behavior_score,
        final_score = EXCLUDED.final_score,
        days_verified = EXCLUDED.days_verified,
        last_calculated_at = EXCLUDED.last_calculated_at;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create cleanup function for expired sessions and rate limits
  await knex.raw(`
    CREATE OR REPLACE FUNCTION cleanup_expired_data()
    RETURNS void AS $$
    BEGIN
      -- Clean up expired sessions
      DELETE FROM sessions WHERE expires_at < NOW();
      
      -- Clean up expired rate limits
      DELETE FROM rate_limits WHERE expires_at < NOW();
      
      -- Clean up old audit logs (keep 1 year)
      DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '1 year';
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS calculate_trust_score(uuid)');
  await knex.raw('DROP FUNCTION IF EXISTS cleanup_expired_data()');
  
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('trust_scores');
  await knex.schema.dropTableIfExists('security_incidents');
  await knex.schema.dropTableIfExists('rate_limits');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('sessions');
}