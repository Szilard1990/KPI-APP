import { supabase } from '../lib/supabase';
import type { Evaluare } from '../lib/supabase';

export const evaluariService = {
  async getAll() {
    const { data, error } = await supabase
      .from('evaluari')
      .select('*')
      .order('data_adaugare', { ascending: false });

    if (error) throw error;
    return data as Evaluare[];
  },

  async create(evaluare: Omit<Evaluare, 'id' | 'data_adaugare' | 'created_at'>) {
    const { data, error } = await supabase
      .from('evaluari')
      .insert([evaluare])
      .select()
      .single();

    if (error) throw error;
    return data as Evaluare;
  },

  async update(id: number, evaluare: Partial<Evaluare>) {
    const { data, error } = await supabase
      .from('evaluari')
      .update(evaluare)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Evaluare;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('evaluari')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
