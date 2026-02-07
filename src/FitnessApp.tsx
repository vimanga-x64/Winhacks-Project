import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Unlock, Flame, HeartPulse, Edit2, Check, User } from 'lucide-react';

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

type UnitSystem = "metric" | "imperial";

interface UserData {
  name: string;
  age: string;
  sex: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  targetweight: string;
  activityLevel: string;
  fitnessGoal: string;
  workoutFrequency: string;
  experienceLevel: string;
}

interface FitnessAppProps {
  userData?: UserData & { units: UnitSystem };
}

const FitnessApp: React.FC<FitnessAppProps> = ({ userData }) => {
  // --- General Stats State ---
  const [isSummarized, setIsSummarized] = useState(false);
  const [editingBio, setEditingBio] = useState(false); // Toggle for bio editing
  const [showBreakdown, setShowBreakdown] = useState(false); // Toggle for calorie breakdown
  const [units, setUnits] = useState<UnitSystem>(userData?.units || 'metric');
  
  // Convert userData to stats format
  const getInitialStats = () => {
    if (!userData) {
      return {
        name: 'John Doe',
        age: '28',
        gender: 'male',
        weight: '82',
        height: '180',
        targetWeight: '75',
        activityLevel: 'moderate',
        fitnessGoal: 'general',
        workoutFrequency: '4',
      };
    }

    // Calculate height in cm
    let heightInCm = userData.heightCm;
    if (userData.units === 'imperial' && userData.heightFt && userData.heightIn) {
      const totalInches = (parseFloat(userData.heightFt) * 12) + parseFloat(userData.heightIn);
      heightInCm = (totalInches * 2.54).toFixed(0);
    }

    // Convert weight to kg if needed
    let weightInKg = userData.weight;
    let targetWeightInKg = userData.targetweight;
    if (userData.units === 'imperial') {
      if (userData.weight) weightInKg = (parseFloat(userData.weight) * 0.453592).toFixed(1);
      if (userData.targetweight) targetWeightInKg = (parseFloat(userData.targetweight) * 0.453592).toFixed(1);
    }

    return {
      name: userData.name || 'User',
      age: userData.age || '28',
      gender: userData.sex || 'male',
      weight: weightInKg || '82',
      height: heightInCm || '180',
      targetWeight: targetWeightInKg || '75',
      activityLevel: userData.activityLevel || 'moderate',
      fitnessGoal: userData.fitnessGoal || 'general',
      workoutFrequency: userData.workoutFrequency || '4',
    };
  };

  const [stats, setStats] = useState(getInitialStats());
  const [metrics, setMetrics] = useState({ bmi: '', bmr: '', tdee: '', calorieGoal: '' });

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
      setMetrics({ bmi: '--', bmr: '--', tdee: '--', calorieGoal: '--' });
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

    // Activity multipliers for TDEE
    const activityMultipliers: { [key: string]: number } = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      extreme: 1.9,
    };

    const activityMultiplier = activityMultipliers[stats.activityLevel] || 1.2;
    const tdeeVal = bmrVal * activityMultiplier;

    // Calculate calorie goal based on fitness goal
    let calorieGoalVal = tdeeVal;
    const goal = stats.fitnessGoal;
    
    if (goal === 'lose-fat') {
      calorieGoalVal = tdeeVal - 750; // Aggressive deficit (~1.5 lbs/week)
    } else if (goal === 'lose-fat-gradual') {
      calorieGoalVal = tdeeVal - 500; // Moderate deficit (~1 lb/week)
    } else if (goal === 'lose fat moderately') {
      calorieGoalVal = tdeeVal - 250; // Gradual deficit (~0.5 lb/week)
    } else if (goal === 'build-muscle') {
      calorieGoalVal = tdeeVal + 300; // Surplus for muscle gain
    } else if (goal === 'maintain') {
      calorieGoalVal = tdeeVal; // Maintenance
    } else {
      // For endurance, flexibility, general fitness - slight deficit or maintenance
      calorieGoalVal = tdeeVal - 100;
    }

    setMetrics({
      bmi: bmiVal,
      bmr: bmrVal > 0 ? bmrVal.toFixed(0) : '--',
      tdee: tdeeVal > 0 ? tdeeVal.toFixed(0) : '--',
      calorieGoal: calorieGoalVal > 0 ? calorieGoalVal.toFixed(0) : '--',
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] font-sans selection:bg-red-900 selection:text-white pb-64 relative overflow-hidden">
      
      {/* Abstract Background - matching landing page */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`
        }}></div>
        
        {/* Gradient overlays */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 80%, rgba(220,38,38,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(249,115,22,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 90% 70% at 50% 50%, rgba(15,15,15,1) 0%, transparent 100%)`
        }}></div>
        
        {/* Vertical lines */}
        <div className="absolute w-px h-full left-[20%] top-0 bg-white/[0.02]"></div>
        <div className="absolute w-px h-full left-[50%] top-0 bg-white/[0.02]"></div>
        <div className="absolute w-px h-full left-[80%] top-0 bg-white/[0.02]"></div>
        
        {/* Floating circles */}
        <div className="absolute w-[600px] h-[600px] top-[-180px] right-[-120px] rounded-full border border-white/[0.03]"></div>
        <div className="absolute w-[400px] h-[400px] bottom-[-100px] left-[-80px] rounded-full border border-white/[0.03]"></div>
      </div>
      
      {/* --- Header --- */}
      <header className="border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-20 relative">
        <div className="w-[90%] mx-auto py-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Flame className="text-[#ef4444] drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" size={32} />
                <h1 className="text-3xl font-black tracking-[0.06em] text-white uppercase" style={{ fontFamily: '"Bebas Neue", "Oswald", sans-serif' }}>
                    FIT<span className="text-[#ef4444]">TRACK</span>
                </h1>
            </div>
        </div>
      </header>

      <main className="w-[90%] mx-auto py-10 space-y-10 relative z-1">
        
        {/* --- Biometrics Bar (Output Only / Dashboard Style) --- */}
        <section className="bg-[rgba(14,14,14,0.95)] backdrop-blur-[18px] rounded-md border border-white/[0.06] p-6 relative shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute top-4 right-4 flex gap-2 items-center">
                {/* Unit Toggle */}
                <button
                    onClick={() => setUnits(u => u === 'metric' ? 'imperial' : 'metric')}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/[0.5] hover:text-white hover:border-[#ef4444] transition-all duration-300 font-medium"
                >
                    {units === 'metric' ? '🌍 Metric' : '🇺🇸 Imperial'}
                </button>
                <button 
                    onClick={() => setEditingBio(!editingBio)}
                    className="text-white/[0.25] hover:text-white transition-colors duration-300"
                >
                    {editingBio ? <Check size={18} className="text-[#ef4444]" /> : <Edit2 size={16} />}
                </button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-around gap-8 text-center md:text-left">
                
                {/* User Info */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-white/[0.35] border border-white/[0.08]">
                        <User size={24} />
                    </div>
                    <div>
                        <div className="text-[0.72rem] text-[#ef4444] font-medium uppercase tracking-[0.18em] mb-1">Athlete</div>
                        {editingBio ? (
                            <input 
                                className="bg-white/[0.04] text-[#f0f0f0] px-2 py-1 rounded border border-white/[0.08] focus:border-[#ef4444] focus:shadow-[0_0_0_2px_rgba(239,68,68,0.12)] outline-none w-32 transition-all duration-250"
                                value={stats.name} 
                                onChange={e => setStats({...stats, name: e.target.value})} 
                            />
                        ) : (
                            <div className="text-2xl font-bold text-white tracking-tight">{stats.name}</div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-12 bg-white/[0.06]"></div>

                {/* Metrics Grid */}
                <div className="flex gap-12">
                    <div className="text-center">
                        <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-1">Age</div>
                        {editingBio ? (
                            <input type="number" className="bg-white/[0.04] text-[#f0f0f0] text-center rounded border border-white/[0.08] focus:border-[#ef4444] focus:shadow-[0_0_0_2px_rgba(239,68,68,0.12)] outline-none w-16 transition-all duration-250" value={stats.age} onChange={e => setStats({...stats, age: e.target.value})} />
                        ) : (
                            <div className="text-xl font-medium text-white">{stats.age}</div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-1">Weight</div>
                        {editingBio ? (
                            <input type="number" className="bg-white/[0.04] text-[#f0f0f0] text-center rounded border border-white/[0.08] focus:border-[#ef4444] focus:shadow-[0_0_0_2px_rgba(239,68,68,0.12)] outline-none w-16 transition-all duration-250" value={stats.weight} onChange={e => setStats({...stats, weight: e.target.value})} />
                        ) : (
                            <div className="text-xl font-medium text-white">{units === 'metric' ? stats.weight : (parseFloat(stats.weight) * 2.20462).toFixed(1)} <span className="text-xs text-white/[0.3]">{units === 'metric' ? 'kg' : 'lbs'}</span></div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-1">Height</div>
                        {editingBio ? (
                            <input type="number" className="bg-white/[0.04] text-[#f0f0f0] text-center rounded border border-white/[0.08] focus:border-[#ef4444] focus:shadow-[0_0_0_2px_rgba(239,68,68,0.12)] outline-none w-16 transition-all duration-250" value={stats.height} onChange={e => setStats({...stats, height: e.target.value})} />
                        ) : (
                            <div className="text-xl font-medium text-white">
                                {units === 'metric' 
                                    ? `${stats.height} cm`
                                    : (() => {
                                        const totalInches = parseFloat(stats.height) / 2.54;
                                        const feet = Math.floor(totalInches / 12);
                                        const inches = Math.round(totalInches % 12);
                                        return `${feet}'${inches}"`;
                                    })()
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-12 bg-white/[0.06]"></div>

                {/* Calculated Stats */}
                <div className="flex gap-8">
                     <div className="text-center">
                        <div className="text-[0.72rem] text-[#ef4444] font-bold uppercase tracking-[0.08em] mb-1">BMI</div>
                        <div className="text-2xl font-bold text-white">{metrics.bmi}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[0.72rem] text-[#ef4444] font-bold uppercase tracking-[0.08em] mb-1">BMR</div>
                        <div className="text-2xl font-bold text-white">{metrics.bmr} <span className="text-xs text-white/[0.3] font-normal">kcal</span></div>
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-12 bg-white/[0.06]"></div>

                {/* Fitness Profile Stats */}
                <div className="flex gap-8">
                    <div className="text-center">
                        <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-1">Activity</div>
                        <div className="text-lg font-medium text-white capitalize">{stats.activityLevel}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-1">Goal</div>
                        <div className="text-lg font-medium text-white capitalize">{stats.fitnessGoal.replace('-', ' ')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-1">Workouts</div>
                        <div className="text-lg font-medium text-white">{stats.workoutFrequency}/wk</div>
                    </div>
                    {stats.targetWeight && (
                        <div className="text-center">
                            <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-1">Target</div>
                            <div className="text-lg font-medium text-white">
                                {units === 'metric' ? stats.targetWeight : (parseFloat(stats.targetWeight) * 2.20462).toFixed(1)} <span className="text-xs text-white/[0.3]">{units === 'metric' ? 'kg' : 'lbs'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* --- Calorie Goals Section --- */}
        <section className="bg-[rgba(14,14,14,0.95)] backdrop-blur-[18px] rounded-md border border-white/[0.06] shadow-[0_30px_80px_rgba(0,0,0,0.45)] mt-6">
            <div className="flex flex-col md:flex-row">
                {/* Left side: User's Selected Goal */}
                <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/[0.06]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-white uppercase tracking-[0.08em] text-[0.85rem] flex items-center gap-2" style={{ fontFamily: '"Oswald", sans-serif' }}>
                            <Flame size={16} className="text-[#ef4444]" /> 
                            Your Calorie Strategy
                        </h3>
                        <button
                            onClick={() => setShowBreakdown(!showBreakdown)}
                            className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/[0.5] hover:text-white hover:border-[#ef4444] transition-all duration-300 font-medium"
                        >
                            {showBreakdown ? '✕ Hide' : '📊 Show'} Breakdown
                        </button>
                    </div>
                    
                    {(() => {
                        const goalData: { [key: string]: { label: string; deficit: number; description: string } } = {
                            'lose-fat': { label: 'Lose Fat Aggressively', deficit: -750, description: 'Target weight loss of ~1.5 lbs/week with a significant caloric deficit' },
                            'lose-fat-gradual': { label: 'Lose Fat Moderately', deficit: -500, description: 'Target weight loss of ~1 lb/week with a moderate deficit' },
                            'lose fat moderately': { label: 'Lose Fat Gradually', deficit: -250, description: 'Target weight loss of ~0.5 lbs/week with a gradual approach' },
                            'maintain': { label: 'Maintain Weight', deficit: 0, description: 'Maintain current weight with balanced calorie intake' },
                            'build-muscle': { label: 'Build Muscle', deficit: 300, description: 'Caloric surplus to support muscle growth and strength gains' },
                            'endurance': { label: 'Improve Endurance', deficit: -100, description: 'Slight deficit while maintaining energy for cardio performance' },
                            'flexibility': { label: 'Increase Flexibility', deficit: -100, description: 'Balanced approach focused on recovery and mobility' },
                            'general': { label: 'General Fitness', deficit: -100, description: 'Overall health and wellness with slight optimization' },
                        };

                        const currentGoal = goalData[stats.fitnessGoal] || goalData['general'];
                        const tdee = parseFloat(metrics.tdee) || 0;
                        const goalCalories = tdee + currentGoal.deficit;
                        const weeklyChange = (currentGoal.deficit * 7) / 3500;

                        return (
                            <div className="space-y-4">
                                {/* Collapsible Calculation Breakdown at the top */}
                                {showBreakdown && (
                                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 animate-[fadeIn_0.3s_ease-in-out]">
                                        <div className="text-xs text-white/[0.4] uppercase tracking-wider mb-3">Calculation Breakdown</div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white/[0.5]">Base Metabolic Rate (BMR)</span>
                                                <span className="text-white font-medium">{metrics.bmr} kcal</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white/[0.5]">Activity Multiplier</span>
                                                <span className="text-white font-medium capitalize">{stats.activityLevel}</span>
                                            </div>
                                            <div className="h-px bg-white/[0.06] my-2"></div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white/[0.6] font-medium">TDEE (Maintenance)</span>
                                                <span className="text-white font-bold">{metrics.tdee} kcal</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white/[0.6] font-medium">Goal Adjustment</span>
                                                <span className={`font-bold ${
                                                    currentGoal.deficit > 0 ? 'text-blue-400' : currentGoal.deficit < 0 ? 'text-orange-400' : 'text-green-400'
                                                }`}>
                                                    {currentGoal.deficit > 0 ? '+' : ''}{currentGoal.deficit} kcal
                                                </span>
                                            </div>
                                            <div className="h-px bg-white/[0.06] my-2"></div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#ef4444] font-bold uppercase text-xs tracking-wider">Daily Target</span>
                                                <span className="text-[#ef4444] font-bold text-lg">{goalCalories.toFixed(0)} kcal</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Goal Card */}
                                <div className="bg-gradient-to-br from-[#ef4444]/10 to-transparent border-2 border-[#ef4444] rounded-lg p-6 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="text-xs text-white/[0.4] uppercase tracking-wider mb-1">Current Goal</div>
                                            <h4 className="text-2xl font-bold text-white mb-2">{currentGoal.label}</h4>
                                        </div>
                                        <div className="w-3 h-3 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                    </div>
                                    <p className="text-sm text-white/[0.6] mb-4 leading-relaxed">{currentGoal.description}</p>
                                    
                                    {/* Strategy Details */}
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-white/[0.04] border border-white/[0.08] rounded p-3">
                                            <div className="text-[0.65rem] text-white/[0.4] uppercase tracking-wider mb-1">Daily Adjustment</div>
                                            <div className={`text-lg font-bold ${
                                                currentGoal.deficit > 0 
                                                    ? 'text-blue-400' 
                                                    : currentGoal.deficit < 0 
                                                    ? 'text-orange-400' 
                                                    : 'text-green-400'
                                            }`}>
                                                {currentGoal.deficit > 0 ? '+' : ''}{currentGoal.deficit} kcal
                                            </div>
                                        </div>
                                        <div className="bg-white/[0.04] border border-white/[0.08] rounded p-3">
                                            <div className="text-[0.65rem] text-white/[0.4] uppercase tracking-wider mb-1">Weekly Change</div>
                                            <div className="text-lg font-bold text-white">
                                                {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(2)} lbs
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Right side: Your Calorie Goal */}
                <div className="w-full md:w-80 p-6 flex flex-col justify-center items-center bg-gradient-to-br from-white/[0.03] to-transparent">
                    <div className="text-center">
                        <div className="text-[0.72rem] text-white/[0.35] font-bold uppercase tracking-[0.08em] mb-2">Your Daily Target</div>
                        <div className="text-5xl font-bold text-[#ef4444] mb-2 tracking-tight">
                            {metrics.calorieGoal}
                        </div>
                        <div className="text-sm text-white/[0.5]">calories per day</div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Main 3 Columns --- */}
        <div className="flex justify-between gap-8 w-[99%] mx-auto min-h-[600px] mt-8">
    
    {/* 1. Gain Calories */}
    <div className="bg-[rgba(14,14,14,0.95)] backdrop-blur-[18px] border border-white/[0.06] rounded-md overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] flex flex-col w-[30%] min-h-[600px]">
        <div className="p-5 border-b border-white/[0.06] bg-[rgba(14,14,14,0.95)] flex justify-between items-center">
            <h3 className="font-medium text-white uppercase tracking-[0.08em] text-[0.85rem] flex items-center gap-2" style={{ fontFamily: '"Oswald", sans-serif' }}>
                <Utensils size={16} className="text-[#22c55e]" /> 
                Gain Calories
            </h3>
        </div>
        
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {gainEntries.map((entry, idx) => (
                <div key={entry.id} className="group relative bg-white/[0.04] text-[#f0f0f0] border border-white/[0.08] p-3 rounded hover:border-white/[0.12] transition-all duration-300">
                    {/* FLEX ROW: Items aligned center */}
                    <div className="flex items-center gap-3 w-full">
                        
                        {/* 1. Meal Select (Fixed Width) */}
                        <select 
                            disabled={isSummarized}
                            className="w-24 bg-transparent text-[0.72rem] font-medium !text-[#f0f0f0] uppercase focus:text-[#22c55e] outline-none cursor-pointer tracking-[0.08em] border-r border-white/[0.08] mr-2 transition-colors duration-300"
                            style={{ color: '#f0f0f0' }}
                            value={entry.meal}
                            onChange={(e) => {
                                const newE = [...gainEntries];
                                newE[idx].meal = e.target.value;
                                setGainEntries(newE);
                            }}
                        >
                            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(m => <option key={m} value={m} className="bg-[#0e0e0e] !text-[#f0f0f0]" style={{ color: '#f0f0f0', backgroundColor: '#0e0e0e' }}>{m}</option>)}
                        </select>

                        {/* 2. Food Input (Takes remaining space) */}
                        <input
                            ref={el => { gainInputRefs.current[entry.id] = el; }}
                            disabled={isSummarized || entry.loading}
                            type="text"
                            placeholder="e.g. 2 eggs..."
                            className="flex-1 min-w-0 bg-transparent text-[0.9rem] !text-[#f0f0f0] placeholder:text-white/[0.15] focus:outline-none"
                            style={{ color: '#f0f0f0' }}
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
                                <span className="text-xs text-[#22c55e]/60 italic">Thinking...</span>
                            ) : entry.calories ? (
                                <span className="text-sm font-bold text-[#22c55e]">
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
    <div className="bg-[rgba(14,14,14,0.95)] backdrop-blur-[18px] border border-white/[0.06] rounded-md overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] flex flex-col w-[30%] min-h-[600px]">
        <div className="p-5 border-b border-white/[0.06] bg-[rgba(14,14,14,0.95)] flex justify-between items-center">
            <h3 className="font-medium text-white uppercase tracking-[0.08em] text-[0.85rem] flex items-center gap-2" style={{ fontFamily: '"Oswald", sans-serif' }}>
                <Flame size={16} className="text-[#ef4444]" /> 
                Calories Lost
            </h3>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {lostEntries.map((entry, idx) => (
                <div key={entry.id} className="group bg-white/[0.04] border border-white/[0.08] p-3 rounded hover:border-white/[0.12] transition-all duration-300">
                    {/* FLEX ROW */}
                    <div className="flex items-center gap-3 w-full">
                        
                        {/* 1. Activity Name (Takes remaining space) */}
                        <input
                            ref={el => { lostInputRefs.current[`${entry.id}-act`] = el; }}
                            disabled={isSummarized || entry.loading}
                            type="text"
                            placeholder="Activity Name"
                            className="flex-1 min-w-0 bg-transparent text-[0.9rem] font-medium !text-[#f0f0f0] placeholder:text-white/[0.15] focus:outline-none"
                            style={{ color: '#f0f0f0' }}
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
                        <div className="w-16 border-l border-white/[0.08] pl-2">
                            <input
                                disabled={isSummarized || entry.loading}
                                type="text"
                                placeholder="30m"
                                className="w-full bg-transparent text-xs !text-[#f0f0f0] placeholder:text-white/[0.15] focus:outline-none text-center"
                                style={{ color: '#f0f0f0' }}
                                value={entry.duration}
                                onChange={(e) => {
                                    handleLostInput(idx, 'duration', e.target.value);
                                }}
                            />
                        </div>

                        {/* 3. Calories (Fixed Width aligned end) */}
                        <div className="min-w-[50px] text-right">
                            {entry.loading ? (
                                <span className="text-xs text-[#ef4444]/60 italic">Thinking...</span>
                            ) : entry.calories ? (
                                <span className="text-sm font-bold text-[#ef4444]">
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
    <div className="bg-[rgba(14,14,14,0.95)] backdrop-blur-[18px] border border-white/[0.06] rounded-md overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] flex flex-col w-[30%] min-h-[600px]">
        <div className="p-5 border-b border-white/[0.06] bg-[rgba(14,14,14,0.95)] flex justify-between items-center">
            <h3 className="font-medium text-white uppercase tracking-[0.08em] text-[0.85rem] flex items-center gap-2" style={{ fontFamily: '"Oswald", sans-serif' }}>
                <HeartPulse size={16} className="text-[#9333ea]" /> 
                Other Metrics
            </h3>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {otherEntries.map((entry, idx) => (
                <div key={entry.id} className="group bg-white/[0.04] border border-white/[0.08] p-3 rounded hover:border-white/[0.12] transition-all duration-300">
                     {/* FLEX ROW */}
                     <div className="flex items-center gap-3 w-full">
                        
                        {/* 1. Category (Fixed Width) */}
                        <input
                            ref={el => { otherInputRefs.current[`${entry.id}-cat`] = el; }}
                            disabled={isSummarized || entry.loading}
                            type="text"
                            placeholder="CATEGORY"
                            className="w-24 bg-transparent text-[0.72rem] font-medium !text-[#f0f0f0] uppercase tracking-[0.08em] placeholder:text-white/[0.15] focus:outline-none border-r border-white/[0.08] mr-2"
                            style={{ color: '#f0f0f0' }}
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
                            className="flex-1 min-w-0 bg-transparent text-[0.9rem] !text-[#f0f0f0] placeholder:text-white/[0.15] focus:outline-none"
                            style={{ color: '#f0f0f0' }}
                            value={entry.input}
                            onChange={(e) => {
                                handleOtherInput(idx, 'input', e.target.value);
                            }}
                        />

                        {/* 3. Status Indicator */}
                        <div className="min-w-[20px] flex justify-end">
                            {entry.loading ? (
                                <span className="text-xs text-[#9333ea]/60 italic">Thinking...</span>
                            ) : entry.response ? (
                               <div className="w-2 h-2 rounded-full bg-[#9333ea] shadow-[0_0_8px_#9333ea]"></div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
</div>

        {/* --- Action Button (Modified) --- */}
<div className="text-white pt-16 mb-8 flex justify-center z-30 pointer-events-none relative">
    <button 
        onClick={toggleSummarize}
        className={`pointer-events-auto mt-12 transition-all transform duration-300 flex items-center justify-center font-bold uppercase tracking-[0.1em] shadow-2xl relative overflow-hidden ${
            isSummarized 
            ? 'bg-transparent text-white/[0.4] border border-white/[0.08] hover:text-white hover:border-white/[0.2] py-[0.65rem] px-[1.6rem] text-[0.8rem] gap-2 rounded' 
            : 'bg-[#ef4444] text-white py-[0.9rem] px-[2.4rem] text-[0.85rem] rounded shadow-[0_8px_30px_rgba(239,68,68,0.35)] hover:transform hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(239,68,68,0.45)]'
        }`}
        style={{ fontFamily: '"Inter", sans-serif' }}
    >
        {isSummarized ? (
            <>
                <Unlock size={20} /> Unlock
            </>
        ) : (
            <>
                SUMMARIZE
                <span className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.12] to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            </>
        )}
    </button>
</div>

      </main>
    </div>
  );
};

export default FitnessApp;