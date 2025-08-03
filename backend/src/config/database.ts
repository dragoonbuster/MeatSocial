import { Knex } from 'knex';
import path from 'path';

const environment = process.env.NODE_ENV || 'development';

const baseConfig: Knex.Config = {
  client: 'postgresql',
  migrations: {
    directory: path.join(__dirname, '../database/migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
    schemaName: 'public'
  },
  seeds: {
    directory: path.join(__dirname, '../database/seeds'),
    extension: 'ts'
  },
  acquireConnectionTimeout: 60000,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    propagateCreateError: false
  },
  asyncStackTraces: environment === 'development'
};

const configs: Record<string, Knex.Config> = {
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'meatsocial_dev',
      user: process.env.DB_USER || 'meatsocial',
      password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
      ssl: false,
      timezone: 'UTC'
    },
    debug: process.env.DB_DEBUG === 'true'
  },

  test: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'meatsocial_test',
      user: process.env.DB_USER || 'meatsocial',
      password: process.env.DB_PASSWORD || 'test_password',
      ssl: false,
      timezone: 'UTC'
    },
    pool: {
      min: 1,
      max: 5
    }
  },

  production: {
    ...baseConfig,
    connection: process.env.DATABASE_URL ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    } : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      timezone: 'UTC'
    },
    pool: {
      min: 5,
      max: 50,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    asyncStackTraces: false
  }
};

const config = configs[environment];

if (!config) {
  throw new Error(`Unknown environment: ${environment}`);
}

export default config;