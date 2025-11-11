/*
  # Fix evaluari table ID to use auto-increment sequence

  1. Changes
    - Create a sequence for evaluari ID generation
    - Set the sequence to start from the max existing ID + 1
    - Set the default value for id column to use the sequence
    - This allows new evaluations to automatically get IDs

  2. Important Notes
    - Existing data is preserved
    - Future inserts will automatically get sequential IDs
    - No need to manually provide ID values
*/

-- Create a sequence for the evaluari ID if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'evaluari_id_seq') THEN
    -- Get the max ID from existing data, default to 0 if table is empty
    EXECUTE 'CREATE SEQUENCE evaluari_id_seq START WITH ' ||
            COALESCE((SELECT MAX(id) + 1 FROM evaluari), 1);
  END IF;
END $$;

-- Alter the id column to use the sequence as default
ALTER TABLE evaluari
  ALTER COLUMN id SET DEFAULT nextval('evaluari_id_seq');

-- Set the sequence owner to the id column (for proper dependency management)
ALTER SEQUENCE evaluari_id_seq OWNED BY evaluari.id;
