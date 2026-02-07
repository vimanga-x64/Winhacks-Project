import React, { useState, useEffect, useRef } from 'react';
import { Activity, Utensils, Unlock, Flame, HeartPulse, Edit2, Check, User } from 'lucide-react';

// --- Types ---
interface BaseEntry {
  id: string;
  loading: boolean;
  locked: boolean;
}

interface GainEntry extends BaseEntry {
  meal: string;
  input: string;
  calories: string | null;
}

interface LostEntry extends BaseEntry {
  activity: string;
  duration: string;
  calories: string | null;
}

interface OtherEntry extends BaseEntry {
  category: string;
  input: string;
  response: string | null;
}

const FitnessApp: React.FC = () => {
  // --- General Stats State ---
  const [isSummarized, setIsSummarized] = useState(false);
  const [editingBio, setEditingBio] = useState(false); // Toggle for bio editing
  
  const [stats, setStats] = useState({
    name: 'John Doe',
    age: '28',
    gender: 'male',
    weight: '82',
    height: '180',
  });
  const [metrics, setMetrics] = useState({ bmi: '', bmr: '' });

  // --- Columns State ---
  const [gainEntries, setGainEntries] = useState<GainEntry[]>([
    { id: '1', meal: 'Breakfast', input: '', calories: null, loading: false, locked: false }
  ]);
  const [lostEntries, setLostEntries] = useState<LostEntry[]>([
    { id: '1', activity: '', duration: '', calories: null, loading: false, locked: false }
  ]);
  const [otherEntries, setOtherEntries] = useState<OtherEntry[]>([
    { id: '1', category: '', input: '', response: null, loading: false, locked: false }
  ]);

  // --- Refs ---
  const gainInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const lostInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const otherInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // --- Debounce timers ---
  const gainTimers = useRef<{ [key: string]: number }>({});
  const lostTimers = useRef<{ [key: string]: number }>({});
  const otherTimers = useRef<{ [key: string]: number }>({});

  // --- Calculations ---
  useEffect(() => {
    const w = parseFloat(stats.weight);
    const h = parseFloat(stats.height);
    const a = parseFloat(stats.age);

    if (!w || !h) {
      setMetrics({ bmi: '--', bmr: '--' });
      return;
    }

    // BMI
    const hM = h / 100;
    const bmiVal = (w / (hM * hM)).toFixed(1);

    // BMR (Mifflin-St Jeor)
    let bmrVal = 0;
    if (stats.gender === 'male' && a) {
      bmrVal = 10 * w + 6.25 * h - 5 * a + 5;
    } else if (stats.gender === 'female' && a) {
      bmrVal = 10 * w + 6.25 * h - 5 * a - 161;
    }

    setMetrics({
      bmi: bmiVal,
      bmr: bmrVal > 0 ? bmrVal.toFixed(0) : '--',
    });
  }, [stats]);

  // --- Mock LLM Service ---
  const fetchLLMResponse = async (prompt: string, type: 'food' | 'activity' | 'other'): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (type === 'food') {
          const num = parseInt(prompt.replace(/\D/g, '')) || 1;
          if (prompt.includes('egg')) resolve(`${num * 70}`);
          else if (prompt.includes('chicken')) resolve('300');
          else resolve(`${Math.floor(Math.random() * 400) + 50}`);
        } 
        else if (type === 'activity') {
           resolve(`${Math.floor(Math.random() * 300) + 50}`);
        } 
        else {
           resolve("recorded");
        }
      }, 600);
    });
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // --- Handlers ---

  const handleGainEnter = async (index: number) => {
    if (isSummarized) return;
    const currentEntry = gainEntries[index];
    if (!currentEntry.input.trim()) return;

    const newEntries = [...gainEntries];
    newEntries[index].loading = true;
    setGainEntries(newEntries);

    const calories = await fetchLLMResponse(currentEntry.input, 'food');
    setGainEntries((prev) => prev.map((entry, i) => 
        i === index ? { ...entry, loading: false, calories: calories } : entry
    ));
  };

  const handleGainInput = (index: number, value: string) => {
    if (isSummarized) return;
    
    const newEntries = [...gainEntries];
    newEntries[index].input = value;
    setGainEntries(newEntries);

    // Clear existing timer
    if (gainTimers.current[newEntries[index].id]) {
      clearTimeout(gainTimers.current[newEntries[index].id]);
    }

    // If input is empty, clear calories
    if (!value.trim()) {
      newEntries[index].calories = null;
      newEntries[index].loading = false;
      setGainEntries(newEntries);
      return;
    }

    // Set new timer for debounce (1500ms)
    gainTimers.current[newEntries[index].id] = window.setTimeout(() => {
      handleGainEnter(index);
    }, 1500);
  };

  const handleLostEnter = async (index: number) => {
    if (isSummarized) return;
    const currentEntry = lostEntries[index];
    if (!currentEntry.activity.trim() || !currentEntry.duration.trim()) return; 

    const newEntries = [...lostEntries];
    newEntries[index].loading = true;
    setLostEntries(newEntries);

    const calories = await fetchLLMResponse(`${currentEntry.activity} ${currentEntry.duration}`, 'activity');
    setLostEntries((prev) => prev.map((entry, i) => 
        i === index ? { ...entry, loading: false, calories: calories } : entry
    ));
  };

  const handleLostInput = (index: number, field: 'activity' | 'duration', value: string) => {
    if (isSummarized) return;
    
    const newEntries = [...lostEntries];
    newEntries[index][field] = value;
    setLostEntries(newEntries);

    // Clear existing timer
    if (lostTimers.current[newEntries[index].id]) {
      clearTimeout(lostTimers.current[newEntries[index].id]);
    }

    // If both fields are empty, clear calories
    if (!newEntries[index].activity.trim() || !newEntries[index].duration.trim()) {
      newEntries[index].calories = null;
      newEntries[index].loading = false;
      setLostEntries(newEntries);
      return;
    }

    // Set new timer for debounce (1500ms)
    lostTimers.current[newEntries[index].id] = window.setTimeout(() => {
      handleLostEnter(index);
    }, 1500);
  };

  const handleOtherEnter = async (index: number) => {
    if (isSummarized) return;
    const currentEntry = otherEntries[index];
    if (!currentEntry.input.trim() || !currentEntry.category.trim()) return;

    const newEntries = [...otherEntries];
    newEntries[index].loading = true;
    setOtherEntries(newEntries);

    const resp = await fetchLLMResponse(currentEntry.input, 'other');
    setOtherEntries((prev) => prev.map((entry, i) => 
        i === index ? { ...entry, loading: false, response: resp } : entry
    ));
  };

  const handleOtherInput = (index: number, field: 'category' | 'input', value: string) => {
    if (isSummarized) return;
    
    const newEntries = [...otherEntries];
    newEntries[index][field] = value;
    setOtherEntries(newEntries);

    // Clear existing timer
    if (otherTimers.current[newEntries[index].id]) {
      clearTimeout(otherTimers.current[newEntries[index].id]);
    }

    // If both fields are empty, clear response
    if (!newEntries[index].input.trim() || !newEntries[index].category.trim()) {
      newEntries[index].response = null;
      newEntries[index].loading = false;
      setOtherEntries(newEntries);
      return;
    }

    // Set new timer for debounce (1500ms)
    otherTimers.current[newEntries[index].id] = window.setTimeout(() => {
      handleOtherEnter(index);
    }, 1500);
  };

  const toggleSummarize = () => {
    if (isSummarized) {
      setIsSummarized(false);
    } else {
      setGainEntries(prev => prev.filter(e => e.input.trim() !== ''));
      setLostEntries(prev => prev.filter(e => e.activity.trim() !== '' && e.duration.trim() !== ''));
      setOtherEntries(prev => prev.filter(e => e.input.trim() !== '' && e.category.trim() !== ''));
      setIsSummarized(true);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans selection:bg-red-900 selection:text-white pb-64">
      
      {/* --- Header --- */}
      <header className="border-b border-neutral-900 bg-neutral-950 sticky top-0 z-20">
        <div className="w-[90%] mx-auto py-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Flame className="text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]" size={32} />
                <h1 className="text-3xl font-black tracking-tighter text-white italic">
                    BURN<span className="text-red-600">TRACK</span>
                </h1>
            </div>
        </div>
      </header>

      <main className="w-[90%] mx-auto py-10 space-y-10">
        
        {/* --- Biometrics Bar (Output Only / Dashboard Style) --- */}
        <section className="bg-neutral-900/40 rounded-2xl border border-neutral-800/60 p-6 relative">
            <div className="absolute top-4 right-4">
                <button 
                    onClick={() => setEditingBio(!editingBio)}
                    className="text-neutral-600 hover:text-white transition-colors"
                >
                    {editingBio ? <Check size={18} className="text-green-500" /> : <Edit2 size={16} />}
                </button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-around gap-8 text-center md:text-left">
                
                {/* User Info */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 border border-neutral-700">
                        <User size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-1">Athlete</div>
                        {editingBio ? (
                            <input 
                                className="bg-neutral-800 text-white px-2 py-1 rounded border border-neutral-700 focus:border-red-500 outline-none w-32"
                                value={stats.name} 
                                onChange={e => setStats({...stats, name: e.target.value})} 
                            />
                        ) : (
                            <div className="text-2xl font-bold text-white tracking-tight">{stats.name}</div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-12 bg-neutral-800"></div>

                {/* Metrics Grid */}
                <div className="flex gap-12">
                    <div className="text-center">
                        <div className="text-[10px] text-neutral-500 font-black uppercase mb-1">Age</div>
                        {editingBio ? (
                            <input type="number" className="bg-neutral-800 text-white text-center rounded border border-neutral-700 w-16" value={stats.age} onChange={e => setStats({...stats, age: e.target.value})} />
                        ) : (
                            <div className="text-xl font-medium text-white">{stats.age}</div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-neutral-500 font-black uppercase mb-1">Weight (kg)</div>
                        {editingBio ? (
                            <input type="number" className="bg-neutral-800 text-white text-center rounded border border-neutral-700 w-16" value={stats.weight} onChange={e => setStats({...stats, weight: e.target.value})} />
                        ) : (
                            <div className="text-xl font-medium text-white">{stats.weight} <span className="text-xs text-neutral-600">kg</span></div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-neutral-500 font-black uppercase mb-1">Height (cm)</div>
                        {editingBio ? (
                            <input type="number" className="bg-neutral-800 text-white text-center rounded border border-neutral-700 w-16" value={stats.height} onChange={e => setStats({...stats, height: e.target.value})} />
                        ) : (
                            <div className="text-xl font-medium text-white">{stats.height} <span className="text-xs text-neutral-600">cm</span></div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-12 bg-neutral-800"></div>

                {/* Calculated Stats */}
                <div className="flex gap-8">
                     <div className="text-center">
                        <div className="text-[10px] text-red-500/80 font-black uppercase mb-1">BMI</div>
                        <div className="text-2xl font-bold text-white">{metrics.bmi}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-red-500/80 font-black uppercase mb-1">BMR</div>
                        <div className="text-2xl font-bold text-white">{metrics.bmr} <span className="text-xs text-neutral-600 font-normal">kcal</span></div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Main 3 Columns --- */}
        <div className="flex justify-between gap-8 w-[99%] mx-auto min-h-[600px] mt-8">
    
    {/* 1. Gain Calories */}
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col w-[30%] min-h-[600px]">
        <div className="p-5 border-b border-neutral-800 bg-neutral-900 flex justify-between items-center">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <Utensils size={16} className="text-emerald-500" /> 
                Gain Calories
            </h3>
        </div>
        
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {gainEntries.map((entry, idx) => (
                <div key={entry.id} className="group relative bg-neutral-950/50 text-white border border-neutral-800/50 p-3 rounded-lg hover:border-neutral-700 transition-colors">
                    {/* FLEX ROW: Items aligned center */}
                    <div className="flex items-center gap-3 w-full">
                        
                        {/* 1. Meal Select (Fixed Width) */}
                        <select 
                            disabled={isSummarized}
                            className="w-24 bg-transparent text-[10px] font-bold !text-white uppercase focus:text-emerald-400 outline-none cursor-pointer tracking-wide border-r border-neutral-800 mr-2"
                            style={{ color: 'white' }}
                            value={entry.meal}
                            onChange={(e) => {
                                const newE = [...gainEntries];
                                newE[idx].meal = e.target.value;
                                setGainEntries(newE);
                            }}
                        >
                            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(m => <option key={m} value={m} className="bg-neutral-900 !text-white" style={{ color: 'white', backgroundColor: '#171717' }}>{m}</option>)}
                        </select>

                        {/* 2. Food Input (Takes remaining space) */}
                        <input
                            ref={el => { gainInputRefs.current[entry.id] = el; }}
                            disabled={isSummarized || entry.loading}
                            type="text"
                            placeholder="e.g. 2 eggs..."
                            className="flex-1 min-w-0 bg-transparent text-sm !text-white placeholder:text-neutral-600 focus:outline-none"
                            style={{ color: 'white' }}
                            value={entry.input}
                            onChange={(e) => {
                                handleGainInput(idx, e.target.value);
                                // Auto-add new entry if this is the last one and user starts typing
                                if (idx === gainEntries.length - 1 && e.target.value.trim() && gainEntries[idx].input === '') {
                                    const newId = generateId();
                                    setGainEntries(prev => [...prev, { id: newId, meal: 'Snack', input: '', calories: null, loading: false, locked: false }]);
                                }
                            }}
                        />

                        {/* 3. Calories (Fixed Width aligned end) */}
                        <div className="min-w-[50px] text-right">
                            {entry.loading ? (
                                <span className="text-xs text-emerald-500/60 italic">Thinking...</span>
                            ) : entry.calories ? (
                                <span className="text-sm font-bold text-emerald-400">
                                    +{entry.calories}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>

    {/* 2. Calories Lost */}
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col w-[30%] min-h-[600px]">
        <div className="p-5 border-b border-neutral-800 bg-neutral-900 flex justify-between items-center">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <Flame size={16} className="text-red-500" /> 
                Calories Lost
            </h3>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {lostEntries.map((entry, idx) => (
                <div key={entry.id} className="group bg-neutral-950/50 border border-neutral-800/50 p-3 rounded-lg hover:border-neutral-700 transition-colors">
                    {/* FLEX ROW */}
                    <div className="flex items-center gap-3 w-full">
                        
                        {/* 1. Activity Name (Takes remaining space) */}
                        <input
                            ref={el => { lostInputRefs.current[`${entry.id}-act`] = el; }}
                            disabled={isSummarized || entry.loading}
                            type="text"
                            placeholder="Activity Name"
                            className="flex-1 min-w-0 bg-transparent text-sm font-medium !text-white placeholder:text-neutral-600 focus:outline-none"
                            style={{ color: 'white' }}
                            value={entry.activity}
                            onChange={(e) => {
                                handleLostInput(idx, 'activity', e.target.value);
                                // Auto-add new entry if this is the last one and user starts typing
                                if (idx === lostEntries.length - 1 && e.target.value.trim() && lostEntries[idx].activity === '') {
                                    const newId = generateId();
                                    setLostEntries(prev => [...prev, { id: newId, activity: '', duration: '', calories: null, loading: false, locked: false }]);
                                }
                            }}
                        />

                        {/* 2. Duration (Fixed Width) */}
                        <div className="w-16 border-l border-neutral-800 pl-2">
                            <input
                                disabled={isSummarized || entry.loading}
                                type="text"
                                placeholder="30m"
                                className="w-full bg-transparent text-xs !text-white placeholder:text-neutral-600 focus:outline-none text-center"
                                style={{ color: 'white' }}
                                value={entry.duration}
                                onChange={(e) => {
                                    handleLostInput(idx, 'duration', e.target.value);
                                }}
                            />
                        </div>

                        {/* 3. Calories (Fixed Width aligned end) */}
                        <div className="min-w-[50px] text-right">
                            {entry.loading ? (
                                <span className="text-xs text-red-500/60 italic">Thinking...</span>
                            ) : entry.calories ? (
                                <span className="text-sm font-bold text-red-400">
                                    -{entry.calories}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>

    {/* 3. Other Metrics */}
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col w-[30%] min-h-[600px]">
        <div className="p-5 border-b border-neutral-800 bg-neutral-900 flex justify-between items-center">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <HeartPulse size={16} className="text-purple-500" /> 
                Other Metrics
            </h3>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {otherEntries.map((entry, idx) => (
                <div key={entry.id} className="group bg-neutral-950/50 border border-neutral-800/50 p-3 rounded-lg hover:border-neutral-700 transition-colors">
                     {/* FLEX ROW */}
                     <div className="flex items-center gap-3 w-full">
                        
                        {/* 1. Category (Fixed Width) */}
                        <input
                            ref={el => { otherInputRefs.current[`${entry.id}-cat`] = el; }}
                            disabled={isSummarized || entry.loading}
                            type="text"
                            placeholder="CATEGORY"
                            className="w-24 bg-transparent text-[10px] font-bold !text-white uppercase tracking-wide placeholder:text-neutral-700 focus:outline-none border-r border-neutral-800 mr-2"
                            style={{ color: 'white' }}
                            value={entry.category}
                            onChange={(e) => {
                                handleOtherInput(idx, 'category', e.target.value);
                                // Auto-add new entry if this is the last one and user starts typing
                                if (idx === otherEntries.length - 1 && e.target.value.trim() && otherEntries[idx].category === '') {
                                    const newId = generateId();
                                    setOtherEntries(prev => [...prev, { id: newId, category: '', input: '', response: null, loading: false, locked: false }]);
                                }
                            }}
                        />

                        {/* 2. Value/Note (Takes remaining space) */}
                        <input
                            disabled={isSummarized || entry.loading}
                            type="text"
                            placeholder="Value / Note"
                            className="flex-1 min-w-0 bg-transparent text-sm !text-white placeholder:text-neutral-600 focus:outline-none"
                            style={{ color: 'white' }}
                            value={entry.input}
                            onChange={(e) => {
                                handleOtherInput(idx, 'input', e.target.value);
                            }}
                        />

                        {/* 3. Status Indicator */}
                        <div className="min-w-[20px] flex justify-end">
                            {entry.loading ? (
                                <span className="text-xs text-purple-500/60 italic">Thinking...</span>
                            ) : entry.response ? (
                               <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_purple]"></div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
</div>

        {/* --- Action Button (Modified) --- */}
<div className="text-white pt-16 mb-8 flex justify-center z-30 pointer-events-none">
    <button 
        onClick={toggleSummarize}
        className={`pointer-events-auto mt-12 transition-all transform duration-300 flex items-center justify-center rounded-full font-bold uppercase tracking-widest shadow-2xl ${
            isSummarized 
            ? 'bg-neutral-800 text-white hover:text-white border border-neutral-700 hover:bg-neutral-700 py-6 px-16 text-base gap-2' 
            : 'bg-[linear-gradient(to_right,#dc2626,#f97316,#facc15,#22c55e,#3b82f6,#6366f1,#9333ea)] text-white border-4 border-white/20 py-12 px-48 text-[24px] shadow-[0_0_60px_rgba(255,255,255,0.3)] hover:shadow-[0_0_100px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95'
        }`}
    >
        {isSummarized ? (
            <>
                <Unlock size={32} /> Unlock
            </>
        ) : (
            "SUMMARIZE"
        )}
    </button>
</div>

      </main>
    </div>
  );
};

export default FitnessApp;