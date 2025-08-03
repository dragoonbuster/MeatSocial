import { Knex } from 'knex';
import { getDatabase } from '../connection';
import { User, TrustLevel } from '@meatsocial/shared';

export interface UserRow {
  id: string;
  username: string;
  email_hash: string;
  password_hash: string;
  password_salt: string;
  verification_proof: string;
  trust_level: TrustLevel;
  is_verified: boolean;
  is_active: boolean;
  last_login_at?: Date;
  last_login_ip?: string;
  failed_login_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  username: string;
  email_hash: string;
  password_hash: string;
  password_salt: string;
  verification_proof: string;
}

export interface UpdateUserData {
  username?: string;
  password_hash?: string;
  password_salt?: string;
  last_login_at?: Date;
  last_login_ip?: string;
  failed_login_attempts?: number;
  locked_until?: Date;
}

export class UserModel {
  private db: Knex;
  private table = 'users';

  constructor() {
    this.db = getDatabase();
  }

  async findById(id: string): Promise<UserRow | null> {
    const user = await this.db(this.table)
      .where({ id, is_active: true })
      .first();
    return user || null;
  }

  async findByUsername(username: string): Promise<UserRow | null> {
    const user = await this.db(this.table)
      .where({ username, is_active: true })
      .first();
    return user || null;
  }

  async findByEmailHash(emailHash: string): Promise<UserRow | null> {
    const user = await this.db(this.table)
      .where({ email_hash: emailHash, is_active: true })
      .first();
    return user || null;
  }

  async create(userData: CreateUserData): Promise<UserRow> {
    const [user] = await this.db(this.table)
      .insert(userData)
      .returning('*');
    
    // Create user profile
    await this.db('user_profiles')
      .insert({ user_id: user.id });
    
    // Initialize trust score
    await this.db('trust_scores')
      .insert({ user_id: user.id });
    
    return user;
  }

  async update(id: string, updateData: UpdateUserData): Promise<UserRow | null> {
    const [user] = await this.db(this.table)
      .where({ id })
      .update({
        ...updateData,
        updated_at: this.db.fn.now()
      })
      .returning('*');
    
    return user || null;
  }

  async incrementFailedLoginAttempts(id: string): Promise<void> {
    await this.db(this.table)
      .where({ id })
      .increment('failed_login_attempts', 1);
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    await this.db(this.table)
      .where({ id })
      .update({
        failed_login_attempts: 0,
        locked_until: null
      });
  }

  async lockAccount(id: string, lockDuration: number = 30): Promise<void> {
    const lockUntil = new Date(Date.now() + lockDuration * 60 * 1000);
    await this.db(this.table)
      .where({ id })
      .update({ locked_until: lockUntil });
  }

  async isAccountLocked(id: string): Promise<boolean> {
    const user = await this.db(this.table)
      .where({ id })
      .select('locked_until', 'failed_login_attempts')
      .first();
    
    if (!user) return false;
    
    if (user.locked_until && new Date() < user.locked_until) {
      return true;
    }
    
    return user.failed_login_attempts >= 5;
  }

  async search(query: string, limit: number = 20): Promise<UserRow[]> {
    return this.db(this.table)
      .where('username', 'ilike', `%${query}%`)
      .andWhere({ is_active: true, is_verified: true })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async getStats(): Promise<{
    total_users: number;
    verified_users: number;
    active_users: number;
  }> {
    const stats = await this.db(this.table)
      .select(
        this.db.raw('COUNT(*) as total_users'),
        this.db.raw('COUNT(*) FILTER (WHERE is_verified = true) as verified_users'),
        this.db.raw('COUNT(*) FILTER (WHERE is_active = true) as active_users')
      )
      .first();
    
    return {
      total_users: parseInt(stats.total_users),
      verified_users: parseInt(stats.verified_users),
      active_users: parseInt(stats.active_users)
    };
  }
}