import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, ArrowLeft } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface ClassItem {
  id: string;
  label: string;
  title: string;
  theme: string;
}

interface DayItem {
  id: string;
  date: string;
  specialTitle: string;
  classes: ClassItem[];
}

const WEEKDAYS = [
  { id: '1', label: 'Seg' },
  { id: '2', label: 'Ter' },
  { id: '3', label: 'Qua' },
  { id: '4', label: 'Qui' },
  { id: '5', label: 'Sex' },
];

export default function Planning() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('Geografia');
  const [grade, setGrade] = useState('6° ano');
  const [classRoom, setClassRoom] = useState('B');
  const [termNumber, setTermNumber] = useState('1º');
  const [term, setTerm] = useState('Bimestre');
  const [teacher, setTeacher] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [classesPerDay, setClassesPerDay] = useState(2);
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [days, setDays] = useState<DayItem[]>([
    {
      id: crypto.randomUUID(),
      date: '2026-07-14',
      specialTitle: '',
      classes: [
        { id: crypto.randomUUID(), label: 'Aula 1', title: 'Introdução ao Capítulo 7', theme: 'Tempo x Clima, Elementos do Clima' },
        { id: crypto.randomUUID(), label: 'Aula 2', title: 'Fatores do Clima', theme: 'Altitude, latitude, continentalidade' }
      ]
    }
  ]);

  const addDay = () => {
    setDays([...days, {
      id: crypto.randomUUID(),
      date: '',
      specialTitle: '',
      classes: [{ id: crypto.randomUUID(), label: 'Aula 1', title: '', theme: '' }]
    }]);
  };

  const removeDay = (id: string) => {
    setDays(days.filter(d => d.id !== id));
  };

  const updateDay = (id: string, field: keyof DayItem, value: any) => {
    setDays(days.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const addClass = (dayId: string) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        return {
          ...d,
          classes: [...d.classes, { id: crypto.randomUUID(), label: `Aula ${d.classes.length + 1}`, title: '', theme: '' }]
        };
      }
      return d;
    }));
  };

  const removeClass = (dayId: string, classId: string) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        return { ...d, classes: d.classes.filter(c => c.id !== classId) };
      }
      return d;
    }));
  };

  const updateClass = (dayId: string, classId: string, field: keyof ClassItem, value: string) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        return {
          ...d,
          classes: d.classes.map(c => c.id === classId ? { ...c, [field]: value } : c)
        };
      }
      return d;
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
  };

  const toggleWeekday = (id: string) => {
    setSelectedWeekdays(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const generateWithAI = async () => {
    if (!startDate || !endDate || !content) {
      alert("Por favor, preencha as datas e o conteúdo antes de gerar com IA.");
      return;
    }
    if (selectedWeekdays.length === 0) {
      alert("Por favor, selecione pelo menos um dia da semana.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      // Ler o calendário do localStorage
      let calendarData = {};
      try {
        const stored = localStorage.getItem('eduplan_v5');
        if (stored) {
          calendarData = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Failed to parse calendar data", e);
      }

      // Filtrar apenas os eventos que estão no intervalo de datas
      const start = new Date(startDate);
      const end = new Date(endDate);
      const calendarEvents = Object.entries(calendarData)
        .filter(([dateStr]) => {
          const d = new Date(dateStr);
          return d >= start && d <= end;
        })
        .map(([date, info]: any) => `${date}: ${info.type} - ${info.desc}`)
        .join('\n');

      const prompt = `
Você é um assistente de planejamento escolar.
Crie um planejamento de aulas para a disciplina de ${subject}, para a turma ${grade} ${classRoom}, no ${termNumber} ${term}.
O professor é ${teacher}.
O período do planejamento é de ${startDate} até ${endDate}.
As aulas ocorrem nos seguintes dias da semana: ${selectedWeekdays.map(d => WEEKDAYS.find(w => w.id === d)?.label).join(', ')}.
São ${classesPerDay} aula(s) por dia de aula.
O conteúdo a ser abordado é:
${content}

Abaixo estão os eventos do calendário escolar (feriados, provas, eventos, pontos facultativos) que ocorrem neste período:
${calendarEvents ? calendarEvents : "Nenhum evento especial no período."}

Regras importantes:
1. Distribua o conteúdo de forma lógica entre as datas.
2. Respeite os dias da semana informados e a quantidade de aulas por dia.
3. Não inclua finais de semana ou dias fora dos dias da semana informados.
4. LEIA OS EVENTOS DO CALENDÁRIO ACIMA. Se houver um feriado (holiday) ou ponto facultativo (optional) em um dia de aula, NÃO coloque conteúdo normal neste dia. Você pode pular o dia ou marcá-lo com o título do feriado/evento e deixar as aulas vazias ou com o tema do evento.
5. Se houver prova (exam) no dia, reserve as aulas para a prova e revisão, não avance com conteúdo novo.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                specialTitle: { type: Type.STRING, description: "Título especial se houver, ou vazio" },
                classes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING, description: "Ex: Aula 1" },
                      title: { type: Type.STRING, description: "Título da aula" },
                      theme: { type: Type.STRING, description: "Tema ou atividade" }
                    },
                    required: ["label", "title", "theme"]
                  }
                }
              },
              required: ["date", "specialTitle", "classes"]
            }
          }
        }
      });

      const jsonStr = response.text || "[]";
      const generatedDays = JSON.parse(jsonStr);
      
      const newDays = generatedDays.map((d: any) => ({
        id: crypto.randomUUID(),
        date: d.date || '',
        specialTitle: d.specialTitle || '',
        classes: (d.classes || []).map((c: any) => ({
          id: crypto.randomUUID(),
          label: c.label || '',
          title: c.title || '',
          theme: c.theme || ''
        }))
      }));

      setDays(newDays);
    } catch (error) {
      console.error("Erro ao gerar planejamento:", error);
      alert("Ocorreu um erro ao gerar o planejamento. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePlanText = () => {
    let text = `📅 Planejamento ${termNumber} ${term} – ${subject} – ${grade} ${classRoom}\n`;
    if (teacher) text += `👨‍🏫 Professor(a): ${teacher}\n`;
    text += `\n`;

    days.forEach(day => {
      const formattedDate = formatDate(day.date);
      if (day.specialTitle) {
        text += `${formattedDate} – 📋 ${day.specialTitle}\n`;
      } else {
        text += `${formattedDate}\n`;
      }

      day.classes.forEach(c => {
        text += `• ${c.label}: ${c.title}\n`;
        if (c.theme) {
          text += `Tema: ${c.theme}\n`;
        }
      });
      text += `________________________________________\n\n`;
    });

    return text;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatePlanText());
    alert('Plano copiado para a área de transferência!');
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 p-5 font-sans">
      <div className="bg-[#151b2d] p-4 rounded-lg mb-5 flex justify-between items-center border border-white/10">
        <h2 className="text-indigo-500 font-bold text-xl flex items-center gap-2">
          <button onClick={() => navigate('/')} className="hover:text-indigo-400"><ArrowLeft size={24} /></button>
          🎓 EduPlan AI - Planejamento
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className="space-y-6">
          <div className="bg-[#151b2d] p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-bold mb-4 text-teal-400">Informações Gerais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Disciplina</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Professor(a)</label>
                <input type="text" value={teacher} onChange={e => setTeacher(e.target.value)} className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Série</label>
                <input type="text" value={grade} onChange={e => setGrade(e.target.value)} className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Turma</label>
                <input type="text" value={classRoom} onChange={e => setClassRoom(e.target.value)} className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none" />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Período</label>
                  <div className="flex gap-2">
                    <select value={termNumber} onChange={e => setTermNumber(e.target.value)} className="w-1/3 p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none">
                      <option value="1º">1º</option>
                      <option value="2º">2º</option>
                      <option value="3º">3º</option>
                      <option value="4º">4º</option>
                    </select>
                    <select value={term} onChange={e => setTerm(e.target.value)} className="w-2/3 p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none">
                      <option value="Bimestre">Bimestre</option>
                      <option value="Trimestre">Trimestre</option>
                      <option value="Mês">Mês</option>
                      <option value="Semestre">Semestre</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Aulas por dia</label>
                  <input type="number" min="1" max="10" value={classesPerDay} onChange={e => setClassesPerDay(parseInt(e.target.value) || 1)} className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Dias da Semana</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(w => (
                    <button
                      key={w.id}
                      onClick={() => toggleWeekday(w.id)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedWeekdays.includes(w.id) ? 'bg-indigo-500 text-white' : 'bg-[#0a0f1c] text-slate-400 border border-gray-700 hover:border-indigo-500'}`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Data Inicial</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Data Final</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Conteúdo a Abordar</label>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  className="w-full p-2.5 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none h-24 resize-y"
                  placeholder="Ex: Tempo x Clima, Fatores do Clima, Massas de Ar..."
                />
              </div>
              <div className="col-span-2">
                <button 
                  onClick={generateWithAI}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-md font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isGenerating ? "Gerando com IA..." : "✨ Gerar Planejamento com IA"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-teal-400">Dias de Aula</h3>
              <button onClick={addDay} className="flex items-center gap-1 text-sm bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-md hover:bg-indigo-500/30 transition-colors">
                <Plus size={16} /> Adicionar Dia
              </button>
            </div>

            {days.map((day, index) => (
              <div key={day.id} className="bg-[#151b2d] p-5 rounded-xl border border-white/5 relative">
                <button onClick={() => removeDay(day.id)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 size={18} />
                </button>
                
                <div className="grid grid-cols-2 gap-4 mb-4 pr-8">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Data</label>
                    <input type="date" value={day.date} onChange={e => updateDay(day.id, 'date', e.target.value)} className="w-full p-2 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Título Especial (Opcional)</label>
                    <input type="text" placeholder="Ex: Avaliação Mensal" value={day.specialTitle} onChange={e => updateDay(day.id, 'specialTitle', e.target.value)} className="w-full p-2 bg-[#0a0f1c] text-white border border-gray-700 rounded-md focus:border-indigo-500 outline-none text-sm" />
                  </div>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-indigo-500/30">
                  {day.classes.map((c, cIndex) => (
                    <div key={c.id} className="relative bg-[#0a0f1c] p-3 rounded-lg border border-white/5">
                      <button onClick={() => removeClass(day.id, c.id)} className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                        <div className="md:col-span-1">
                          <input type="text" placeholder="Aula 1" value={c.label} onChange={e => updateClass(day.id, c.id, 'label', e.target.value)} className="w-full p-2 bg-transparent text-white border-b border-gray-700 focus:border-indigo-500 outline-none text-sm font-bold" />
                        </div>
                        <div className="md:col-span-2">
                          <input type="text" placeholder="Título (Ex: Introdução...)" value={c.title} onChange={e => updateClass(day.id, c.id, 'title', e.target.value)} className="w-full p-2 bg-transparent text-white border-b border-gray-700 focus:border-indigo-500 outline-none text-sm" />
                        </div>
                        <div className="md:col-span-3">
                          <input type="text" placeholder="Tema/Atividade" value={c.theme} onChange={e => updateClass(day.id, c.id, 'theme', e.target.value)} className="w-full p-2 bg-transparent text-slate-300 border-b border-gray-700 focus:border-indigo-500 outline-none text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addClass(day.id)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2">
                    <Plus size={14} /> Adicionar Aula neste dia
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#151b2d] p-6 rounded-xl border border-white/5 flex flex-col h-[calc(100vh-120px)] sticky top-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-teal-400">Preview do Plano</h3>
            <button onClick={copyToClipboard} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-bold transition-colors text-sm">
              <Copy size={16} /> Copiar Texto
            </button>
          </div>
          <div className="flex-1 bg-[#0a0f1c] border border-gray-700 rounded-lg p-5 overflow-auto font-mono text-sm whitespace-pre-wrap text-slate-300">
            {generatePlanText()}
          </div>
        </div>
      </div>
    </div>
  );
}
