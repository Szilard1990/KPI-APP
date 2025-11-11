/*
  # Create Trimestre Table for Quarterly Bonus Reports

  ## Overview
  This migration creates a table to store closed quarterly periods (trimestre) for employee bonus calculations.
  Each trimestru represents a 3-month period with calculated average scores and bonuses.

  ## New Tables
  - `trimestre`
    - `id` (bigint, primary key) - Unique identifier for the trimestru
    - `nume_angajat` (text) - Employee name
    - `luna_start` (text) - Starting month of the quarter (e.g., "Noiembrie")
    - `luna_end` (text) - Ending month of the quarter (e.g., "Ianuarie")
    - `an_start` (integer) - Starting year
    - `an_end` (integer) - Ending year
    - `nr_evaluari` (integer) - Total number of evaluations in this quarter
    - `scor_mediu` (numeric) - Average score percentage across all evaluations
    - `bonus_mediu` (numeric) - Average bonus percentage awarded
    - `data_inchidere` (timestamptz) - When the quarter was closed
    - `observatii` (text) - Optional notes about the quarter

  ## Security
  - Enable RLS on `trimestre` table
  - Add policy for anonymous users to read all trimestre records
  - Add policy for anonymous users to insert new trimestre records
  - Add policy for anonymous users to delete trimestre records
*/

CREATE TABLE IF NOT EXISTS trimestre (
  id bigint PRIMARY KEY,
  nume_angajat text NOT NULL,
  luna_start text NOT NULL,
  luna_end text NOT NULL,
  an_start integer NOT NULL,
  an_end integer NOT NULL,
  nr_evaluari integer NOT NULL DEFAULT 0,
  scor_mediu numeric NOT NULL DEFAULT 0,
  bonus_mediu numeric NOT NULL DEFAULT 0,
  data_inchidere timestamptz DEFAULT now(),
  observatii text DEFAULT ''
);

ALTER TABLE trimestre ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous to read all trimestre"
  ON trimestre
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert trimestre"
  ON trimestre
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to delete trimestre"
  ON trimestre
  FOR DELETE
  TO anon
  USING (true);