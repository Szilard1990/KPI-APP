/*
  # Add evaluation IDs to trimestre table

  1. Changes
    - Add `evaluari_ids` column to `trimestre` table
      - Type: jsonb (stores array of evaluation IDs)
      - Description: List of evaluation IDs included in this trimester
      - Default: empty array

  2. Notes
    - This allows tracking which specific evaluations were included when closing a trimester
    - Helps generate detailed PDF reports with task information
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trimestre' AND column_name = 'evaluari_ids'
  ) THEN
    ALTER TABLE trimestre ADD COLUMN evaluari_ids jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
