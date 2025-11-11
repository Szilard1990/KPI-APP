import React, { useState, useEffect } from 'react';
import { Plus, Download, Filter, Users, TrendingUp, Award, X, Calendar, CheckCircle2, Eye, Edit2 } from 'lucide-react';
import { evaluariService } from './services/evaluariService';
import { trimestreService } from './services/trimestreService';
import { Evaluare, Trimestru } from './lib/supabase';
import TrimestruForm from './components/TrimestruForm';
import PerformanceCharts from './components/PerformanceCharts';
import { supabase } from './lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const lunile = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

const calculProcentajSiBonus = (evaluare: Partial<Evaluare>) => {
  const {
    ore_planificate = 0,
    ore_realizate = 0,
    defecte_asamblare = 0,
    calitate = 'Bun',
    cable_management = 'Bun',
    zile_planificate = 0,
    zile_realizate = 0
  } = evaluare;

  // Scorul pornește de la 50 (neutru) și poate ajunge la 100 (maxim) sau 0 (minim)
  let scor_total = 50;

  // 1. Scor Eficiență Ore - max +30 puncte
  // Dacă termină cu 40% mai puține ore, primește +30 puncte
  let scor_ore = 0;
  if (ore_planificate > 0) {
    const eficienta_ore = (ore_planificate - ore_realizate) / ore_planificate;

    if (eficienta_ore >= 0.40) {
      // 40% sau mai mult economie = +30 puncte (maxim)
      scor_ore = 30;
    } else if (eficienta_ore > 0) {
      // Economie între 0% și 40% = proporțional între 0 și +30
      scor_ore = eficienta_ore * 75; // 0.40 * 75 = 30
    } else if (eficienta_ore === 0) {
      // Exact pe planificare = 0 puncte
      scor_ore = 0;
    } else {
      // Depășire timp = penalizare (până la -30)
      scor_ore = Math.max(eficienta_ore * 75, -30);
    }
  }

  // 2. Scor Eficiență Zile - max +30 puncte
  // Dacă termină cu 40% mai puține zile, primește +30 puncte
  let scor_zile = 0;
  if (zile_planificate > 0) {
    const eficienta_zile = (zile_planificate - zile_realizate) / zile_planificate;

    if (eficienta_zile >= 0.40) {
      // 40% sau mai mult economie = +30 puncte (maxim)
      scor_zile = 30;
    } else if (eficienta_zile > 0) {
      // Economie între 0% și 40% = proporțional între 0 și +30
      scor_zile = eficienta_zile * 75; // 0.40 * 75 = 30
    } else if (eficienta_zile === 0) {
      // Exact pe planificare = 0 puncte
      scor_zile = 0;
    } else {
      // Depășire timp = penalizare (până la -30)
      scor_zile = Math.max(eficienta_zile * 75, -30);
    }
  }

  // Verificăm dacă munca este exact pe planificare (ore și zile)
  const esteExactPePlanificare =
    ore_planificate > 0 &&
    zile_planificate > 0 &&
    ore_realizate === ore_planificate &&
    zile_realizate === zile_planificate;

  // 3. Scor Defecte - poate reduce până la -30 puncte
  let scor_defecte = 0;
  if (ore_planificate > 0) {
    const defecte_per_100_ore = (defecte_asamblare / ore_planificate) * 100;

    // Dacă e exact pe planificare, defectele nu dau bonus, doar penalizări
    if (defecte_per_100_ore === 0 && !esteExactPePlanificare) {
      // Fără defecte = +10 puncte bonus (doar dacă nu e exact pe planificare)
      scor_defecte = 10;
    } else if (defecte_per_100_ore <= 2) {
      // 0-2 defecte la 100 ore = 0 puncte (acceptabil)
      scor_defecte = 0;
    } else if (defecte_per_100_ore <= 5) {
      // 2-5 defecte = -10 puncte
      scor_defecte = -10;
    } else if (defecte_per_100_ore <= 10) {
      // 5-10 defecte = -20 puncte
      scor_defecte = -20;
    } else {
      // Peste 10 defecte = -30 puncte
      scor_defecte = -30;
    }
  }

  // 4. Scor Calitate - ±10 puncte (dar nu dă bonus dacă e exact pe planificare)
  let scor_calitate = 0;
  if (calitate === 'Bun' && !esteExactPePlanificare) {
    scor_calitate = 10;
  } else if (calitate === 'Mediu') {
    scor_calitate = 0;
  } else if (calitate === 'Slab') {
    scor_calitate = -10;
  }

  // 5. Scor Cable Management - ±10 puncte (dar nu dă bonus dacă e exact pe planificare)
  let scor_cable = 0;
  if (cable_management === 'Bun' && !esteExactPePlanificare) {
    scor_cable = 10;
  } else if (cable_management === 'Mediu') {
    scor_cable = 0;
  } else if (cable_management === 'Slab') {
    scor_cable = -10;
  }

  // Calculare scor final: pornește de la 50, adaugă/scade punctele
  scor_total = 50 + scor_ore + scor_zile + scor_defecte + scor_calitate + scor_cable;

  // Limitează între 0 și 100
  const procentaj_final = Math.min(Math.max(Math.round(scor_total * 100) / 100, 0), 100);

  // Bonus = procentaj_final * 15 / 100
  // La 100% scor = 15% bonus
  // La 0% scor = 0% bonus
  const bonus_final = Math.round((procentaj_final * 15 / 100) * 100) / 100;

  return { procentaj_final, bonus_final };
};

