import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Unlock, Flame, HeartPulse, Edit2, Check, User } from 'lucide-react';
import './FitnessApp.css';

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
    <div className="fa-root">
      {/* Abstract Background */}
      <div className="fa-bg">
        <div className="fa-bg-grain" />
        <div className="fa-bg-gradient" />
        <div className="fa-bg-line fa-bg-line--1" />
        <div className="fa-bg-line fa-bg-line--2" />
        <div className="fa-bg-line fa-bg-line--3" />
        <div className="fa-bg-circle fa-bg-circle--1" />
        <div className="fa-bg-circle fa-bg-circle--2" />
      </div>

      {/* Header */}
      <header className="fa-header">
        <div className="fa-header-inner">
          <div className="fa-logo">
            <Flame className="fa-logo-icon" size={28} />
            <span className="fa-logo-text">FIT<span className="fa-logo-accent">TRACK</span></span>
          </div>
          <span className="fa-header-tag">Dashboard</span>
        </div>
      </header>

      <main className="fa-main">
        {/* Bio Section */}
        <section className="fa-card fa-bio">
          <button className="fa-bio-edit-btn" onClick={() => setEditingBio(!editingBio)}>
            {editingBio ? <Check size={16} /> : <Edit2 size={14} />}
          </button>

          <div className="fa-bio-layout">
            {/* User Info */}
            <div className="fa-bio-user">
              <div className="fa-bio-avatar"><User size={22} /></div>
              <div>
                <div className="fa-bio-tag">Athlete</div>
                {editingBio ? (
                  <input className="fa-bio-input fa-bio-input--name" value={stats.name} onChange={e => setStats({...stats, name: e.target.value})} />
                ) : (
                  <div className="fa-bio-name">{stats.name}</div>
                )}
              </div>
            </div>

            <div className="fa-bio-divider" />

            {/* Editable Metrics */}
            <div className="fa-bio-metrics">
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Age</div>
                {editingBio
                  ? <input type="number" className="fa-bio-input fa-bio-input--num" value={stats.age} onChange={e => setStats({...stats, age: e.target.value})} />
                  : <div className="fa-bio-metric-value">{stats.age}</div>}
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Weight</div>
                {editingBio
                  ? <input type="number" className="fa-bio-input fa-bio-input--num" value={stats.weight} onChange={e => setStats({...stats, weight: e.target.value})} />
                  : <div className="fa-bio-metric-value">{stats.weight} <span className="fa-bio-metric-unit">kg</span></div>}
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Height</div>
                {editingBio
                  ? <input type="number" className="fa-bio-input fa-bio-input--num" value={stats.height} onChange={e => setStats({...stats, height: e.target.value})} />
                  : <div className="fa-bio-metric-value">{stats.height} <span className="fa-bio-metric-unit">cm</span></div>}
              </div>
            </div>

            <div className="fa-bio-divider" />

            {/* Computed Stats */}
            <div className="fa-bio-computed">
              <div className="fa-bio-metric">
                <div className="fa-bio-computed-label">BMI</div>
                <div className="fa-bio-computed-value">{metrics.bmi}</div>
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-computed-label">BMR</div>
                <div className="fa-bio-computed-value">{metrics.bmr} <span className="fa-bio-metric-unit">kcal</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Column Grid */}
        <div className="fa-columns">

          {/* -- Gain Calories -- */}
          <div className="fa-card fa-col fa-col--gain">
            <div className="fa-col-header">
              <h3 className="fa-col-title"><Utensils size={15} className="fa-col-icon--gain" /> Gain Calories</h3>
            </div>
            <div className="fa-col-body">
              {gainEntries.map((entry, idx) => (
                <div key={entry.id} className="fa-entry">
                  <select
                    disabled={isSummarized}
                    className="fa-entry-select"
                    value={entry.meal}
                    onChange={(e) => {
                      const newE = [...gainEntries];
                      newE[idx].meal = e.target.value;
                      setGainEntries(newE);
                    }}
                  >
                    {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    ref={el => { gainInputRefs.current[entry.id] = el; }}
                    disabled={isSummarized || entry.loading}
                    type="text"
                    placeholder="e.g. 2 eggs..."
                    className="fa-entry-input"
                    value={entry.input}
                    onChange={(e) => {
                      handleGainInput(idx, e.target.value);
                      if (idx === gainEntries.length - 1 && e.target.value.trim() && gainEntries[idx].input === '') {
                        const newId = generateId();
                        setGainEntries(prev => [...prev, { id: newId, meal: 'Snack', input: '', calories: null, loading: false, locked: false }]);
                      }
                    }}
                  />
                  <div className="fa-entry-result">
                    {entry.loading
                      ? <span className="fa-entry-result--gain fa-entry-result--thinking">...</span>
                      : entry.calories
                        ? <span className="fa-entry-result--gain">+{entry.calories}</span>
                        : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* -- Calories Lost -- */}
          <div className="fa-card fa-col fa-col--lost">
            <div className="fa-col-header">
              <h3 className="fa-col-title"><Flame size={15} className="fa-col-icon--lost" /> Calories Lost</h3>
            </div>
            <div className="fa-col-body">
              {lostEntries.map((entry, idx) => (
                <div key={entry.id} className="fa-entry">
                  <input
                    ref={el => { lostInputRefs.current[`${entry.id}-act`] = el; }}
                    disabled={isSummarized || entry.loading}
                    type="text"
                    placeholder="Activity name"
                    className="fa-entry-input"
                    value={entry.activity}
                    onChange={(e) => {
                      handleLostInput(idx, 'activity', e.target.value);
                      if (idx === lostEntries.length - 1 && e.target.value.trim() && lostEntries[idx].activity === '') {
                        const newId = generateId();
                        setLostEntries(prev => [...prev, { id: newId, activity: '', duration: '', calories: null, loading: false, locked: false }]);
                      }
                    }}
                  />
                  <input
                    disabled={isSummarized || entry.loading}
                    type="text"
                    placeholder="30m"
                    className="fa-entry-input fa-entry-input--small"
                    value={entry.duration}
                    onChange={(e) => handleLostInput(idx, 'duration', e.target.value)}
                  />
                  <div className="fa-entry-result">
                    {entry.loading
                      ? <span className="fa-entry-result--lost fa-entry-result--thinking">...</span>
                      : entry.calories
                        ? <span className="fa-entry-result--lost">-{entry.calories}</span>
                        : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* -- Other Metrics -- */}
          <div className="fa-card fa-col fa-col--other">
            <div className="fa-col-header">
              <h3 className="fa-col-title"><HeartPulse size={15} className="fa-col-icon--other" /> Other Metrics</h3>
            </div>
            <div className="fa-col-body">
              {otherEntries.map((entry, idx) => (
                <div key={entry.id} className="fa-entry">
                  <input
                    ref={el => { otherInputRefs.current[`${entry.id}-cat`] = el; }}
                    disabled={isSummarized || entry.loading}
                    type="text"
                    placeholder="Category"
                    className="fa-entry-input fa-entry-input--cat"
                    value={entry.category}
                    onChange={(e) => {
                      handleOtherInput(idx, 'category', e.target.value);
                      if (idx === otherEntries.length - 1 && e.target.value.trim() && otherEntries[idx].category === '') {
                        const newId = generateId();
                        setOtherEntries(prev => [...prev, { id: newId, category: '', input: '', response: null, loading: false, locked: false }]);
                      }
                    }}
                  />
                  <input
                    disabled={isSummarized || entry.loading}
                    type="text"
                    placeholder="Value / Note"
                    className="fa-entry-input"
                    value={entry.input}
                    onChange={(e) => handleOtherInput(idx, 'input', e.target.value)}
                  />
                  <div className="fa-entry-result" style={{minWidth: '20px'}}>
                    {entry.loading
                      ? <span className="fa-entry-result--thinking" style={{color: '#a855f7'}}>...</span>
                      : entry.response
                        ? <div className="fa-entry-dot" />
                        : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Action Button */}
        <div className="fa-action-area">
          {isSummarized ? (
            <button className="fa-unlock-btn" onClick={toggleSummarize}>
              <Unlock size={18} /> Unlock
            </button>
          ) : (
            <button className="fa-summarize-btn" onClick={toggleSummarize}>
              Summarize
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default FitnessApp;