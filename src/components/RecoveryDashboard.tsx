import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Flame, Activity, MoonStar, Brain, Leaf } from 'lucide-react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  CartesianGrid,
  Cell
} from 'recharts';
import simulatedHealth from '../data/simulated_health.json';
import simulatedFood from '../data/simulated_food.json';
import { useAuth } from '../context/AuthContext';
import { fetchGoogleFitHistory, type DailyFitData } from '../lib/googleFit';
import '../FitnessApp.css';
import './RecoveryDashboard.css';

type SleepData = {
  bedtime: string;
  wake: string;
  total_min: number;
  deep_min: number;
  rem_min: number;
  light_min: number;
  awake_min: number;
  efficiency: number;
  sleep_debt_min: number;
  sleep_inertia_min: number;
};

type HealthDay = {
  date: string;
  steps: number;
  hrv: number;
  resting_hr: number;
  blood_pressure: { systolic: number; diastolic: number };
  spo2: number;
  resp_rate: number;
  sleep: SleepData;
};

type FoodDay = {
  date: string;
  calories: number;
  target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type RecoveryDashboardProps = {
  onBack: () => void;
  userProfile: {
    name: string;
    goal: string;
    activityLevel: string;
    targetWeight?: string;
  };
};

type EnergyPoint = { timeMin: number; energy: number };

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const formatTime = (minutes: number) => {
  const total = (minutes + 24 * 60) % (24 * 60);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const buildEnergyCurve = (sleep: SleepData): EnergyPoint[] => {
  const points: EnergyPoint[] = [];
  const wakeMin = toMinutes(sleep.wake);
  const sleepDebt = sleep.sleep_debt_min;
  const inertia = sleep.sleep_inertia_min;
  const base = clamp(78 - sleepDebt * 0.35, 45, 88);
  const morningDip = clamp(inertia * 0.7, 10, 28);

  for (let t = wakeMin - 60; t <= 23 * 60; t += 15) {
    const hour = t / 60;
    let energy = base;
    if (t <= wakeMin + 180) {
      const progress = clamp((t - (wakeMin - 60)) / 240, 0, 1);
      energy -= morningDip * (1 - progress);
    }
    if (hour >= 13 && hour <= 15.5) {
      energy -= 8;
    }
    if (hour >= 19) {
      energy -= (hour - 19) * 3.2;
    }
    const wave = Math.sin(((t - wakeMin + 60) / (16 * 60)) * Math.PI) * 11;
    energy = clamp(energy + wave, 25, 95);
    points.push({ timeMin: t, energy: Math.round(energy) });
  }
  return points;
};

const buildSleepTimeline = (sleep: SleepData, slotMin = 10) => {
  const totalSlots = Math.max(1, Math.round(sleep.total_min / slotMin));
  let deepLeft = Math.round(sleep.deep_min / slotMin);
  let remLeft = Math.round(sleep.rem_min / slotMin);
  let lightLeft = Math.round(sleep.light_min / slotMin);
  let awakeLeft = Math.round(sleep.awake_min / slotMin);

  let slotsTotal = deepLeft + remLeft + lightLeft + awakeLeft;
  if (slotsTotal !== totalSlots) {
    lightLeft += totalSlots - slotsTotal;
  }

  const cycles = Math.max(3, Math.round(totalSlots / (90 / slotMin)));
  const timeline: Array<'deep' | 'rem' | 'light' | 'awake'> = [];

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const remainingCycles = Math.max(1, cycles - cycle);
    const deepBlock = deepLeft > 0 ? Math.max(1, Math.round(deepLeft / remainingCycles)) : 0;
    const remBlock = remLeft > 0 ? Math.max(1, Math.round(remLeft / remainingCycles)) : 0;
    const awakeBlock = awakeLeft > 0 ? 1 : 0;
    const lightBlock = lightLeft > 0 ? Math.max(1, Math.round(lightLeft / remainingCycles / 2)) : 0;

    for (let i = 0; i < deepBlock && deepLeft > 0; i += 1) {
      timeline.push('deep');
      deepLeft -= 1;
    }
    for (let i = 0; i < lightBlock && lightLeft > 0; i += 1) {
      timeline.push('light');
      lightLeft -= 1;
    }
    for (let i = 0; i < remBlock && remLeft > 0; i += 1) {
      timeline.push('rem');
      remLeft -= 1;
    }
    for (let i = 0; i < lightBlock && lightLeft > 0; i += 1) {
      timeline.push('light');
      lightLeft -= 1;
    }
    if (awakeLeft > 0 && awakeBlock > 0) {
      timeline.push('awake');
      awakeLeft -= 1;
    }
  }

  while (timeline.length < totalSlots) {
    timeline.push('light');
  }
  if (timeline.length > totalSlots) {
    timeline.splice(totalSlots);
  }

  return timeline;
};

const buildSineSeriesWithTime = (points: { timeMin: number; value: number }[], samples = 10) => {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ index: 0, timeMin: points[0].timeMin, energy: points[0].value }];
  const segments = points.length - 1;
  const series: { index: number; timeMin: number; energy: number }[] = [];

  for (let i = 0; i < segments; i++) {
    const start = points[i];
    const end = points[i + 1];
    for (let s = 0; s <= samples; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / samples;
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      const energy = start.value + (end.value - start.value) * eased;
      const timeMin = start.timeMin + (end.timeMin - start.timeMin) * t;
      series.push({
        index: series.length,
        timeMin,
        energy: Number(energy.toFixed(2))
      });
    }
  }
  return series;
};