export default function App() {
  const [evaluari, setEvaluari] = useState<Evaluare[]>([]);
  const [trimestre, setTrimestre] = useState<Trimestru[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showTrimestru, setShowTrimestru] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEvaluare, setSelectedEvaluare] = useState<Evaluare | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [filtruRol, setFiltruRol] = useState('Toate');
  const [filtruLuna, setFiltruLuna] = useState('Toate');
  const [filtruStatus, setFiltruStatus] = useState('Toate');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrimestruScreen, setShowTrimestruScreen] = useState(false);
  const [selectedEvaluariIds, setSelectedEvaluariIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    nume_angajat: '',
    rol: 'Mecanic',
    nume_proiect: '',
    project_manager: '',
    designer_mecanic: '',
    denumire_task: '',
    ore_planificate: '',
    ore_realizate: '',
    defecte_asamblare: '',
    calitate: 'Bun',
    cable_management: 'Bun',
    zile_planificate: '',
    zile_realizate: '',
    luna_evaluata: lunile[new Date().getMonth()],
    observatii: ''
  });

  useEffect(() => {
    loadEvaluari();
    loadTrimestre();
  }, []);

  const loadEvaluari = async () => {
    try {
      setLoading(true);
      const data = await evaluariService.getAll();
      setEvaluari(data);
      setError(null);
    } catch (err) {
      setError('Eroare la încărcarea evaluărilor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrimestre = async () => {
    try {
      const data = await trimestreService.getAll();
      setTrimestre(data);
    } catch (err) {
      console.error('Eroare la încărcarea trimestrelor:', err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nume_angajat || !formData.nume_proiect) {
      alert('Completează toate câmpurile obligatorii!');
      return;
    }

    try {
      const evaluareData = {
        ore_planificate: parseFloat(formData.ore_planificate as string) || 0,
        ore_realizate: parseFloat(formData.ore_realizate as string) || 0,
        defecte_asamblare: parseFloat(formData.defecte_asamblare as string) || 0,
        zile_planificate: parseFloat(formData.zile_planificate as string) || 0,
        zile_realizate: parseFloat(formData.zile_realizate as string) || 0,
        calitate: formData.calitate,
        cable_management: formData.cable_management
      };

      const { procentaj_final, bonus_final } = calculProcentajSiBonus(evaluareData);

      const evaluareNoua = {
        nume_angajat: formData.nume_angajat,
        rol: formData.rol,
        nume_proiect: formData.nume_proiect,
        project_manager: formData.project_manager,
        designer_mecanic: formData.designer_mecanic,
        denumire_task: formData.denumire_task,
        ore_planificate: parseFloat(formData.ore_planificate as string) || 0,
        ore_realizate: parseFloat(formData.ore_realizate as string) || 0,
        defecte_asamblare: parseFloat(formData.defecte_asamblare as string) || 0,
        calitate: formData.calitate,
        cable_management: formData.cable_management,
        zile_planificate: parseFloat(formData.zile_planificate as string) || 0,
        zile_realizate: parseFloat(formData.zile_realizate as string) || 0,
        luna_evaluata: formData.luna_evaluata,
        procentaj_final,
        bonus_final,
        observatii: formData.observatii
      };

      await evaluariService.create(evaluareNoua);
      await loadEvaluari();

      setShowForm(false);
      setFormData({
        nume_angajat: '',
        rol: 'Mecanic',
        nume_proiect: '',
        project_manager: '',
        designer_mecanic: '',
        denumire_task: '',
        ore_planificate: '',
        ore_realizate: '',
        defecte_asamblare: '',
        calitate: 'Bun',
        cable_management: 'Bun',
        zile_planificate: '',
        zile_realizate: '',
        luna_evaluata: lunile[new Date().getMonth()],
        observatii: ''
      });
    } catch (err) {
      alert('Eroare la salvarea evaluării');
      console.error(err);
    }
  };

  const handleChange = (name: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const stergeEvaluare = async (id: number) => {
    if (window.confirm('Sigur vrei să ștergi această evaluare?')) {
      try {
        await evaluariService.delete(id);
        await loadEvaluari();
      } catch (err) {
        alert('Eroare la ștergerea evaluării');
        console.error(err);
      }
    }
  };

  const toggleEvaluareSelection = (id: number) => {
    setSelectedEvaluariIds(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const toggleAllEvaluari = () => {
    if (selectedEvaluariIds.length === evaluariFiltrate.length) {
      setSelectedEvaluariIds([]);
    } else {
      setSelectedEvaluariIds(evaluariFiltrate.map(ev => ev.id));
    }
  };

  const stergeEvaluariSelectate = async () => {
    if (selectedEvaluariIds.length === 0) {
      alert('Nu ai selectat nicio evaluare pentru ștergere!');
      return;
    }

    if (window.confirm(`Sigur vrei să ștergi ${selectedEvaluariIds.length} evaluări selectate?`)) {
      try {
        await Promise.all(selectedEvaluariIds.map(id => evaluariService.delete(id)));
        await loadEvaluari();
        setSelectedEvaluariIds([]);
        alert(`${selectedEvaluariIds.length} evaluări au fost șterse cu succes!`);
      } catch (err) {
        alert('Eroare la ștergerea evaluărilor');
        console.error(err);
      }
    }
  };

  const handleTrimestruSubmit = async (trimestruData: any) => {
    try {
      const trimestru: Omit<Trimestru, 'created_at'> = {
        id: Date.now(),
        nume_angajat: trimestruData.nume_angajat,
        luna_start: trimestruData.luna_start,
        luna_end: trimestruData.luna_end,
        an_start: trimestruData.an_start,
        an_end: trimestruData.an_end,
        nr_evaluari: trimestruData.evaluari_ids.length,
        scor_mediu: trimestruData.scor_mediu,
        bonus_mediu: trimestruData.bonus_mediu,
        data_inchidere: trimestruData.data_inchidere,
        observatii: '',
        evaluari_ids: trimestruData.evaluari_ids
      };

      await trimestreService.create(trimestru);
      await loadTrimestre();
      alert(`Trimestru închis cu succes!\n\nAngajat: ${trimestruData.nume_angajat}\nPerioada: ${trimestruData.luna_start} - ${trimestruData.luna_end}\nEvaluări: ${trimestruData.evaluari_ids.length}\nScor Mediu: ${trimestruData.scor_mediu}%\nBonus Mediu: ${trimestruData.bonus_mediu}%`);
      setShowTrimestruScreen(false);
    } catch (err) {
      alert('Eroare la închiderea trimestrului');
      console.error(err);
    }
  };

  const inchideTrimestru = async (numeAngajat: string, lunaStart: string, lunaEnd: string, evaluariSelectate: number[]) => {
    const evaluariTrimestru = evaluari.filter(ev => evaluariSelectate.includes(ev.id));

    if (evaluariTrimestru.length === 0) {
      alert('Nu există evaluări selectate pentru acest trimestru!');
      return;
    }

    const nrEvaluari = evaluariTrimestru.length;
    const scorMediu = evaluariTrimestru.reduce((sum, ev) => sum + ev.procentaj_final, 0) / nrEvaluari;
    const bonusMediu = evaluariTrimestru.reduce((sum, ev) => sum + ev.bonus_final, 0) / nrEvaluari;

    const indexStart = lunile.indexOf(lunaStart);
    const indexEnd = lunile.indexOf(lunaEnd);

    const currentYear = new Date().getFullYear();
    const anStart = indexStart > indexEnd ? currentYear - 1 : currentYear;
    const anEnd = currentYear;

    try {
      const trimestru: Omit<Trimestru, 'created_at'> = {
        id: Date.now(),
        nume_angajat: numeAngajat,
        luna_start: lunaStart,
        luna_end: lunaEnd,
        an_start: anStart,
        an_end: anEnd,
        nr_evaluari: nrEvaluari,
        scor_mediu: Math.round(scorMediu * 100) / 100,
        bonus_mediu: Math.round(bonusMediu * 100) / 100,
        data_inchidere: new Date().toISOString(),
        observatii: '',
        evaluari_ids: evaluariSelectate
      };

      await trimestreService.create(trimestru);
      await loadTrimestre();
      alert(`Trimestru închis cu succes!\n\nAngajat: ${numeAngajat}\nPerioada: ${lunaStart} - ${lunaEnd}\nEvaluări: ${nrEvaluari}\nScor Mediu: ${trimestru.scor_mediu}%\nBonus Mediu: ${trimestru.bonus_mediu}%`);
      setShowTrimestru(false);
    } catch (err) {
      alert('Eroare la închiderea trimestrului');
      console.error(err);
    }
  };

  const stergeTrimestru = async (id: number) => {
    if (window.confirm('Sigur vrei să ștergi acest trimestru?')) {
      try {
        await trimestreService.delete(id);
        await loadTrimestre();
      } catch (err) {
        alert('Eroare la ștergerea trimestrului');
        console.error(err);
      }
    }
  };

  const verificaEvaluareInTrimestru = (evaluare: Evaluare): boolean => {
    const indexLunaEv = lunile.indexOf(evaluare.luna_evaluata);

    return trimestre.some(trim => {
      if (trim.nume_angajat !== evaluare.nume_angajat) return false;

      const indexStart = lunile.indexOf(trim.luna_start);
      const indexEnd = lunile.indexOf(trim.luna_end);

      if (indexEnd >= indexStart) {
        return indexLunaEv >= indexStart && indexLunaEv <= indexEnd;
      } else {
        return indexLunaEv >= indexStart || indexLunaEv <= indexEnd;
      }
    });
  };

  const handleViewEvaluare = (evaluare: Evaluare) => {
    setSelectedEvaluare(evaluare);
    setEditMode(false);
    setShowViewModal(true);
  };

  const handleEditEvaluare = (evaluare: Evaluare) => {
    if (verificaEvaluareInTrimestru(evaluare)) {
      alert('Nu poți modifica această evaluare deoarece face parte dintr-un trimestru închis!');
      return;
    }

    setSelectedEvaluare(evaluare);
    setFormData({
      nume_angajat: evaluare.nume_angajat,
      rol: evaluare.rol,
      nume_proiect: evaluare.nume_proiect,
      project_manager: evaluare.project_manager,
      designer_mecanic: evaluare.designer_mecanic,
      denumire_task: evaluare.denumire_task,
      ore_planificate: evaluare.ore_planificate.toString(),
      ore_realizate: evaluare.ore_realizate.toString(),
      defecte_asamblare: evaluare.defecte_asamblare.toString(),
      calitate: evaluare.calitate,
      cable_management: evaluare.cable_management,
      zile_planificate: evaluare.zile_planificate.toString(),
      zile_realizate: evaluare.zile_realizate.toString(),
      luna_evaluata: evaluare.luna_evaluata,
      observatii: evaluare.observatii
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleUpdateEvaluare = async () => {
    if (!selectedEvaluare) return;

    if (!formData.nume_angajat || !formData.nume_proiect) {
      alert('Completează toate câmpurile obligatorii!');
      return;
    }

    try {
      const evaluareData = {
        ore_planificate: parseFloat(formData.ore_planificate as string) || 0,
        ore_realizate: parseFloat(formData.ore_realizate as string) || 0,
        defecte_asamblare: parseFloat(formData.defecte_asamblare as string) || 0,
        zile_planificate: parseFloat(formData.zile_planificate as string) || 0,
        zile_realizate: parseFloat(formData.zile_realizate as string) || 0,
        calitate: formData.calitate,
        cable_management: formData.cable_management
      };

      const { procentaj_final, bonus_final } = calculProcentajSiBonus(evaluareData);

      const evaluareActualizata = {
        ...selectedEvaluare,
        ...formData,
        ore_planificate: parseFloat(formData.ore_planificate as string) || 0,
        ore_realizate: parseFloat(formData.ore_realizate as string) || 0,
        defecte_asamblare: parseFloat(formData.defecte_asamblare as string) || 0,
        zile_planificate: parseFloat(formData.zile_planificate as string) || 0,
        zile_realizate: parseFloat(formData.zile_realizate as string) || 0,
        procentaj_final,
        bonus_final
      };

      await evaluariService.update(selectedEvaluare.id, evaluareActualizata);
      await loadEvaluari();

      setShowForm(false);
      setEditMode(false);
      setSelectedEvaluare(null);
      setFormData({
        nume_angajat: '',
        rol: 'Mecanic',
        nume_proiect: '',
        project_manager: '',
        designer_mecanic: '',
        denumire_task: '',
        ore_planificate: '',
        ore_realizate: '',
        defecte_asamblare: '',
        calitate: 'Bun',
        cable_management: 'Bun',
        zile_planificate: '',
        zile_realizate: '',
        luna_evaluata: lunile[new Date().getMonth()],
        observatii: ''
      });
    } catch (err) {
      alert('Eroare la actualizarea evaluării');
      console.error(err);
    }
  };

  const esteInTrimestru = (evaluareId: number): boolean => {
    return trimestre.some(trim => trim.evaluari_ids && trim.evaluari_ids.includes(evaluareId));
  };

  const evaluariFiltrate = evaluari.filter(ev => {
    const matchRol = filtruRol === 'Toate' || ev.rol === filtruRol;
    const matchLuna = filtruLuna === 'Toate' || ev.luna_evaluata === filtruLuna;

    let matchStatus = true;
    if (filtruStatus === 'In Trimestru') {
      matchStatus = esteInTrimestru(ev.id);
    } else if (filtruStatus === 'Disponibile') {
      matchStatus = !esteInTrimestru(ev.id);
    }

    return matchRol && matchLuna && matchStatus;
  });

  const generatePDFDocument = (trimestruId?: number): jsPDF | null => {
    if (trimestre.length === 0) {
      return null;
    }

    const trimestreToExport = trimestruId
      ? trimestre.filter(t => t.id === trimestruId)
      : trimestre;

    if (trimestreToExport.length === 0) {
      return null;
    }

    const doc = new jsPDF();

    trimestreToExport.forEach((trim, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.setFontSize(18);
      doc.text('Raport Trimestru KPI Profigram', 14, 20);

      doc.setFontSize(12);
      doc.text(`Angajat: ${trim.nume_angajat}`, 14, 35);
      doc.text(`Perioada: ${trim.luna_start} ${trim.an_start} - ${trim.luna_end} ${trim.an_end}`, 14, 42);
      doc.text(`Bonus Mediu: ${trim.bonus_mediu}%`, 14, 49);
      doc.text(`Data generare: ${new Date().toLocaleDateString('ro-RO')}`, 14, 56);

      const evaluariTrimestru = evaluari.filter(ev => trim.evaluari_ids?.includes(ev.id));

      if (evaluariTrimestru.length > 0) {
        doc.setFontSize(14);
        doc.text('Detalii Evaluari:', 14, 68);

        const tableData = evaluariTrimestru.map(ev => [
          ev.nume_proiect,
          ev.denumire_task || '-',
          ev.project_manager || '-',
          ev.designer_mecanic || '-',
          `${ev.ore_realizate}/${ev.ore_planificate}`,
          `${ev.zile_realizate}/${ev.zile_planificate}`,
          ev.defecte_asamblare.toString(),
          ev.calitate,
          ev.cable_management,
          ev.luna_evaluata,
          `${ev.procentaj_final}%`,
          `${ev.bonus_final}%`
        ]);

        autoTable(doc, {
          startY: 75,
          head: [['Proiect', 'Task', 'PM', 'Designer', 'Ore', 'Zile', 'Defecte', 'Calitate', 'Cable Mng', 'Luna', 'Scor', 'Bonus']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8
          },
          bodyStyles: {
            halign: 'center',
            fontSize: 7
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 25 },
            2: { cellWidth: 15 },
            3: { cellWidth: 15 },
            4: { cellWidth: 12 },
            5: { cellWidth: 12 },
            6: { cellWidth: 12 },
            7: { cellWidth: 15 },
            8: { cellWidth: 15 },
            9: { cellWidth: 15 },
            10: { cellWidth: 12 },
            11: { cellWidth: 12 }
          }
        });
      }
    });

    return doc;
  };

  const exportToPDF = (trimestruId?: number) => {
    const doc = generatePDFDocument(trimestruId);

    if (!doc) {
      alert('Nu există trimestre închise pentru export!');
      return;
    }

    const trimestreToExport = trimestruId
      ? trimestre.filter(t => t.id === trimestruId)
      : trimestre;

    const fileName = trimestruId
      ? `raport_trimestru_${trimestreToExport[0].nume_angajat.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      : `raport_trimestre_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(fileName);
  };

  const exportEvaluariSelectateToPDF = () => {
    if (selectedEvaluariIds.length === 0) {
      alert('Selectează cel puțin o evaluare!');
      return;
    }

    const evaluariSelectate = evaluari.filter(ev => selectedEvaluariIds.includes(ev.id));

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Raport Evaluări KPI Profigram', 14, 20);

    doc.setFontSize(12);
    doc.text(`Număr evaluări: ${evaluariSelectate.length}`, 14, 35);
    doc.text(`Data generare: ${new Date().toLocaleDateString('ro-RO')}`, 14, 42);

    const angajatiInRaport = [...new Set(evaluariSelectate.map(ev => ev.nume_angajat))];
    doc.text(`Angajați: ${angajatiInRaport.join(', ')}`, 14, 49);

    const tableData = evaluariSelectate.map(ev => [
      ev.nume_angajat,
      ev.rol,
      ev.nume_proiect,
      ev.denumire_task || '-',
      `${ev.ore_realizate}/${ev.ore_planificate}`,
      `${ev.zile_realizate}/${ev.zile_planificate}`,
      ev.defecte_asamblare.toString(),
      ev.calitate,
      ev.cable_management,
      ev.luna_evaluata,
      `${ev.procentaj_final}%`,
      `${ev.bonus_final}%`
    ]);

    autoTable(doc, {
      startY: 58,
      head: [[
        'Angajat',
        'Rol',
        'Proiect',
        'Task',
        'Ore R/P',
        'Zile R/P',
        'Defecte',
        'Calitate',
        'Cable Mng',
        'Luna',
        'Scor %',
        'Bonus %'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 15 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 12 },
        7: { cellWidth: 15 },
        8: { cellWidth: 15 },
        9: { cellWidth: 15 },
        10: { cellWidth: 12 },
        11: { cellWidth: 12 }
      }
    });

    const fileName = `raport_evaluari_selectate_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };


  const calculeazaMedie3Luni = (numeAngajat: string) => {
    const evaluariAngajat = evaluari
      .filter(ev => ev.nume_angajat === numeAngajat)
      .sort((a, b) => new Date(b.data_adaugare).getTime() - new Date(a.data_adaugare).getTime())
      .slice(0, 3);

    if (evaluariAngajat.length === 0) return { medie_scor: 0, medie_bonus: 0 };

    const medie_scor = evaluariAngajat.reduce((sum, ev) => sum + ev.procentaj_final, 0) / evaluariAngajat.length;
    const medie_bonus = evaluariAngajat.reduce((sum, ev) => sum + ev.bonus_final, 0) / evaluariAngajat.length;

    return { medie_scor: Math.round(medie_scor * 100) / 100, medie_bonus: Math.round(medie_bonus * 100) / 100 };
  };

  const angajatiUnici = [...new Set(evaluari.map(ev => ev.nume_angajat))];

  const getColorClass = (procentaj: number) => {
    if (procentaj >= 90) return 'text-green-600 bg-green-50';
    if (procentaj >= 75) return 'text-blue-600 bg-blue-50';
    if (procentaj >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-700/20 via-transparent to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-white text-lg font-semibold">Se încarcă evaluările...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-700/20 via-transparent to-transparent"></div>
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 text-center relative z-10 border border-slate-200/50">
          <p className="text-red-600 mb-4 font-semibold text-lg">{error}</p>
          <button
            onClick={loadEvaluari}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-2 rounded-lg shadow-lg font-semibold"
          >
            Încearcă din nou
          </button>
        </div>
      </div>
    );
  }

  if (showTrimestruScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-700/20 via-transparent to-transparent"></div>

        <div className="max-w-3xl mx-auto p-6 relative z-10 min-h-screen flex items-center justify-center">
          <TrimestruForm
            evaluari={evaluari}
            lunile={lunile}
            onSubmit={handleTrimestruSubmit}
            onClose={() => setShowTrimestruScreen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-700/20 via-transparent to-transparent"></div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 mb-6 border border-slate-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Award className="text-blue-600" size={36} />
                Evaluare KPI Profigram
              </h1>
              <p className="text-slate-700 mt-2 font-medium">Sistem de evaluare și bonusare angajați tehnici</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTrimestruScreen(true)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Calendar size={20} />
                Închide Trimestru
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus size={20} />
                Evaluare Nouă
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-200/50 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700 text-sm font-semibold">Total Evaluări</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{evaluari.length}</p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-200/50 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700 text-sm font-semibold">Mecanici</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {evaluari.filter(ev => ev.rol === 'Mecanic').length}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-200/50 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700 text-sm font-semibold">Electricieni</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {evaluari.filter(ev => ev.rol === 'Electrician').length}
                </p>
              </div>
              <TrendingUp className="text-orange-600" size={32} />
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-200/50 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700 text-sm font-semibold">Scor Mediu</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  {evaluari.length > 0
                    ? Math.round(evaluari.reduce((sum, ev) => sum + ev.procentaj_final, 0) / evaluari.length)
                    : 0}%
                </p>
              </div>
              <Award className="text-amber-600" size={32} />
            </div>
          </div>
        </div>

        {/* Performance Charts Section */}
        {evaluari.length > 0 && (
          <div className="mb-6">
            <PerformanceCharts evaluari={evaluari} trimestre={trimestre} lunile={lunile} />
          </div>
        )}

        {showForm && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 mb-6 border border-slate-200/50">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {editMode ? 'Editează Evaluare' : 'Adaugă Evaluare Nouă'}
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nume Angajat *</label>
                  <select
                    value={formData.nume_angajat}
                    onChange={(e) => handleChange('nume_angajat', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selectează angajat</option>
                    <option value="Antal Janos">Antal Janos</option>
                    <option value="Iconar Ovidiu">Iconar Ovidiu</option>
                    <option value="Filip Bogdan">Filip Bogdan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rol</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => handleChange('rol', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>Mecanic</option>
                    <option>Electrician</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nume Proiect *</label>
                  <input
                    type="text"
                    value={formData.nume_proiect}
                    onChange={(e) => handleChange('nume_proiect', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Project Manager</label>
                  <input
                    type="text"
                    value={formData.project_manager}
                    onChange={(e) => handleChange('project_manager', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Designer Mecanic</label>
                  <input
                    type="text"
                    value={formData.designer_mecanic}
                    onChange={(e) => handleChange('designer_mecanic', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Denumire Task</label>
                  <input
                    type="text"
                    value={formData.denumire_task}
                    onChange={(e) => handleChange('denumire_task', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Asamblare modul A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Luna Evaluată</label>
                  <select
                    value={formData.luna_evaluata}
                    onChange={(e) => handleChange('luna_evaluata', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {lunile.map(luna => <option key={luna}>{luna}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ore Planificate</label>
                  <input
                    type="number"
                    value={formData.ore_planificate}
                    onChange={(e) => handleChange('ore_planificate', e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ore Realizate</label>
                  <input
                    type="number"
                    value={formData.ore_realizate}
                    onChange={(e) => handleChange('ore_realizate', e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Defecte Asamblare</label>
                  <input
                    type="number"
                    value={formData.defecte_asamblare}
                    onChange={(e) => handleChange('defecte_asamblare', e.target.value)}
                    min="0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Calitate</label>
                  <select
                    value={formData.calitate}
                    onChange={(e) => handleChange('calitate', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>Bun</option>
                    <option>Slab</option>
                    <option>N/A</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cable Management</label>
                  <select
                    value={formData.cable_management}
                    onChange={(e) => handleChange('cable_management', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>Bun</option>
                    <option>Slab</option>
                    <option>N/A</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Zile Planificate</label>
                  <input
                    type="number"
                    value={formData.zile_planificate}
                    onChange={(e) => handleChange('zile_planificate', e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Zile Realizate</label>
                  <input
                    type="number"
                    value={formData.zile_realizate}
                    onChange={(e) => handleChange('zile_realizate', e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Observații</label>
                <textarea
                  value={formData.observatii}
                  onChange={(e) => handleChange('observatii', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={editMode ? handleUpdateEvaluare : handleSubmit}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  {editMode ? 'Actualizează Evaluarea' : 'Salvează Evaluarea'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditMode(false);
                    setSelectedEvaluare(null);
                    setFormData({
                      nume_angajat: '',
                      rol: 'Mecanic',
                      nume_proiect: '',
                      project_manager: '',
                      designer_mecanic: '',
                      ore_planificate: '',
                      ore_realizate: '',
                      defecte_asamblare: '',
                      calitate: 'Bun',
                      cable_management: 'Bun',
                      zile_planificate: '',
                      zile_realizate: '',
                      luna_evaluata: lunile[new Date().getMonth()],
                      observatii: ''
                    });
                  }}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-6 py-3 rounded-lg transition-all shadow-md font-semibold"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}

        {showTrimestru && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 mb-6 border border-slate-200/50">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Închide Trimestru (3 Luni)</h2>
            <div className="space-y-6">
              <p className="text-slate-700 font-medium">Selectează angajatul și cele 3 luni consecutive pentru a genera raportul trimestrial de bonus.</p>
              <TrimestruForm
                angajatiUnici={angajatiUnici}
                lunile={lunile}
                evaluari={evaluari}
                onInchide={inchideTrimestru}
                onAnuleaza={() => setShowTrimestru(false)}
              />
            </div>
          </div>
        )}

        {trimestre.length > 0 && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 mb-6 border border-slate-200/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={24} />
                Trimestre Închise ({trimestre.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Angajat</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Perioadă</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Nr. Evaluări</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Scor Mediu</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Bonus Mediu</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Data Închidere</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {trimestre.map(trim => (
                    <tr key={trim.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{trim.nume_angajat}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {trim.luna_start} {trim.an_start} - {trim.luna_end} {trim.an_end}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{trim.nr_evaluari}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getColorClass(trim.scor_mediu)}`}>
                          {trim.scor_mediu}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-green-600 font-bold text-lg">{trim.bonus_mediu}%</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(trim.data_inchidere).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => exportToPDF(trim.id)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Descarcă PDF individual"
                          >
                            <Download size={20} />
                          </button>
                          <button
                            onClick={() => stergeTrimestru(trim.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Șterge trimestrul"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 mb-6 border border-slate-200/50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-slate-700" />
              <span className="text-sm font-bold text-slate-800">Filtrare:</span>
            </div>

            <select
              value={filtruRol}
              onChange={(e) => setFiltruRol(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option>Toate</option>
              <option>Mecanic</option>
              <option>Electrician</option>
            </select>

            <select
              value={filtruLuna}
              onChange={(e) => setFiltruLuna(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option>Toate</option>
              {lunile.map(luna => <option key={luna}>{luna}</option>)}
            </select>

            <select
              value={filtruStatus}
              onChange={(e) => setFiltruStatus(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option>Toate</option>
              <option>Disponibile</option>
              <option>In Trimestru</option>
            </select>
          </div>
        </div>

        {angajatiUnici.length > 0 && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 mb-6 border border-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Performanță Angajați (Medie Ultimele 3 Luni)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Nume</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Scor Mediu %</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Bonus Mediu %</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Nr. Evaluări</th>
                  </tr>
                </thead>
                <tbody>
                  {angajatiUnici.map(nume => {
                    const { medie_scor, medie_bonus } = calculeazaMedie3Luni(nume);
                    const nrEvaluari = evaluari.filter(ev => ev.nume_angajat === nume).length;
                    return (
                      <tr key={nume} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-800">{nume}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getColorClass(medie_scor)}`}>
                            {medie_scor}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-blue-600 font-semibold">{medie_bonus}%</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{nrEvaluari}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-slate-200/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Toate Evaluările ({evaluariFiltrate.length})</h2>
            {selectedEvaluariIds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">
                  {selectedEvaluariIds.length} selectate
                </span>
                <button
                  onClick={exportEvaluariSelectateToPDF}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Download size={18} />
                  Descarcă PDF
                </button>
                <button
                  onClick={stergeEvaluariSelectate}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <X size={18} />
                  Șterge Selectate
                </button>
              </div>
            )}
          </div>
          {evaluariFiltrate.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nu există evaluări încă. Adaugă prima evaluare!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedEvaluariIds.length === evaluariFiltrate.length && evaluariFiltrate.length > 0}
                        onChange={toggleAllEvaluari}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Nume</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Rol</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Proiect</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Luna</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Ore P/R</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Defecte</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Scor %</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Bonus %</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluariFiltrate.map(ev => (
                    <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedEvaluariIds.includes(ev.id)}
                          onChange={() => toggleEvaluareSelection(ev.id)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{ev.nume_angajat}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          ev.rol === 'Mecanic' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {ev.rol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{ev.nume_proiect}</td>
                      <td className="py-3 px-4 text-slate-600">{ev.luna_evaluata}</td>
                      <td className="py-3 px-4 text-slate-600">{ev.ore_planificate} / {ev.ore_realizate}</td>
                      <td className="py-3 px-4 text-slate-600">{ev.defecte_asamblare}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getColorClass(ev.procentaj_final)}`}>
                          {ev.procentaj_final}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-green-600 font-bold text-lg">{ev.bonus_final}%</span>
                      </td>
                      <td className="py-3 px-4">
                        {esteInTrimestru(ev.id) ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
                            <CheckCircle2 size={14} />
                            În Trimestru
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Disponibil
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewEvaluare(ev)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Vizualizează detalii"
                          >
                            <Eye size={20} />
                          </button>
                          <button
                            onClick={() => handleEditEvaluare(ev)}
                            className="text-yellow-600 hover:text-yellow-800 transition-colors"
                            title="Editează evaluarea"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => stergeEvaluare(ev.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Șterge evaluarea"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showViewModal && selectedEvaluare && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Detalii Evaluare</h2>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedEvaluare(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Nume Angajat</label>
                    <p className="text-lg font-semibold text-slate-800">{selectedEvaluare.nume_angajat}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Rol</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.rol}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Nume Proiect</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.nume_proiect}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Project Manager</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.project_manager}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Designer Mecanic</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.designer_mecanic}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Luna Evaluată</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.luna_evaluata}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Ore Planificate</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.ore_planificate}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Ore Realizate</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.ore_realizate}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Defecte Asamblare</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.defecte_asamblare}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Calitate</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.calitate}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Cable Management</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.cable_management}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Zile Planificate</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.zile_planificate}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Zile Realizate</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.zile_realizate}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Data Adăugare</label>
                    <p className="text-lg text-slate-800">{new Date(selectedEvaluare.data_adaugare).toLocaleDateString('ro-RO')}</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-500 mb-1">Observații</label>
                    <p className="text-lg text-slate-800">{selectedEvaluare.observatii || 'N/A'}</p>
                  </div>

                  <div className="md:col-span-2 border-t pt-6 mt-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-blue-700 mb-2">Scor Final</label>
                        <p className="text-3xl font-bold text-blue-800">{selectedEvaluare.procentaj_final}%</p>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-green-700 mb-2">Bonus Final</label>
                        <p className="text-3xl font-bold text-green-800">{selectedEvaluare.bonus_final}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {verificaEvaluareInTrimestru(selectedEvaluare) && (
                  <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ Această evaluare face parte dintr-un trimestru închis și nu poate fi modificată.
                    </p>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  {!verificaEvaluareInTrimestru(selectedEvaluare) && (
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        handleEditEvaluare(selectedEvaluare);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow-md flex items-center gap-2"
                    >
                      <Edit2 size={20} />
                      Editează
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedEvaluare(null);
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg transition-colors"
                  >
                    Închide
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
