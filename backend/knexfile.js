const path = require('path');

const baseConfig = {
  client: 'postgresql',
  migrations: {
    directory: path.join(__dirname, 'src/database/migrations'),
    extension: 'ts'
  },
  seeds: {
    directory: path.join(__dirname, 'src/database/seeds'),
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
  }
};

module.exports = {
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'meatsocial_dev',
      user: process.env.DB_USER || 'meatsocial',
      password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
      ssl: false
    },
    debug: process.env.NODE_ENV === 'development'
  },

  test: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'meatsocial_test',
      user: process.env.DB_USER || 'meatsocial',
      password: process.env.DB_PASSWORD || 'test_password',
      ssl: false
    }
  },

  production: {
    ...baseConfig,
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
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
    }
  }
};