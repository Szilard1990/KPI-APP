import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Evaluare {
  id: number;
  nume_angajat: string;
  rol: string;
  nume_proiect: string;
  denumire_task: string;
  project_manager: string;
  designer_mecanic: string;
  ore_planificate: number;
  ore_realizate: number;
  defecte_asamblare: number;
  calitate: string;
  cable_management: string;
  zile_planificate: number;
  zile_realizate: number;
  luna_evaluata: string;
  an_evaluat: number;
  procentaj_final: number;
  bonus_final: number;
  observatii: string;
  data_adaugare: string;
  created_at: string;
}

export interface Trimestru {
  id: number;
  nume_angajat: string;
  luna_start: string;
  luna_end: string;
  an_start: number;
  an_end: number;
  scor_mediu: number;
  bonus_mediu: number;
  nr_evaluari: number;
  evaluari_ids: number[];
  data_inchidere: string;
  created_at: string;
}
