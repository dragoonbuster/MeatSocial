import { Knex, knex } from 'knex';
import config from '../config/database';

let dbConnection: Knex | null = null;

export function getDatabase(): Knex {
  if (!dbConnection) {
    dbConnection = knex(config);
    
    // Handle connection errors
    dbConnection.on('query-error', (error, obj) => {
      console.error('Database query error:', error);
      console.error('Query object:', obj);
    });
    
    // Test connection on startup
    dbConnection.raw('SELECT 1+1 as result')
      .then(() => {
        console.log('✅ Database connection established');
      })
      .catch((error) => {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
      });
  }
  
  return dbConnection;
}

export async function closeDatabase(): Promise<void> {
  if (dbConnection) {
    await dbConnection.destroy();
    dbConnection = null;
    console.log('Database connection closed');
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  return db.transaction(callback);
}

// Query logging in development
if (process.env.NODE_ENV === 'development') {
  const db = getDatabase();
  db.on('query', (query) => {
    console.log('SQL Query:', query.sql);
    if (query.bindings && query.bindings.length > 0) {
      console.log('Bindings:', query.bindings);
    }
  });
}

export default getDatabase;