const computeStressScore = (day: HealthDay) => {
  const hrvPenalty = (60 - day.hrv) * 0.8;
  const hrPenalty = (day.resting_hr - 55) * 1.2;
  const sleepPenalty = day.sleep.sleep_debt_min * 0.4;
  return clamp(Math.round(45 + hrvPenalty + hrPenalty + sleepPenalty), 0, 100);
};

const describeStress = (score: number) => {
  if (score >= 75) return 'High';
  if (score >= 55) return 'Elevated';
  if (score >= 35) return 'Balanced';
  return 'Low';
};

const RecoveryDashboard: React.FC<RecoveryDashboardProps> = ({ onBack, userProfile }) => {
  const { googleAccessToken } = useAuth();
  const [tips, setTips] = useState<Record<string, string[]> | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  
  // State for fetched Google Fit Data
  const [fitData, setFitData] = useState<DailyFitData[] | null>(null);
  const [fitLoading, setFitLoading] = useState(!!googleAccessToken);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const syncData = () => {
    if (googleAccessToken) {
      setFitLoading(true);
      fetchGoogleFitHistory(googleAccessToken)
        .then(data => {
          setFitData(data);
          setFitLoading(false);
          setLastSync(new Date());
        })
        .catch(err => {
          console.error("Failed to fetch Google Fit data", err);
          setFitLoading(false);
        });
    }
  };

  useEffect(() => {
    syncData();
  }, [googleAccessToken]);

  // Merge Logic: Use FitData if available, otherwise fallback to simulated
  const healthDays: HealthDay[] = useMemo(() => {
    if (!fitData || fitData.length === 0) {
      return (simulatedHealth as { days: HealthDay[] }).days;
    }

    // Map Google Fit Data to HealthDay
    return fitData.map(d => {
      // Calculate derived sleep metrics
      const efficiency = d.sleep.totalMinutes > 0 
        ? (d.sleep.totalMinutes - d.sleep.awakeMinutes) / d.sleep.totalMinutes 
        : 0.85; // Default fallback
      
      const idealSleep = 480; // 8 hours
      const sleepDebt = Math.max(0, idealSleep - d.sleep.totalMinutes);
      
      return {
        date: d.date,
        steps: d.steps,
        hrv: 45 + Math.random() * 20, // Mock HRV (hard to get from basic Fit API)
        resting_hr: d.heartRate.min > 0 ? d.heartRate.min : 60,
        blood_pressure: { systolic: 120, diastolic: 80 }, // Mock BP
        spo2: 98,
        resp_rate: 14,
        sleep: {
          bedtime: d.sleep.startTime, // "23:00"
          wake: d.sleep.endTime, // "07:00"
          total_min: d.sleep.totalMinutes,
          deep_min: d.sleep.deepMinutes,
          rem_min: d.sleep.remMinutes,
          light_min: d.sleep.lightMinutes,
          awake_min: d.sleep.awakeMinutes,
          efficiency: efficiency,
          sleep_debt_min: sleepDebt,
          sleep_inertia_min: 15 // Default
        }
      };
    });
  }, [fitData]);

  // Food data remains simulated/local for now unless we fetched calories-in from Fit (often not accurate there)
  // We'll use simulatedFood for structure but could overlay "calories burned" from Fit
  const foodDays = (simulatedFood as { days: FoodDay[] }).days;

  const latestHealth = healthDays[healthDays.length - 1];
  // Ensure we have at least 2 days for "previous" calculation
  const prevHealth = healthDays.length > 1 ? healthDays[healthDays.length - 2] : latestHealth;
  
  const energyCurve = buildEnergyCurve(prevHealth.sleep);
  const sleepTimeline = buildSleepTimeline(prevHealth.sleep);

  const last7Health = healthDays.slice(-7);
  const last7Food = foodDays.slice(-7);

  // Calculate Averages
  const avgSleepMin = last7Health.reduce((sum, day) => sum + day.sleep.total_min, 0) / last7Health.length;
  const avgSteps = Math.round(last7Health.reduce((sum, day) => sum + day.steps, 0) / last7Health.length);
  const avgEfficiency = last7Health.reduce((sum, day) => sum + day.sleep.efficiency, 0) / last7Health.length;

  const stressScores = last7Health.map(computeStressScore);
  const avgStress = Math.round(stressScores.reduce((a, b) => a + b, 0) / stressScores.length);

  const energySeries = buildSineSeriesWithTime(
    energyCurve.map(point => ({ timeMin: point.timeMin, value: point.energy })),
    8
  );
  const energyChart = { height: 280 };
  const sleepChart = { height: 52 };
  const foodChart = { height: 210 };
  const stressChart = { height: 140 };

  const nutritionSummary = useMemo(() => {
    let surplusDays = 0;
    let deficitDays = 0;
    let targetDays = 0;
    last7Food.forEach(day => {
      const diff = day.calories - day.target;
      if (diff > 150) surplusDays += 1;
      else if (diff < -150) deficitDays += 1;
      else targetDays += 1;
    });
    return { surplusDays, deficitDays, targetDays };
  }, [last7Food]);

  const energyWindows = useMemo(() => {
    const wakeMin = toMinutes(prevHealth.sleep.wake);
    const sleepDebt = prevHealth.sleep.sleep_debt_min;
    const inertia = prevHealth.sleep.sleep_inertia_min;
    const morningPeak = wakeMin + 180 + Math.round(inertia * 0.3);
    const afternoonPeak = wakeMin + 420 - Math.round(sleepDebt * 0.2);
    const eveningPeak = wakeMin + 660 - Math.round(sleepDebt * 0.1);
    const afternoonDip = wakeMin + 360 + Math.round(sleepDebt * 0.1);
    const eveningDip = wakeMin + 750;
    return {
      morningPeak,
      afternoonPeak,
      eveningPeak,
      afternoonDip,
      eveningDip
    };
  }, [prevHealth.sleep]);

  const foodTrend = last7Food.map(day => ({
    date: day.date,
    label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    calories: day.calories,
    target: day.target,
    delta: day.calories - day.target
  }));

  const stressTrend = last7Health.map((day, idx) => ({
    label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    stress: stressScores[idx]
  }));

  const ringData = [
    {
      name: 'Sleep',
      value: clamp((latestHealth.sleep.total_min / 480) * 100, 0, 100),
      fill: '#00d4ff'
    },
    {
      name: 'Steps',
      value: clamp((latestHealth.steps / 10000) * 100, 0, 100),
      fill: '#00f5a0'
    },
    {
      name: 'Consistency',
      value: clamp((nutritionSummary.targetDays / last7Food.length) * 100, 0, 100),
      fill: '#ffb020'
    }
  ];

  const fetchTips = async () => {
    try {
      setTipsLoading(true);
      const payload = {
        user_profile: userProfile,
        sleep_summary: {
          last_night: prevHealth.sleep,
          today: latestHealth.sleep,
          bedtime: prevHealth.sleep.bedtime,
          wake: prevHealth.sleep.wake,
          energy_windows: {
            morning_peak: formatTime(energyWindows.morningPeak),
            afternoon_peak: formatTime(energyWindows.afternoonPeak),
            evening_peak: formatTime(energyWindows.eveningPeak),
            afternoon_dip: formatTime(energyWindows.afternoonDip),
            evening_dip: formatTime(energyWindows.eveningDip)
          }
        },
        recovery_metrics: {
          hrv_avg: Math.round(last7Health.reduce((sum, day) => sum + day.hrv, 0) / last7Health.length),
          resting_hr_avg: Math.round(last7Health.reduce((sum, day) => sum + day.resting_hr, 0) / last7Health.length),
          sleep_efficiency_avg: Math.round(last7Health.reduce((sum, day) => sum + day.sleep.efficiency, 0) / last7Health.length * 100),
          sleep_debt_avg_min: Math.round(last7Health.reduce((sum, day) => sum + day.sleep.sleep_debt_min, 0) / last7Health.length)
        },
        nutrition: {
          last_7_days: last7Food,
          summary: nutritionSummary,
          food_log: []
        },
        stress: {
          last_7_days_scores: stressScores,
          average_score: avgStress,
          level: describeStress(avgStress)
        },
        energy_curve: energyCurve
      };

      const res = await fetch('http://localhost:8000/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setTips(data.recovery_tips || null);
    } catch (err) {
      console.warn('Recovery tips failed:', err);
      setTips(null);
    } finally {
      setTipsLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, [fitData]); // Re-fetch tips when data changes

  // Show loading screen on first load if we have a token and are fetching
  if (fitLoading && !fitData) {
    return (
      <div className="rd-loading-screen">
        <Flame className="rd-loading-icon" size={64} />
        <h2>Synchronizing Health Data</h2>
        <p>Retrieving your latest metrics from Google Fit...</p>
      </div>
    );
  }

  return (
    <div className="rd-root">
      <header className="fa-header">
        <div className="fa-header-inner">
          <div className="fa-logo">
            <Flame className="fa-logo-icon" size={28} />
            <span className="fa-logo-text">FIT<span className="fa-logo-accent">TRACK</span></span>
          </div>
          <div className="fa-header-right">
            <button className="fa-back-btn" onClick={onBack}>
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        </div>
      </header>

      <main className="rd-main">
        <section className="rd-hero">
          <div>
            <div className="rd-kicker">
              Recovery Dashboard 
              {fitLoading && <span className="rd-loading-badge">Syncing Google Fit...</span>}
              {!fitLoading && fitData && (
                <span className="rd-live-badge" onClick={syncData} style={{ cursor: 'pointer' }}>
                  Live Data {lastSync && `• Last updated ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </span>
              )}
            </div>
            <h1>Sleep, Energy, and Recovery Signals</h1>
            <p>Built on your Google Fit Profile</p>
          </div>
          <div className="rd-hero-cards">
            <div className="rd-mini-card">
              <span>7-Day Sleep Avg</span>
              <strong>{(avgSleepMin / 60).toFixed(1)}h</strong>
              <small>Efficiency {Math.round(avgEfficiency * 100)}%</small>
            </div>
            <div className="rd-mini-card">
              <span>7-Day Steps Avg</span>
              <strong>{avgSteps.toLocaleString()}</strong>
              <small>Daily goal 10k</small>
            </div>
            <div className="rd-mini-card">
              <span>7-Day Stress Avg</span>
              <strong>{describeStress(avgStress)}</strong>
              <small>Score {avgStress}/100</small>
            </div>
          </div>
        </section>

        <section className="rd-grid">
          <div className="rd-card rd-card--rings">
            <div className="rd-card-header">
              <div>
                <h3>Activity Rings</h3>
                <span>At-a-glance goals</span>
              </div>
            </div>
            <div className="rd-rings">
              <div className="rd-rings-chart">
                <ResponsiveContainer width="100%" height={320}>
                  <RadialBarChart
                    innerRadius="38%"
                    outerRadius="100%"
                    data={ringData}
                    startAngle={90}
                    endAngle={-270}
                    barSize={14}
                    barGap={8}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'rgba(255,255,255,0.08)' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="rd-rings-center">
                  <strong>{Math.round(ringData.reduce((sum, item) => sum + item.value, 0) / ringData.length)}%</strong>
                  <span>Overall</span>
                </div>
              </div>
              <div className="rd-rings-legend">
                {ringData.map(item => (
                  <div key={item.name} className="rd-ring-row">
                    <span className="rd-ring-dot" style={{ background: item.fill }} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.name === 'Steps' && `${latestHealth.steps.toLocaleString()} / 10k`}
                        {item.name === 'Sleep' && `${(latestHealth.sleep.total_min / 60).toFixed(1)}h / 8h`}
                        {item.name === 'Consistency' && `${Math.round(item.value)}% complete`}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rd-card rd-card--sleep">
            <div className="rd-card-header">
              <div>
                <h3>Sleep Architecture</h3>
                <span>Last night</span>
              </div>
              <div className="rd-sleep-times">
                <div>
                  <small>Bedtime</small>
                  <strong>{formatTime(toMinutes(prevHealth.sleep.bedtime))}</strong>
                </div>
                <div>
                  <small>Wake</small>
                  <strong>{formatTime(toMinutes(prevHealth.sleep.wake))}</strong>
                </div>
              </div>
            </div>
            <div className="rd-sleep-bar">
              {(() => {
                const total = Math.max(1, prevHealth.sleep.total_min);
                return (
                  <>
                    <span style={{ width: `${(prevHealth.sleep.deep_min / total) * 100}%` }} className="rd-sleep-seg rd-deep" />
                    <span style={{ width: `${(prevHealth.sleep.rem_min / total) * 100}%` }} className="rd-sleep-seg rd-rem" />
                    <span style={{ width: `${(prevHealth.sleep.light_min / total) * 100}%` }} className="rd-sleep-seg rd-light" />
                    <span style={{ width: `${(prevHealth.sleep.awake_min / total) * 100}%` }} className="rd-sleep-seg rd-awake" />
                  </>
                );
              })()}
            </div>
            <div className="rd-sleep-legend">
              <span>Deep {prevHealth.sleep.deep_min}m</span>
              <span>REM {prevHealth.sleep.rem_min}m</span>
              <span>Light {prevHealth.sleep.light_min}m</span>
              <span>Awake {prevHealth.sleep.awake_min}m</span>
            </div>
            
            <div className="rd-sleep-curve">
              <div className="rd-sleep-timeline" style={{ height: sleepChart.height }}>
                {sleepTimeline.map((stage, idx) => (
                  <span key={idx} className={`rd-sleep-cell rd-sleep-cell--${stage}`} />
                ))}
              </div>
              <div className="rd-sleep-timeline-labels">
                <span>{formatTime(toMinutes(prevHealth.sleep.bedtime))}</span>
                <span>{formatTime(toMinutes(prevHealth.sleep.wake))}</span>
              </div>
            </div>
           
            <div className="rd-metric-row">
              <div>
                <small>Sleep debt</small>
                <strong>{prevHealth.sleep.sleep_debt_min} min</strong>
              </div>
              <div>
                <small>Sleep inertia</small>
                <strong>{prevHealth.sleep.sleep_inertia_min} min</strong>
              </div>
              <div>
                <small>7-day efficiency</small>
                <strong>{Math.round(last7Health.reduce((a, b) => a + b.sleep.efficiency, 0) / last7Health.length * 100)}%</strong>
              </div>
            </div>
          </div>

          <div className="rd-card rd-card--energy">
            <div className="rd-card-header">
              <div>
                <h3>Energy Curve</h3>
                <span>Based on yesterday&apos;s sleep</span>
              </div>
            </div>
            <div className="rd-energy-chart">
              <ResponsiveContainer width="100%" height={energyChart.height}>
                <LineChart data={energySeries}>
                  <defs>
                    <linearGradient id="energyGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ff4fd8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ffb020" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timeMin" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                    labelFormatter={(value) => `Time ${formatTime(Number(value))}`}
                    formatter={(value) => [`${Number(value).toFixed(0)}% energy`, 'Energy']}
                  />
                  <Line type="natural" dataKey="energy" stroke="url(#energyGlow)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rd-energy-windows">
              <div>
                <small>Morning peak</small>
                <strong>{formatTime(energyWindows.morningPeak)}</strong>
              </div>
              <div>
                <small>Afternoon peak</small>
                <strong>{formatTime(energyWindows.afternoonPeak)}</strong>
              </div>
              <div>
                <small>Evening peak</small>
                <strong>{formatTime(energyWindows.eveningPeak)}</strong>
              </div>
              <div>
                <small>Afternoon dip</small>
                <strong>{formatTime(energyWindows.afternoonDip)}</strong>
              </div>
              <div>
                <small>Evening dip</small>
                <strong>{formatTime(energyWindows.eveningDip)}</strong>
              </div>
            </div>
          </div>

          <div className="rd-card rd-card--food">
            <div className="rd-card-header">
              <div>
                <h3>7-Day Nutrition Trend</h3>
                <span>Caloric intake</span>
              </div>
            </div>
            <div className="rd-nutrition-chart">
              <ResponsiveContainer width="100%" height={foodChart.height}>
                <ComposedChart data={foodTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255, 255, 255, 0.9)', borderRadius: 8 }}
                    formatter={(value, name) => [`${value} kcal`, name === 'calories' ? 'Calories' : 'Target']}
                  />
                  <Bar dataKey="calories" radius={[8, 8, 4, 4]} stroke="none">
                    {foodTrend.map((entry, idx) => {
                      const isSurplus = entry.delta > 150;
                      const isDeficit = entry.delta < -150;
                      const fill = isSurplus ? '#ff8c42' : isDeficit ? '#00f5a0' : '#8f9fb5';
                      return <Cell key={`cell-${idx}`} fill={fill} />;
                    })}
                  </Bar>
                  <Line type="monotone" dataKey="target" stroke="#ffb020" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="rd-nutrition-summary">
              <p>Surplus days: <strong>{nutritionSummary.surplusDays}</strong></p>
              <p>Deficit days: <strong>{nutritionSummary.deficitDays}</strong></p>
              <p>On-target days: <strong>{nutritionSummary.targetDays}</strong></p>
            </div>
            <div className="rd-nutrition-summary">
              <p>
                You held a surplus on {nutritionSummary.surplusDays} days and a deficit on {nutritionSummary.deficitDays} days.
                Target was met on {nutritionSummary.targetDays} days.
              </p>
              <p>Target consistency: {nutritionSummary.targetDays >= 4 ? 'On track' : 'Needs consistency'}</p>
            </div>
          </div>

          <div className="rd-card rd-card--stress">
            <div className="rd-card-header">
              <div>
                <h3>Stress Load</h3>
                <span>Based on HRV, RHR, and sleep debt</span>
              </div>
            </div>
            <div className="rd-stress-meter">
              <div className="rd-stress-fill" style={{ width: `${avgStress}%` }} />
            </div>
            <div className="rd-stress-chart">
              <ResponsiveContainer width="100%" height={stressChart.height}>
                <AreaChart data={stressTrend}>
                  <defs>
                    <linearGradient id="stressFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb020" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#ff4d6d" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                    formatter={(value) => [`${value}`, 'Stress']}
                  />
                  <Area type="monotone" dataKey="stress" stroke="#ffb020" fill="url(#stressFill)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rd-stress-meta">
              <p>7-day average: <strong>{avgStress}</strong> / 100 ({describeStress(avgStress)})</p>
              <p>Recent trend: {stressScores[stressScores.length - 1] > avgStress ? 'Rising' : 'Stable'}</p>
            </div>
          </div>
        </section>

        <section className="rd-card rd-card--tips">
          <div className="rd-card-header">
            <div>
              <h3>Recovery Insights</h3>
              <span>AI guided plan</span>
            </div>
            <button className="rd-action" onClick={fetchTips} disabled={tipsLoading}>
              {tipsLoading ? 'Analyzing...' : 'Generate Tips'}
            </button>
          </div>
          {tips ? (
            <div className="rd-tips-grid">
              {Object.entries(tips).map(([category, items]) => (
                <div key={category} className="rd-tip-block">
                  <div className="rd-tip-title">{category}</div>
                  <ul>
                    {items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="rd-tip-placeholder">
              <Brain size={18} />
              <p>Generate personalized recovery recommendations based on your sleep, stress, and nutrition patterns.</p>
              <div className="rd-tip-icons">
                <span><MoonStar size={14} /> Sleep</span>
                <span><Activity size={14} /> Training</span>
                <span><Leaf size={14} /> Nutrition</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default RecoveryDashboard;