CREATE TABLE IF NOT EXISTS super_admin_doc_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES super_admin_doc_files(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS super_admin_docs (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES super_admin_doc_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('link', 'text')),
  url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_docs_file_id ON super_admin_docs(file_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_doc_files_parent_id ON super_admin_doc_files(parent_id);
