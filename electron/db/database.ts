import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { runMigrations } from './migrations'

let _db: InstanceType<typeof Database> | null = null

export function getDb(): InstanceType<typeof Database> {
  if (_db) return _db
  const dbPath = path.join(app.getPath('userData'), 'lucidgit.db')
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.exec(`
    CREATE TABLE IF NOT EXISTS dep_nodes (
      cache_key    TEXT NOT NULL,
      package_name TEXT NOT NULL,
      file_path    TEXT NOT NULL,
      asset_class  TEXT NOT NULL DEFAULT '',
      hard_refs    TEXT NOT NULL DEFAULT '[]',
      soft_refs    TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (cache_key, package_name)
    );
    CREATE INDEX IF NOT EXISTS idx_dep_nodes_cache ON dep_nodes (cache_key);
  `)
  runMigrations(_db)
  return _db
}
