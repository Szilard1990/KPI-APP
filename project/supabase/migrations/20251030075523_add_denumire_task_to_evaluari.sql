/*
  # Add task name column to evaluations

  1. Changes
    - Add `denumire_task` column to `evaluari` table
      - Type: text
      - Description: Name/description of the task being evaluated
      - Default: empty string

  2. Notes
    - This allows tracking individual tasks within project evaluations
    - Helps identify which specific tasks were completed during trimester closure
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluari' AND column_name = 'denumire_task'
  ) THEN
    ALTER TABLE evaluari ADD COLUMN denumire_task text DEFAULT '';
  END IF;
END $$;
