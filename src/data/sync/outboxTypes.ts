export type MutationAction = 'insert' | 'update' | 'delete';
export type MutationStatus = 'pending' | 'in_flight' | 'failed' | 'dead_letter';

export interface OutboxMutation {
  id: string;
  table: string;
  entityId: string;
  action: MutationAction;
  payload: Record<string, unknown>;
  hlc: string;
  idempotencyKey: string;
  retryCount: number;
  status: MutationStatus;
  lastAttemptAt?: string | null;
  error?: string | null;
  createdAt: string;

  // Compatibility aliases with v1 schema
  table_name?: string;
  record_id?: string;
  created_at?: string;
}

