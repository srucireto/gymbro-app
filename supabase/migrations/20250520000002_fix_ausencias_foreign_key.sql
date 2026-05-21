-- Remove foreign key constraint on ausencias.user_id
-- Since we're not using authentication, this constraint blocks inserts
ALTER TABLE ausencias DROP CONSTRAINT IF EXISTS ausencias_user_id_fkey;

-- Make user_id nullable for now (we can add it back when auth is implemented)
ALTER TABLE ausencias ALTER COLUMN user_id DROP NOT NULL;
