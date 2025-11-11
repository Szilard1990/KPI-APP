/*
  # Update RLS policies for anonymous access

  1. Changes
    - Drop existing authenticated-only policies
    - Add new policies that allow anonymous (anon) users to perform all operations
    - This allows the app to work without requiring user authentication

  2. Security Note
    - These policies allow anyone with the anon key to access the data
    - This is appropriate for internal company tools
    - For production with external users, consider adding authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view all evaluations" ON evaluari;
DROP POLICY IF EXISTS "Authenticated users can insert evaluations" ON evaluari;
DROP POLICY IF EXISTS "Authenticated users can delete evaluations" ON evaluari;
DROP POLICY IF EXISTS "Authenticated users can update evaluations" ON evaluari;

-- Create new policies for anonymous access
CREATE POLICY "Anyone can view evaluations"
  ON evaluari FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert evaluations"
  ON evaluari FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete evaluations"
  ON evaluari FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update evaluations"
  ON evaluari FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);