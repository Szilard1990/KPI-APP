import { supabase } from '../lib/supabase';
import type { Trimestru } from '../lib/supabase';

export const trimestreService = {
  async getAll() {
    const { data, error } = await supabase
      .from('trimestre')
      .select('*')
      .order('data_inchidere', { ascending: false });

    if (error) throw error;
    return data as Trimestru[];
  },

  async create(trimestru: Omit<Trimestru, 'created_at'>) {
    const { data, error } = await supabase
      .from('trimestre')
      .insert([trimestru])
      .select()
      .single();

    if (error) throw error;
    return data as Trimestru;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('trimestre')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
