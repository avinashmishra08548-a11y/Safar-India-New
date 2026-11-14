/**
 * Legacy Firebase compatibility stub.
 * All booking operations and real-time status tracking now run exclusively on Supabase (`src/lib/supabase.ts`).
 * Firestore SDK initialization has been completely removed to prevent background connection errors.
 */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const db = null;
export const defaultDb = null;
export const auth = { currentUser: null };

export function handleFirestoreError(
  _error: unknown,
  _operationType: OperationType,
  _path: string | null
): void {
  // No-op: migrated to Supabase
}
