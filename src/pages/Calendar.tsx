import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const COLORS = {
  normal: '#1e2642',
  weekend: '#84cc16',
  holiday: '#dc2626',
  optional: '#ea580c',
  exam: '#8b5cf6',
  event: '#ec4899',
  special: '#06b6d4',
};

export default function Calendar() {
  const navigate = useNavigate();
  const [db, setDb] = useState<Record<string, { type: string; desc: string }>>({});
  const [activeDate, setActiveDate] = useState<string>('');
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [dayType, setDayType] = useState('normal');
  const [dayDesc, setDayDesc] = useState('');
  const [importText, setImportText] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('eduplan_v5');
    if (stored) {
      try {
        setDb(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse db", e);
      }
    }
  }, []);

  const saveDb = (newDb: Record<string, { type: string; desc: string }>) => {
    setDb(newDb);
    localStorage.setItem('eduplan_v5', JSON.stringify(newDb));
  };

  const handleOpenDay = (dateIso: string) => {
    setActiveDate(dateIso);
    const info = db[dateIso];
    setDayType(info ? info.type : 'normal');
    setDayDesc(info ? info.desc : '');
    setIsDayModalOpen(true);
  };

  const handleSaveDay = () => {
    const newDb = { ...db };
    if (dayType === 'normal') {
      delete newDb[activeDate];
    } else {
      newDb[activeDate] = { type: dayType, desc: dayDesc };
    }
    saveDb(newDb);
    setIsDayModalOpen(false);
  };

  const handleProcessBatch = () => {
    const newDb = { ...db };
    const lines = importText.split('\n');
    let cat = 'holiday';
    lines.forEach(l => {
      const up = l.toUpperCase();
      if (up.includes("FERIADO")) cat = 'holiday';
      else if (up.includes("FACULTATIVO")) cat = 'optional';
      else if (up.includes("PROVA")) cat = 'exam';
      else if (up.includes("EVENTO")) cat = 'event';
      
      const m = l.match(/(\d{2})\/(\d{2})/);
      if (m) {
        const iso = `2026-${m[2]}-${m[1]}`;
        const desc = l.replace(/.*?\d{2}\/\d{2}/, "").replace(/[-–—:]/, "").trim();
        newDb[iso] = { type: cat, desc };
      }
    });
    saveDb(newDb);
    setIsImportModalOpen(false);
    setImportText('');
  };

  const handleClearAll = () => {
    if (window.confirm("Apagar todos os dados?")) {
      saveDb({});
    }
  };

  const renderMonth = (monthIndex: number) => {
    const monthName = MONTHS[monthIndex];
    const startDay = new Date(2026, monthIndex, 1).getDay();
    const totalDays = new Date(2026, monthIndex + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square bg-transparent"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const iso = `2026-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isWeekend = new Date(2026, monthIndex, d).getDay() % 6 === 0;
      const info = db[iso];
      
      let type = info ? info.type : (isWeekend ? 'weekend' : 'normal');
      let bgColor = COLORS[type as keyof typeof COLORS] || COLORS.normal;
      let textColor = (type === 'weekend' || type === 'special') ? '#000' : '#fff';
      if (type === 'normal') textColor = '#f1f5f9';

      days.push(
        <div
          key={iso}
          onClick={() => handleOpenDay(iso)}
          className="aspect-square flex items-center justify-center rounded text-[13px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: bgColor, color: textColor }}
          title={info ? info.desc : ''}
        >
          {d}
        </div>
      );
    }

    return (
      <div key={monthIndex} className="bg-[#151b2d] p-4 rounded-xl border border-white/5">
        <div className="text-center text-teal-400 font-bold mb-3 uppercase">{monthName}</div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 p-5 font-sans">
      <div className="bg-[#151b2d] p-4 rounded-lg mb-5 flex justify-between items-center border border-white/10">
        <h2 className="text-indigo-500 font-bold text-xl">🎓 EduPlan AI - Calendário</h2>
        <button 
          onClick={() => navigate('/planejamento')}
          className="px-5 py-2.5 rounded-md font-bold bg-indigo-500 text-white hover:opacity-80 transition-opacity"
        >
          Ir para Planejamento ➔
        </button>
      </div>

      <div className="flex flex-wrap gap-4 justify-center bg-[#151b2d] p-4 rounded-lg mb-5 border border-white/5">
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><div className="w-3.5 h-3.5 rounded-sm" style={{background: COLORS.normal}}></div> Dia Normal</div>
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><div className="w-3.5 h-3.5 rounded-sm" style={{background: COLORS.weekend}}></div> Fim de Semana</div>
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><div className="w-3.5 h-3.5 rounded-sm" style={{background: COLORS.holiday}}></div> Feriado Nacional</div>
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><div className="w-3.5 h-3.5 rounded-sm" style={{background: COLORS.optional}}></div> Ponto Facultativo</div>
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><div className="w-3.5 h-3.5 rounded-sm" style={{background: COLORS.exam}}></div> Prova/Avaliação</div>
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><div className="w-3.5 h-3.5 rounded-sm" style={{background: COLORS.event}}></div> Evento Escolar</div>
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><div className="w-3.5 h-3.5 rounded-sm" style={{background: COLORS.special}}></div> Atividade Especial</div>
      </div>

      <div className="mb-5 flex gap-2.5">
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="px-5 py-2.5 rounded-md font-bold bg-indigo-500 text-white hover:opacity-80 transition-opacity"
        >
          📥 Importar Lote
        </button>
        <button 
          onClick={handleClearAll}
          className="px-5 py-2.5 rounded-md font-bold bg-red-500 text-white hover:opacity-80 transition-opacity"
        >
          🗑️ Limpar Tudo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => renderMonth(i))}
      </div>

      {/* Modals */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center">
          <div className="bg-[#151b2d] p-6 rounded-xl w-full max-w-md border border-indigo-500">
            <h3 className="text-lg font-bold mb-4">Importação em Lote</h3>
            <textarea 
              className="w-full h-48 p-2.5 mb-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:outline-none focus:border-indigo-500"
              placeholder="Cole FERIADOS, PROVAS, etc..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button onClick={handleProcessBatch} className="w-full py-2.5 rounded-md font-bold bg-indigo-500 text-white hover:opacity-80 mb-2">Processar</button>
            <button onClick={() => setIsImportModalOpen(false)} className="w-full py-2.5 rounded-md font-bold bg-gray-800 text-white hover:opacity-80">Sair</button>
          </div>
        </div>
      )}

      {isDayModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center">
          <div className="bg-[#151b2d] p-6 rounded-xl w-full max-w-md border border-indigo-500">
            <h3 className="text-lg font-bold mb-4">{activeDate.split('-').reverse().join('/')}</h3>
            <select 
              className="w-full p-2.5 mb-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:outline-none focus:border-indigo-500"
              value={dayType}
              onChange={(e) => setDayType(e.target.value)}
            >
              <option value="normal">Dia Normal</option>
              <option value="holiday">Feriado Nacional</option>
              <option value="optional">Ponto Facultativo</option>
              <option value="exam">Prova/Avaliação</option>
              <option value="event">Evento Escolar</option>
              <option value="special">Atividade Especial</option>
            </select>
            <input 
              type="text" 
              className="w-full p-2.5 mb-4 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:outline-none focus:border-indigo-500"
              placeholder="Descrição do Evento"
              value={dayDesc}
              onChange={(e) => setDayDesc(e.target.value)}
            />
            <button onClick={handleSaveDay} className="w-full py-2.5 rounded-md font-bold bg-indigo-500 text-white hover:opacity-80 mb-2">Salvar</button>
            <button onClick={() => setIsDayModalOpen(false)} className="w-full py-2.5 rounded-md font-bold bg-gray-800 text-white hover:opacity-80">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
