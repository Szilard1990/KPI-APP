import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { Evaluare, Trimestru } from '../lib/supabase';

interface PerformanceChartsProps {
  evaluari: Evaluare[];
  trimestre: Trimestru[];
  lunile: string[];
}

const COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444'
};

export default function PerformanceCharts({ evaluari, trimestre, lunile }: PerformanceChartsProps) {
  const dataByMonth = lunile.map(luna => {
    const evaluariLuna = evaluari.filter(ev => ev.luna_evaluata === luna);
    if (evaluariLuna.length === 0) return { luna: luna.substring(0, 3), scor: null, bonus: null };

    const scorMediu = evaluariLuna.reduce((sum, ev) => sum + ev.procentaj_final, 0) / evaluariLuna.length;
    const bonusMediu = evaluariLuna.reduce((sum, ev) => sum + ev.bonus_final, 0) / evaluariLuna.length;

    return {
      luna: luna.substring(0, 3),
      scor: Math.round(scorMediu),
      bonus: Math.round(bonusMediu * 10) / 10
    };
  });

  const angajatiUnici = [...new Set(evaluari.map(ev => ev.nume_angajat))];
  const topPerformers = angajatiUnici
    .map(nume => {
      const evaluariAngajat = evaluari.filter(ev => ev.nume_angajat === nume);
      const scorMediu = evaluariAngajat.reduce((sum, ev) => sum + ev.procentaj_final, 0) / evaluariAngajat.length;
      return {
        nume: nume.split(' ')[0],
        scor: Math.round(scorMediu)
      };
    })
    .sort((a, b) => b.scor - a.scor)
    .slice(0, 5);

  const mecanici = evaluari.filter(ev => ev.rol === 'Mecanic');
  const electricieni = evaluari.filter(ev => ev.rol === 'Electrician');

  const scorMecanici = mecanici.length > 0
    ? Math.round(mecanici.reduce((sum, ev) => sum + ev.procentaj_final, 0) / mecanici.length)
    : 0;
  const scorElectricieni = electricieni.length > 0
    ? Math.round(electricieni.reduce((sum, ev) => sum + ev.procentaj_final, 0) / electricieni.length)
    : 0;

  const dataByRole = [
    { name: 'Mecanici', scor: scorMecanici, count: mecanici.length },
    { name: 'Electricieni', scor: scorElectricieni, count: electricieni.length }
  ];

  const pieData = [
    { name: 'Mecanici', value: scorMecanici, count: mecanici.length },
    { name: 'Electricieni', value: scorElectricieni, count: electricieni.length }
  ];

  const trimestreData = trimestre
    .slice(-6)
    .map(t => ({
      perioada: `${t.luna_start.substring(0, 3)}-${t.luna_end.substring(0, 3)}`,
      scor: t.scor_mediu,
      bonus: t.bonus_mediu
    }));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-lg">
            <BarChart3 className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard Analiză Performanță</h2>
            <p className="text-blue-100 text-sm">Vizualizare completă a evoluției și performanței echipei</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
            <h3 className="text-lg font-bold text-slate-900">Evoluție Lunară (Ultimele 6 Luni)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dataByMonth.slice(-6)}>
              <defs>
                <linearGradient id="colorScor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorBonus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="luna" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Area
                type="monotone"
                dataKey="scor"
                stroke={COLORS.blue}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorScor)"
                name="Scor Mediu"
              />
              <Area
                type="monotone"
                dataKey="bonus"
                stroke={COLORS.green}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorBonus)"
                name="Bonus Mediu"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-8 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
            <h3 className="text-lg font-bold text-slate-900">Top 5 Performeri</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPerformers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis dataKey="nume" type="category" stroke="#64748b" width={80} style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="scor" radius={[0, 8, 8, 0]} name="Scor %">
                {topPerformers.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.orange : index === 1 ? COLORS.green : COLORS.blue} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
            <h3 className="text-lg font-bold text-slate-900">Performanță pe Roluri</h3>
          </div>
          <div className="flex items-center justify-between gap-8">
            <ResponsiveContainer width="50%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={COLORS.blue} />
                  <Cell fill={COLORS.orange} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Mecanici</span>
                  <span className="text-2xl font-bold text-blue-600">{scorMecanici}%</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">Scor Mediu • {mecanici.length} evaluări</p>
                <div className="w-full bg-blue-200 h-2 rounded-full mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${scorMecanici}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Electricieni</span>
                  <span className="text-2xl font-bold text-orange-600">{scorElectricieni}%</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">Scor Mediu • {electricieni.length} evaluări</p>
                <div className="w-full bg-orange-200 h-2 rounded-full mt-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full transition-all"
                    style={{ width: `${scorElectricieni}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {trimestreData.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-slate-900">Evoluție Trimestre Închise</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trimestreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="perioada" stroke="#64748b" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="scor"
                  stroke={COLORS.green}
                  strokeWidth={3}
                  dot={{ fill: COLORS.green, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Scor %"
                />
                <Line
                  type="monotone"
                  dataKey="bonus"
                  stroke={COLORS.blue}
                  strokeWidth={3}
                  dot={{ fill: COLORS.blue, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Bonus %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
