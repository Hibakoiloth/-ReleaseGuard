// SQLite connection will be wired in Phase 3 (database schema).
// Repositories use in-memory stores until then.
export type Database = Record<string, never>;

export let db: Database | null = null;
