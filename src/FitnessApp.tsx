import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Unlock, Flame, HeartPulse, Edit2, Check, User, ArrowLeft } from 'lucide-react';
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
  onBack?: () => void;
}

const FitnessApp: React.FC<FitnessAppProps> = ({ userData, onBack }) => {
  // --- General Stats State ---
  const [isSummarized, setIsSummarized] = useState(false);
  const [editingBio, setEditingBio] = useState(false); // Toggle for bio editing
  const [showBreakdown, setShowBreakdown] = useState(false); // Toggle for calorie breakdown
  const [units, setUnits] = useState<UnitSystem>(userData?.units || 'metric');
  
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  const API_BASE_URL = "http://localhost:8000";

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

  // --- API Service ---
  
  const estimateEntry = async (entryType: 'food' | 'activity', text: string, weightKg?: number): Promise<string | null> => {
    try {
      const payload = {
        entry_type: entryType,
        entry_text: text,
        weight_kg: weightKg || null
      };

      const res = await fetch(`${API_BASE_URL}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      return data.estimated_calories ? String(data.estimated_calories) : null;
    } catch (error) {
      console.error("Estimation failed", error);
      return null;
    }
  };

  const getDailyRecommendation = async () => {
    setRecommendationLoading(true);
    setRecommendation(null);
    
    try {
        // Collect data
        const tdee = metrics.tdee !== '--' ? parseFloat(metrics.tdee) : 2000;
        const totalConsumed = gainEntries.reduce((acc, e) => acc + (e.calories ? parseFloat(e.calories) : 0), 0);
        const totalBurned = lostEntries.reduce((acc, e) => acc + (e.calories ? parseFloat(e.calories) : 0), 0);
        const netKcal = totalConsumed - totalBurned;
        const targetKcal = metrics.calorieGoal !== '--' ? parseFloat(metrics.calorieGoal) : 2000;
        
        const summaryRequest = {
            measurement_system: units,
            user_profile: {
                age: parseFloat(stats.age),
                sex: stats.gender,
                weight: parseFloat(stats.weight),
                height: parseFloat(stats.height),
                goal: stats.fitnessGoal,
                target_weight: parseFloat(stats.targetWeight),
                activity_level: stats.activityLevel,
                weekly_workouts: parseFloat(stats.workoutFrequency)
            },
            metabolic_data: {
                bmr_kcal: metrics.bmr !== '--' ? parseFloat(metrics.bmr) : 0,
                activity_factor: 1.2, // Simplified fallback, could map from stats.activityLevel
                baseline_needs_kcal: tdee,
                estimated_daily_needs_kcal: tdee,
                target_kcal: targetKcal
            },
            daily_totals: {
                total_consumed_kcal: totalConsumed,
                total_burned_kcal: totalBurned,
                net_kcal: netKcal,
                difference_from_target_kcal: netKcal - targetKcal
            },
            additional_info: {
                sleep_hours: 8, // Placeholder or extract from 'Other' entries if tagged
                mood: "normal",
                notes: otherEntries.map(e => `${e.category}: ${e.input}`).join('; ')
            },
            food_summary: gainEntries.filter(e => e.input && e.calories).map(e => `${e.input} (${e.calories} kcal)`),
            activity_summary: lostEntries.filter(e => e.activity && e.calories).map(e => `${e.activity} ${e.duration} (${e.calories} kcal)`)
        };

        const res = await fetch(`${API_BASE_URL}/recommendation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summaryRequest)
        });

        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        setRecommendation(data.recommendation);

    } catch (e) {
        console.error("Recommendation failed", e);
        setRecommendation("Could not generate recommendation at this time.");
    } finally {
        setRecommendationLoading(false);
    }
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

    // Call API
    const calories = await estimateEntry('food', currentEntry.input);
    
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

    const calories = await estimateEntry('activity', `${currentEntry.activity} for ${currentEntry.duration}`, parseFloat(stats.weight));
    
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

    // Simulate save or just confirm
    await new Promise(r => setTimeout(r, 400));
    
    setOtherEntries((prev) => prev.map((entry, i) => 
        i === index ? { ...entry, loading: false, response: 'recorded' } : entry
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
      setRecommendation(null);
    } else {
      setGainEntries(prev => prev.filter(e => e.input.trim() !== ''));
      setLostEntries(prev => prev.filter(e => e.activity.trim() !== '' && e.duration.trim() !== ''));
      setOtherEntries(prev => prev.filter(e => e.input.trim() !== '' && e.category.trim() !== ''));
      setIsSummarized(true);
      getDailyRecommendation();
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
          <div className="fa-header-right">
            <span className="fa-header-tag">Dashboard</span>
            {onBack && (
              <button className="fa-back-btn" onClick={onBack}>
                <ArrowLeft size={14} /> Home
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="fa-main">
        
        {/* Recommendation Section (Visible when summarized) */}
        {(recommendation || recommendationLoading) && isSummarized && (
           <section className="fa-card fa-recommendation-card" style={{ padding: '2rem', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                 <div style={{ background: '#ef4444', padding: '0.75rem', borderRadius: '50%', color: 'white' }}>
                    <Check size={24} />
                 </div>
                 <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'white' }}>Daily Analysis</h3>
                    {recommendationLoading ? (
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>Analyzing your data with AI...</div>
                    ) : (
                        <p style={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.9)', fontSize: '1rem' }}>{recommendation}</p>
                    )}
                 </div>
              </div>
           </section>
        )}

        {/* --- Biometrics Bar --- */}
        <section className="fa-card fa-bio">
          <div className="fa-bio-controls">
            <button className="fa-pill-btn" onClick={() => setUnits(u => u === 'metric' ? 'imperial' : 'metric')}>
              {units === 'metric' ? '🌍 Metric' : '🇺🇸 Imperial'}
            </button>
            <button className={`fa-edit-btn ${editingBio ? 'fa-edit-btn--active' : ''}`} onClick={() => setEditingBio(!editingBio)}>
              {editingBio ? <Check size={18} /> : <Edit2 size={16} />}
            </button>
          </div>

          <div className="fa-bio-grid">
            {/* User Info */}
            <div className="fa-bio-user">
              <div className="fa-bio-avatar">
                <User size={20} />
              </div>
              <div>
                <div className="fa-bio-tag">Athlete</div>
                {editingBio ? (
                  <input className="fa-bio-name-input" value={stats.name} onChange={e => setStats({...stats, name: e.target.value})} />
                ) : (
                  <div className="fa-bio-name">{stats.name}</div>
                )}
              </div>
            </div>

            <div className="fa-bio-divider" />

            {/* Core Metrics */}
            <div className="fa-bio-metrics">
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Age</div>
                {editingBio ? (
                  <input type="number" className="fa-bio-input" value={stats.age} onChange={e => setStats({...stats, age: e.target.value})} />
                ) : (
                  <div className="fa-bio-metric-value">{stats.age}</div>
                )}
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Weight</div>
                {editingBio ? (
                  <input type="number" className="fa-bio-input" value={stats.weight} onChange={e => setStats({...stats, weight: e.target.value})} />
                ) : (
                  <div className="fa-bio-metric-value">
                    {units === 'metric' ? stats.weight : (parseFloat(stats.weight) * 2.20462).toFixed(1)}{' '}
                    <span className="fa-bio-metric-unit">{units === 'metric' ? 'kg' : 'lbs'}</span>
                  </div>
                )}
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Height</div>
                {editingBio ? (
                  <input type="number" className="fa-bio-input" value={stats.height} onChange={e => setStats({...stats, height: e.target.value})} />
                ) : (
                  <div className="fa-bio-metric-value">
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

            <div className="fa-bio-divider" />

            {/* Calculated Stats */}
            <div className="fa-bio-computed">
              <div className="fa-bio-metric">
                <div className="fa-bio-computed-label">BMI</div>
                <div className="fa-bio-computed-value">{metrics.bmi}</div>
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-computed-label">BMR</div>
                <div className="fa-bio-computed-value">{metrics.bmr} <span className="fa-bio-computed-unit">kcal</span></div>
              </div>
            </div>

            <div className="fa-bio-divider" />

            {/* Fitness Profile */}
            <div className="fa-bio-profile">
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Activity</div>
                <div className="fa-bio-metric-value" style={{ textTransform: 'capitalize' }}>{stats.activityLevel}</div>
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Goal</div>
                <div className="fa-bio-metric-value" style={{ textTransform: 'capitalize' }}>{stats.fitnessGoal.replace('-', ' ')}</div>
              </div>
              <div className="fa-bio-metric">
                <div className="fa-bio-metric-label">Workouts</div>
                <div className="fa-bio-metric-value">{stats.workoutFrequency}/wk</div>
              </div>
              {stats.targetWeight && (
                <div className="fa-bio-metric">
                  <div className="fa-bio-metric-label">Target</div>
                  <div className="fa-bio-metric-value">
                    {units === 'metric' ? stats.targetWeight : (parseFloat(stats.targetWeight) * 2.20462).toFixed(1)}{' '}
                    <span className="fa-bio-metric-unit">{units === 'metric' ? 'kg' : 'lbs'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* --- Calorie Strategy Section --- */}
        <section className="fa-card fa-strategy">
          <div className="fa-strategy-inner">
            {/* Left: Strategy Details */}
            <div className="fa-strategy-left">
              <div className="fa-strategy-header">
                <h3 className="fa-strategy-title">
                  <Flame size={16} className="fa-col-icon" />
                  Your Calorie Strategy
                </h3>
                <button className="fa-pill-btn" onClick={() => setShowBreakdown(!showBreakdown)}>
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
                const deficitColor = currentGoal.deficit > 0 ? 'fa-color-surplus' : currentGoal.deficit < 0 ? 'fa-color-deficit' : 'fa-color-maintain';

                return (
                  <div>
                    {/* Breakdown Panel */}
                    {showBreakdown && (
                      <div className="fa-breakdown">
                        <div className="fa-breakdown-label">Calculation Breakdown</div>
                        <div className="fa-breakdown-row">
                          <span className="fa-breakdown-key">Base Metabolic Rate (BMR)</span>
                          <span className="fa-breakdown-val">{metrics.bmr} kcal</span>
                        </div>
                        <div className="fa-breakdown-row">
                          <span className="fa-breakdown-key">Activity Multiplier</span>
                          <span className="fa-breakdown-val" style={{ textTransform: 'capitalize' }}>{stats.activityLevel}</span>
                        </div>
                        <div className="fa-breakdown-divider" />
                        <div className="fa-breakdown-row">
                          <span className="fa-breakdown-key" style={{ fontWeight: 500 }}>TDEE (Maintenance)</span>
                          <span className="fa-breakdown-val fa-breakdown-val--bold">{metrics.tdee} kcal</span>
                        </div>
                        <div className="fa-breakdown-row">
                          <span className="fa-breakdown-key" style={{ fontWeight: 500 }}>Goal Adjustment</span>
                          <span className={`fa-breakdown-val fa-breakdown-val--bold ${deficitColor}`}>
                            {currentGoal.deficit > 0 ? '+' : ''}{currentGoal.deficit} kcal
                          </span>
                        </div>
                        <div className="fa-breakdown-divider" />
                        <div className="fa-breakdown-row">
                          <span className="fa-breakdown-total-key">Daily Target</span>
                          <span className="fa-breakdown-total-val">{goalCalories.toFixed(0)} kcal</span>
                        </div>
                      </div>
                    )}

                    {/* Goal Card */}
                    <div className="fa-goal-card">
                      <div className="fa-goal-top">
                        <div>
                          <div className="fa-goal-subtitle">Current Goal</div>
                          <h4 className="fa-goal-name">{currentGoal.label}</h4>
                        </div>
                        <div className="fa-goal-pulse" />
                      </div>
                      <p className="fa-goal-desc">{currentGoal.description}</p>
                      <div className="fa-goal-stats">
                        <div className="fa-goal-stat-box">
                          <div className="fa-goal-stat-label">Daily Adjustment</div>
                          <div className={`fa-goal-stat-value ${deficitColor}`}>
                            {currentGoal.deficit > 0 ? '+' : ''}{currentGoal.deficit} kcal
                          </div>
                        </div>
                        <div className="fa-goal-stat-box">
                          <div className="fa-goal-stat-label">Weekly Change</div>
                          <div className="fa-goal-stat-value">
                            {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(2)} lbs
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right: Daily Target */}
            <div className="fa-strategy-right">
              <div className="fa-target-label">Your Daily Target</div>
              <div className="fa-target-value">{metrics.calorieGoal}</div>
              <div className="fa-target-unit">calories per day</div>
            </div>
          </div>
        </section>

        {/* --- 3 Column Tracker Grid --- */}
        <div className="fa-columns">

          {/* Gain Calories */}
          <div className="fa-card fa-col fa-col--gain">
            <div className="fa-col-header">
              <Utensils size={15} className="fa-col-icon" />
              <h3 className="fa-col-title">Gain Calories</h3>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        e.preventDefault();
                        const newId = generateId();
                        setGainEntries(prev => [...prev, { id: newId, meal: 'Snack', input: '', calories: null, loading: false, locked: false }]);
                        setTimeout(() => {
                          const newInput = gainInputRefs.current[newId];
                          if (newInput) newInput.focus();
                        }, 50);
                      }
                    }}
                  />
                  <div className="fa-entry-result fa-entry-result--gain">
                    {entry.loading
                      ? <span className="fa-entry-loading">...</span>
                      : entry.calories
                        ? <span>+{entry.calories}</span>
                        : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calories Lost */}
          <div className="fa-card fa-col fa-col--lost">
            <div className="fa-col-header">
              <Flame size={15} className="fa-col-icon--orange" />
              <h3 className="fa-col-title">Calories Lost</h3>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        e.preventDefault();
                        const newId = generateId();
                        setLostEntries(prev => [...prev, { id: newId, activity: '', duration: '', calories: null, loading: false, locked: false }]);
                        setTimeout(() => {
                          const newInput = lostInputRefs.current[`${newId}-act`];
                          if (newInput) newInput.focus();
                        }, 50);
                      }
                    }}
                  />
                  <input
                    disabled={isSummarized || entry.loading}
                    type="text"
                    placeholder="30m"
                    className="fa-entry-input fa-entry-input--sm"
                    value={entry.duration}
                    onChange={(e) => handleLostInput(idx, 'duration', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        e.preventDefault();
                        const newId = generateId();
                        setLostEntries(prev => [...prev, { id: newId, activity: '', duration: '', calories: null, loading: false, locked: false }]);
                        setTimeout(() => {
                          const newInput = lostInputRefs.current[`${newId}-act`];
                          if (newInput) newInput.focus();
                        }, 50);
                      }
                    }}
                  />
                  <div className="fa-entry-result fa-entry-result--lost">
                    {entry.loading
                      ? <span className="fa-entry-loading">...</span>
                      : entry.calories
                        ? <span>{Number(entry.calories) > 0 ? '-' : ''}{entry.calories}</span>
                        : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Metrics */}
          <div className="fa-card fa-col fa-col--other">
            <div className="fa-col-header">
              <HeartPulse size={15} className="fa-col-icon--purple" />
              <h3 className="fa-col-title">Other Metrics</h3>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        e.preventDefault();
                        const newId = generateId();
                        setOtherEntries(prev => [...prev, { id: newId, category: '', input: '', response: null, loading: false, locked: false }]);
                        setTimeout(() => {
                          const newInput = otherInputRefs.current[`${newId}-cat`];
                          if (newInput) newInput.focus();
                        }, 50);
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        e.preventDefault();
                        const newId = generateId();
                        setOtherEntries(prev => [...prev, { id: newId, category: '', input: '', response: null, loading: false, locked: false }]);
                        setTimeout(() => {
                          const newInput = otherInputRefs.current[`${newId}-cat`];
                          if (newInput) newInput.focus();
                        }, 50);
                      }
                    }}
                  />
                  <div className="fa-entry-result fa-entry-result--other">
                    {entry.loading
                      ? <span className="fa-entry-loading fa-entry-loading--purple">...</span>
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
              <Unlock size={18} /> Unlock Entries
            </button>
          ) : (
            <button className="fa-summarize-btn" onClick={toggleSummarize}>
              Summarize Day
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default FitnessApp;