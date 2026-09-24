DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'dokumen' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE dokumen ADD COLUMN deleted_at TIMESTAMP NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'dokumen' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE dokumen ADD COLUMN deleted_by INTEGER NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'dokumen' AND column_name = 'deleted_reason'
  ) THEN
    ALTER TABLE dokumen ADD COLUMN deleted_reason TEXT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'dokumen' AND constraint_name = 'dokumen_deleted_by_fkey'
  ) THEN
    ALTER TABLE dokumen
      ADD CONSTRAINT dokumen_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dokumen_deleted_at_idx ON dokumen(deleted_at);
CREATE INDEX IF NOT EXISTS dokumen_deleted_by_idx ON dokumen(deleted_by);
