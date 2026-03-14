
const BASE_URL = 'https://www.googleapis.com/fitness/v1/users/me';

export type FitData = {
  steps: number;
  sleep: {
    startTimeMillis: number;
    endTimeMillis: number;
    stage: number; // 1: Awake, 2: Sleep, 3: Out-of-bed, 4: Light, 5: Deep, 6: REM
  }[];
  heartRate: {
    bpm: number;
    startTimeMillis: number;
  }[];
  calories: number;
};

export type DailyFitData = {
  date: string;
  steps: number;
  calories: number;
  sleep: {
    totalMinutes: number;
    deepMinutes: number;
    remMinutes: number;
    lightMinutes: number;
    awakeMinutes: number;
    startTime: string;
    endTime: string;
  };
  heartRate: {
    avg: number;
    min: number;
    max: number;
  };
};

// Helper to get start/end of day in local time as millis
const getDayRange = (dateOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dateOffset);
  
  // Start of day: 00:00:00.000
  d.setHours(0, 0, 0, 0);
  const start = d.getTime();
  
  // End of day: 23:59:59.999
  // We use the end of the day even for "today" because Google Fit 
  // handles future-dated ranges by returning data up to the current moment.
  d.setHours(23, 59, 59, 999);
  const end = d.getTime();
  
  // Format as YYYY-MM-DD in LOCAL time to avoid timezone shifts
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  return { start, end, dateStr };
};

export const fetchGoogleFitHistory = async (token: string, days = 8): Promise<DailyFitData[]> => {
  const promises = [];

  for (let i = 0; i < days; i++) {
    const { start, end, dateStr } = getDayRange(i);
    promises.push(
      fetchDailyAggregate(token, start, end).then(data => ({
        date: dateStr,
        ...data
      }))
    );
  }

  const result = await Promise.all(promises);
  return result.reverse(); // Oldest first
};

const fetchDailyAggregate = async (token: string, startTimeMillis: number, endTimeMillis: number) => {
  const body = {
    aggregateBy: [
      { dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas" },
      { dataSourceId: "derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended" },
      { dataSourceId: "derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm" },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis,
    endTimeMillis
  };

  try {
    // 1. Fetch Aggregates (Steps, Calories, HR)
    const res = await fetch(`${BASE_URL}/dataset:aggregate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Google Fit API error: ${res.status}`);
    }

    const json = await res.json();
    console.log(`[Google Fit Raw Aggregate] Range: ${new Date(startTimeMillis).toLocaleString()} - ${new Date(endTimeMillis).toLocaleString()}`, json);
    let steps = 0;
    let calories = 0;
    let hrAvg = 0, hrMax = 0, hrMin = 0, hrPointsTotal = 0;

    json.bucket?.forEach((bucket: any) => {
      // Steps
      bucket?.dataset?.[0]?.point?.forEach((p: any) => {
        steps += p.value?.[0]?.intVal || 0;
      });

      // Calories
      bucket?.dataset?.[1]?.point?.forEach((p: any) => {
        calories += p.value?.[0]?.fpVal || 0;
      });

      // Heart Rate - Average all points in the bucket
      const hrPoints = bucket?.dataset?.[2]?.point || [];
      hrPoints.forEach((hrPoint: any) => {
        const val = hrPoint.value?.[0]?.fpVal || 0;
        if (val > 0) {
          hrAvg += val;
          hrMax = Math.max(hrMax, hrPoint.value?.[1]?.fpVal || val);
          hrMin = hrMin === 0 ? (hrPoint.value?.[2]?.fpVal || val) : Math.min(hrMin, hrPoint.value?.[2]?.fpVal || val);
          hrPointsTotal++;
        }
      });
    });

    if (hrPointsTotal > 0) hrAvg = hrAvg / hrPointsTotal;

    // 2. Fetch Sleep (Separate call often needed for segments)
    const sleepData = await fetchSleepData(token, startTimeMillis);

    return {
      steps,
      calories: Math.round(calories),
      heartRate: { avg: Math.round(hrAvg), min: Math.round(hrMin), max: Math.round(hrMax) },
      sleep: sleepData
    };

  } catch (err) {
    console.warn("Google Fit Fetch Error", err);
    return {
      steps: 0,
      calories: 0,
      heartRate: { avg: 0, min: 0, max: 0 },
      sleep: { totalMinutes: 0, deepMinutes: 0, remMinutes: 0, lightMinutes: 0, awakeMinutes: 0, startTime: '', endTime: '' }
    };
  }
};


const fetchSleepData = async (token: string, start: number) => {
  // Attribute sleep to the day it ENDS. 
  // We query from 6:00 PM the previous day to 6:00 PM the current day.
  const sleepWindowStart = start - 21600000; // start (00:00) - 6 hours = 18:00 previous day
  const sleepWindowEnd = start + 64800000;  // start (00:00) + 18 hours = 18:00 current day

  const body = {
    aggregateBy: [{ dataTypeName: "com.google.sleep.segment" }],
    startTimeMillis: sleepWindowStart,
    endTimeMillis: sleepWindowEnd
  };

  try {
    const res = await fetch(`${BASE_URL}/dataset:aggregate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const json = await res.json();
    const points = json.bucket?.[0]?.dataset?.[0]?.point || [];

    let deep = 0, rem = 0, light = 0, awake = 0, generic = 0;
    let minTime = Number.MAX_SAFE_INTEGER;
    let maxTime = 0;

    points.forEach((p: any) => {
      const type = p.value[0].intVal;
      const s = parseInt(p.startTimeNanos) / 1000000;
      const e = parseInt(p.endTimeNanos) / 1000000;
      const durationMin = (e - s) / 60000;

      if (s < minTime) minTime = s;
      if (e > maxTime) maxTime = e;

      // Google Fit Sleep stages: 1 (Awake), 2 (Sleep/Generic), 3 (Out-of-bed), 4 (Light), 5 (Deep), 6 (REM)
      if (type === 5) deep += durationMin;
      else if (type === 6) rem += durationMin;
      else if (type === 4) light += durationMin;
      else if (type === 1 || type === 3) awake += durationMin;
      else if (type === 2) generic += durationMin;
    });

    // Deduplication: If we have granular data (Deep/REM/Light), ignore the Generic 'Sleep' segments
    // which are often just envelopes covering the whole session.
    const hasGranularData = (deep + rem + light) > 0;
    const finalLight = hasGranularData ? light : generic;
    const total = deep + rem + finalLight + awake;
    
    // Format times
    const formatTime = (ms: number) => {
      if (ms === Number.MAX_SAFE_INTEGER || ms === 0) return "00:00";
      const d = new Date(ms);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return {
      totalMinutes: Math.round(total),
      deepMinutes: Math.round(deep),
      remMinutes: Math.round(rem),
      lightMinutes: Math.round(finalLight),
      awakeMinutes: Math.round(awake),
      startTime: formatTime(minTime),
      endTime: formatTime(maxTime)
    };

  } catch (err) {
    return { totalMinutes: 0, deepMinutes: 0, remMinutes: 0, lightMinutes: 0, awakeMinutes: 0, startTime: "00:00", endTime: "00:00" };
  }
};
