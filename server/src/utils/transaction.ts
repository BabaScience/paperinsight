import mongoose, { ClientSession } from 'mongoose';
import { env } from '../config/env.js';

/**
 * Transaction Manager
 * Handles MongoDB transactions with automatic fallback for non-replica set environments
 */

export interface TransactionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Execute a function within a MongoDB transaction
 * Falls back to non-transactional execution in development if replica set is not available
 * 
 * @param fn - Function to execute within the transaction
 * @param options - Transaction options
 * @returns Result of the function
 */
export async function withTransaction<T>(
  fn: (session: ClientSession | null) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelayMs = 100 } = options;

  // In production, always use transactions
  // In development, try transactions but fall back if not supported
  const shouldUseTransaction = env.NODE_ENV === 'production' || await isReplicaSetAvailable();

  if (!shouldUseTransaction) {
    console.warn('⚠️ MongoDB replica set not available. Running without transaction.');
    return fn(null);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = await mongoose.startSession();

    try {
      let result: T;

      await session.withTransaction(async () => {
        result = await fn(session);
      }, {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
      });

      await session.endSession();
      return result!;

    } catch (error) {
      await session.endSession();
      lastError = error as Error;

      // Check if error is retryable
      if (isTransientError(error)) {
        console.warn(`⚠️ Transient transaction error (attempt ${attempt + 1}/${maxRetries}):`, (error as Error).message);
        
        if (attempt < maxRetries - 1) {
          await sleep(retryDelayMs * (attempt + 1)); // Exponential backoff
          continue;
        }
      }

      // Non-retryable error in development - fall back to non-transactional
      if (env.NODE_ENV === 'development' && isReplicaSetError(error)) {
        console.warn('⚠️ Transaction not supported. Falling back to non-transactional execution.');
        return fn(null);
      }

      throw error;
    }
  }

  throw lastError || new Error('Transaction failed after all retries');
}

/**
 * Check if MongoDB is running as a replica set
 */
let replicaSetAvailable: boolean | null = null;

async function isReplicaSetAvailable(): Promise<boolean> {
  if (replicaSetAvailable !== null) {
    return replicaSetAvailable;
  }

  try {
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) {
      replicaSetAvailable = false;
      return false;
    }

    const serverStatus = await adminDb.command({ replSetGetStatus: 1 });
    replicaSetAvailable = serverStatus.ok === 1;
    return replicaSetAvailable;
  } catch {
    replicaSetAvailable = false;
    return false;
  }
}

/**
 * Reset the replica set availability cache (useful for testing)
 */
export function resetReplicaSetCache(): void {
  replicaSetAvailable = null;
}

/**
 * Check if an error is a transient error that can be retried
 */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const transientCodes = [
    'TransientTransactionError',
    'UnknownTransactionCommitResult',
    'WriteConflict',
  ];

  const errorMessage = error.message || '';
  const errorName = error.name || '';

  return transientCodes.some(code => 
    errorMessage.includes(code) || errorName.includes(code)
  );
}

/**
 * Check if an error is related to replica set not being available
 */
function isReplicaSetError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const replicaSetErrors = [
    'not a replica set',
    'not running with replication',
    'Transaction numbers are only allowed',
    'read preference in a transaction must be primary',
  ];

  const errorMessage = (error.message || '').toLowerCase();

  return replicaSetErrors.some(msg => errorMessage.includes(msg.toLowerCase()));
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper for operations that should use session if available
 * This allows graceful degradation when transactions are not available
 */
export function withSession<T extends { session?: ClientSession }>(
  session: ClientSession | null,
  options: T
): T {
  if (session) {
    return { ...options, session };
  }
  return options;
}


