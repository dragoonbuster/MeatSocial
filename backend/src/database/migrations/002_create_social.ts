import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create post_visibility enum
  await knex.raw(`
    CREATE TYPE post_visibility AS ENUM (
      'public',
      'followers',
      'private'
    )
  `);

  // Create posts table
  await knex.schema.createTable('posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('content', 280).notNullable(); // 280 character limit
    table.string('content_hash', 64).notNullable(); // SHA-256 for integrity
    table.specificType('visibility', 'post_visibility').notNullable().defaultTo('public');
    table.timestamp('edited_at').nullable();
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['user_id']);
    table.index(['visibility']);
    table.index(['created_at']);
    table.index(['is_deleted', 'created_at']);
    table.index(['user_id', 'is_deleted', 'created_at']);
  });

  // Create follows table for social graph
  await knex.schema.createTable('follows', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('follower_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('followee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);
    
    // Prevent self-follows and duplicate follows
    table.unique(['follower_id', 'followee_id']);
    table.check('follower_id != followee_id');
    
    // Indexes for social graph queries
    table.index(['follower_id']);
    table.index(['followee_id']);
    table.index(['followee_id', 'created_at']);
  });

  // Create user_profiles table for extended user information
  await knex.schema.createTable('user_profiles', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.string('display_name', 50).nullable();
    table.text('bio').nullable();
    table.string('location', 100).nullable();
    table.string('website', 255).nullable();
    table.date('birth_date').nullable();
    table.integer('follower_count').notNullable().defaultTo(0);
    table.integer('following_count').notNullable().defaultTo(0);
    table.integer('post_count').notNullable().defaultTo(0);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['display_name']);
    table.index(['location']);
  });

  // Create post_reports table for content moderation
  await knex.schema.createTable('post_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.uuid('reported_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reason', 100).notNullable();
    table.text('description').nullable();
    table.string('status', 20).notNullable().defaultTo('pending'); // pending, reviewed, dismissed
    table.uuid('reviewed_by').nullable().references('id').inTable('users');
    table.timestamp('reviewed_at').nullable();
    table.timestamps(true, true);
    
    // Prevent duplicate reports
    table.unique(['post_id', 'reported_by']);
    
    // Indexes
    table.index(['post_id']);
    table.index(['reported_by']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // Create functions to update counters
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_user_counters()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_TABLE_NAME = 'posts' THEN
        IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
          UPDATE user_profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;
        ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
          UPDATE user_profiles SET post_count = post_count - 1 WHERE user_id = NEW.user_id;
        ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = true AND NEW.is_deleted = false THEN
          UPDATE user_profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;
        END IF;
      ELSIF TG_TABLE_NAME = 'follows' THEN
        IF TG_OP = 'INSERT' THEN
          UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
          UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.followee_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE user_profiles SET following_count = following_count - 1 WHERE user_id = OLD.follower_id;
          UPDATE user_profiles SET follower_count = follower_count - 1 WHERE user_id = OLD.followee_id;
        END IF;
      END IF;
      
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create triggers for counter updates
  await knex.raw(`
    CREATE TRIGGER posts_counter_trigger
      AFTER INSERT OR UPDATE ON posts
      FOR EACH ROW EXECUTE FUNCTION update_user_counters();
      
    CREATE TRIGGER follows_counter_trigger
      AFTER INSERT OR DELETE ON follows
      FOR EACH ROW EXECUTE FUNCTION update_user_counters();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS posts_counter_trigger ON posts');
  await knex.raw('DROP TRIGGER IF EXISTS follows_counter_trigger ON follows');
  await knex.raw('DROP FUNCTION IF EXISTS update_user_counters()');
  
  await knex.schema.dropTableIfExists('post_reports');
  await knex.schema.dropTableIfExists('user_profiles');
  await knex.schema.dropTableIfExists('follows');
  await knex.schema.dropTableIfExists('posts');
  await knex.raw('DROP TYPE IF EXISTS post_visibility');
}