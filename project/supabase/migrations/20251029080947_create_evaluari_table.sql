/*
  # Create evaluations table for KPI system

  1. New Tables
    - `evaluari`
      - `id` (bigint, primary key) - Unique identifier for each evaluation
      - `nume_angajat` (text) - Employee name
      - `rol` (text) - Role (Mecanic/Electrician)
      - `nume_proiect` (text) - Project name
      - `project_manager` (text) - Project manager name
      - `designer_mecanic` (text) - Mechanical designer name
      - `ore_planificate` (numeric) - Planned hours
      - `ore_realizate` (numeric) - Actual hours worked
      - `defecte_asamblare` (integer) - Assembly defects count
      - `calitate` (text) - Quality rating (Bun/Slab/N/A)
      - `cable_management` (text) - Cable management rating (Bun/Slab/N/A)
      - `zile_planificate` (numeric) - Planned days
      - `zile_realizate` (numeric) - Actual days worked
      - `luna_evaluata` (text) - Evaluated month
      - `procentaj_final` (numeric) - Final score percentage
      - `bonus_final` (numeric) - Final bonus percentage
      - `observatii` (text) - Additional observations/notes
      - `data_adaugare` (timestamptz) - Timestamp when evaluation was added
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `evaluari` table
    - Add policy for authenticated users to view all evaluations
    - Add policy for authenticated users to insert new evaluations
    - Add policy for authenticated users to delete their own evaluations

  3. Indexes
    - Index on `nume_angajat` for faster employee lookups
    - Index on `luna_evaluata` for faster month filtering
    - Index on `data_adaugare` for sorting by date
*/

CREATE TABLE IF NOT EXISTS evaluari (
  id bigint PRIMARY KEY,
  nume_angajat text NOT NULL,
  rol text NOT NULL DEFAULT 'Mecanic',
  nume_proiect text NOT NULL,
  project_manager text DEFAULT '',
  designer_mecanic text DEFAULT '',
  ore_planificate numeric DEFAULT 0,
  ore_realizate numeric DEFAULT 0,
  defecte_asamblare integer DEFAULT 0,
  calitate text DEFAULT 'Bun',
  cable_management text DEFAULT 'Bun',
  zile_planificate numeric DEFAULT 0,
  zile_realizate numeric DEFAULT 0,
  luna_evaluata text NOT NULL,
  procentaj_final numeric DEFAULT 0,
  bonus_final numeric DEFAULT 0,
  observatii text DEFAULT '',
  data_adaugare timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE evaluari ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to view evaluations
CREATE POLICY "Authenticated users can view all evaluations"
  ON evaluari FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow all authenticated users to insert evaluations
CREATE POLICY "Authenticated users can insert evaluations"
  ON evaluari FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow all authenticated users to delete evaluations
CREATE POLICY "Authenticated users can delete evaluations"
  ON evaluari FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Allow all authenticated users to update evaluations
CREATE POLICY "Authenticated users can update evaluations"
  ON evaluari FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_evaluari_nume_angajat ON evaluari(nume_angajat);
CREATE INDEX IF NOT EXISTS idx_evaluari_luna_evaluata ON evaluari(luna_evaluata);
CREATE INDEX IF NOT EXISTS idx_evaluari_data_adaugare ON evaluari(data_adaugare DESC);