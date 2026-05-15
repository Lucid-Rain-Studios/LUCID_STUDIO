import type Database from 'better-sqlite3'

export function runMigrations(db: InstanceType<typeof Database>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lock_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_path     TEXT    NOT NULL,
      file_path     TEXT    NOT NULL,
      event_type    TEXT    NOT NULL,
      actor_login   TEXT    NOT NULL DEFAULT '',
      actor_name    TEXT    NOT NULL DEFAULT '',
      timestamp     INTEGER NOT NULL,
      duration_ms   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_lock_events_repo  ON lock_events (repo_path, timestamp);
    CREATE INDEX IF NOT EXISTS idx_lock_events_file  ON lock_events (repo_path, file_path);

    CREATE TABLE IF NOT EXISTS conflict_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_path     TEXT    NOT NULL,
      file_path     TEXT    NOT NULL,
      our_branch    TEXT    NOT NULL DEFAULT '',
      their_branch  TEXT    NOT NULL DEFAULT '',
      conflict_type TEXT    NOT NULL DEFAULT 'content',
      timestamp     INTEGER NOT NULL,
      resolved      INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_conflict_events_repo ON conflict_events (repo_path, timestamp);
    CREATE INDEX IF NOT EXISTS idx_conflict_events_file ON conflict_events (repo_path, file_path);

    CREATE TABLE IF NOT EXISTS studio_todos (
      id            TEXT PRIMARY KEY,
      workspace_id  TEXT    NOT NULL DEFAULT 'local',
      title         TEXT    NOT NULL,
      done          INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      deleted_at    INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_studio_todos_workspace ON studio_todos (workspace_id, updated_at);

    CREATE TABLE IF NOT EXISTS studio_daily_notes (
      day           TEXT PRIMARY KEY,
      workspace_id  TEXT    NOT NULL DEFAULT 'local',
      content       TEXT    NOT NULL DEFAULT '',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      deleted_at    INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_studio_daily_notes_workspace ON studio_daily_notes (workspace_id, updated_at);

    CREATE TABLE IF NOT EXISTS studio_time_entries (
      id            TEXT PRIMARY KEY,
      workspace_id  TEXT    NOT NULL DEFAULT 'local',
      day           TEXT    NOT NULL,
      started_at    INTEGER NOT NULL,
      stopped_at    INTEGER,
      duration_ms   INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      deleted_at    INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_studio_time_entries_day ON studio_time_entries (workspace_id, day, started_at);

    CREATE TABLE IF NOT EXISTS studio_files (
      id            TEXT PRIMARY KEY,
      workspace_id  TEXT    NOT NULL DEFAULT 'local',
      path          TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      extension     TEXT    NOT NULL DEFAULT '',
      size_bytes    INTEGER NOT NULL DEFAULT 0,
      mime_hint     TEXT    NOT NULL DEFAULT '',
      added_at      INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      deleted_at    INTEGER,
      UNIQUE(workspace_id, path)
    );
    CREATE INDEX IF NOT EXISTS idx_studio_files_workspace ON studio_files (workspace_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_studio_files_name ON studio_files (workspace_id, name);

    CREATE TABLE IF NOT EXISTS studio_sync_changes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type   TEXT    NOT NULL,
      entity_id     TEXT    NOT NULL,
      operation     TEXT    NOT NULL,
      changed_at    INTEGER NOT NULL,
      payload       TEXT    NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_studio_sync_changes_changed ON studio_sync_changes (changed_at);
  `)
}
