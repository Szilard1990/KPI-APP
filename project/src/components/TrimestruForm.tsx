import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Calendar, CheckSquare, Square } from 'lucide-react';
import type { Evaluare } from '../lib/supabase';

interface TrimestruFormProps {
  evaluari: Evaluare[];
  lunile: string[];
  onSubmit: (trimestru: any) => void;
  onClose: () => void;
}

export default function TrimestruForm({ evaluari, lunile, onSubmit, onClose }: TrimestruFormProps) {
  const [formData, setFormData] = useState({
    nume_angajat: '',
    luna_start: lunile[0],
    luna_end: lunile[2],
    an_start: new Date().getFullYear(),
    an_end: new Date().getFullYear(),
  });
  const [selectedEvaluari, setSelectedEvaluari] = useState<number[]>([]);
  const [availableEvaluari, setAvailableEvaluari] = useState<Evaluare[]>([]);

  const angajatiUnici = [...new Set(evaluari.map(ev => ev.nume_angajat))];

  const updateAvailableEvaluari = () => {
    if (!formData.nume_angajat) {
      setAvailableEvaluari([]);
      setSelectedEvaluari([]);
      return;
    }

    const indexStart = lunile.indexOf(formData.luna_start);
    const indexEnd = lunile.indexOf(formData.luna_end);

    const filtered = evaluari.filter(ev => {
      if (ev.nume_angajat !== formData.nume_angajat) return false;
      const indexLuna = lunile.indexOf(ev.luna_evaluata);
      return indexLuna >= indexStart && indexLuna <= indexEnd;
    });

    setAvailableEvaluari(filtered);
    setSelectedEvaluari(filtered.map(ev => ev.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nume_angajat || !formData.luna_start || !formData.luna_end) {
      alert('Completează toate câmpurile obligatorii!');
      return;
    }

    if (selectedEvaluari.length === 0) {
      alert('Selectează cel puțin o evaluare pentru a închide trimestrul!');
      return;
    }

    const evaluariSelectate = evaluari.filter(ev => selectedEvaluari.includes(ev.id));

    const scor_mediu = Math.round(
      evaluariSelectate.reduce((sum, ev) => sum + ev.procentaj_final, 0) / evaluariSelectate.length
    );
    const bonus_mediu = Math.round(
      (evaluariSelectate.reduce((sum, ev) => sum + ev.bonus_final, 0) / evaluariSelectate.length) * 100
    ) / 100;

    onSubmit({
      ...formData,
      scor_mediu,
      bonus_mediu,
      evaluari_ids: selectedEvaluari,
      data_inchidere: new Date().toISOString(),
    });
  };

  const toggleEvaluare = (id: number) => {
    setSelectedEvaluari(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedEvaluari.length === availableEvaluari.length) {
      setSelectedEvaluari([]);
    } else {
      setSelectedEvaluari(availableEvaluari.map(ev => ev.id));
    }
  };

  useEffect(() => {
    updateAvailableEvaluari();
  }, [formData.nume_angajat, formData.luna_start, formData.luna_end]);

  return (
    <div className="bg-white rounded-xl shadow-2xl w-full border border-slate-200">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 rounded-t-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Închide Trimestru</h3>
              <p className="text-green-100 text-sm mt-1">Selectează perioada și angajatul</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div>
          <label className="block text-base font-semibold text-slate-800 mb-3">
            Angajat *
          </label>
          <select
            value={formData.nume_angajat}
            onChange={(e) => setFormData({ ...formData, nume_angajat: e.target.value })}
            className="w-full px-5 py-4 text-lg border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
            required
          >
            <option value="">Selectează angajat</option>
            {angajatiUnici.map(nume => (
              <option key={nume} value={nume}>{nume}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-3">
              Luna Start *
            </label>
            <select
              value={formData.luna_start}
              onChange={(e) => setFormData({ ...formData, luna_start: e.target.value })}
              className="w-full px-5 py-4 text-lg border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              required
            >
              {lunile.map(luna => (
                <option key={luna} value={luna}>{luna}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-800 mb-3">
              An Start *
            </label>
            <input
              type="number"
              value={formData.an_start}
              onChange={(e) => setFormData({ ...formData, an_start: parseInt(e.target.value) })}
              className="w-full px-5 py-4 text-lg border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              required
              min="2020"
              max="2100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-3">
              Luna End *
            </label>
            <select
              value={formData.luna_end}
              onChange={(e) => setFormData({ ...formData, luna_end: e.target.value })}
              className="w-full px-5 py-4 text-lg border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              required
            >
              {lunile.map(luna => (
                <option key={luna} value={luna}>{luna}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-800 mb-3">
              An End *
            </label>
            <input
              type="number"
              value={formData.an_end}
              onChange={(e) => setFormData({ ...formData, an_end: parseInt(e.target.value) })}
              className="w-full px-5 py-4 text-lg border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              required
              min="2020"
              max="2100"
            />
          </div>
        </div>

        {availableEvaluari.length > 0 && (
          <div className="border-2 border-emerald-200 rounded-lg p-6 bg-emerald-50/50">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-base font-semibold text-slate-800">
                Selectează Evaluări ({selectedEvaluari.length}/{availableEvaluari.length})
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                {selectedEvaluari.length === availableEvaluari.length ? (
                  <>
                    <Square size={16} />
                    Deselectează Tot
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} />
                    Selectează Tot
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableEvaluari.map(ev => (
                <label
                  key={ev.id}
                  className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-emerald-300 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvaluari.includes(ev.id)}
                    onChange={() => toggleEvaluare(ev.id)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{ev.luna_evaluata} {ev.an_evaluat}</span>
                      <span className="text-sm text-slate-600">- {ev.nume_proiect}</span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Task: {ev.denumire_task} | Scor: {ev.procentaj_final}% | Bonus: {ev.bonus_final}%
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 -mx-8 -mb-8 p-6 rounded-b-xl mt-8">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 text-lg bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} />
              Înapoi
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 text-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Calendar size={20} />
              Închide Trimestru
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
