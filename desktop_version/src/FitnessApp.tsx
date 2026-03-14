import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Utensils, Unlock, Flame, HeartPulse, Edit2, Check, User, ArrowLeft, Download, Volume2, VolumeX, LogOut } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import '@google/model-viewer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import avatarModelUrl from './assets/avatar_model/6987da136eb4878bb8625c33.glb';
import talkAnim01 from './assets/avatar_model/animation-library-master/animation-library-master/masculine/glb/expression/M_Talking_Variations_001.glb';
import talkAnim02 from './assets/avatar_model/animation-library-master/animation-library-master/masculine/glb/expression/M_Talking_Variations_002.glb';
import talkAnim03 from './assets/avatar_model/animation-library-master/animation-library-master/masculine/glb/expression/M_Talking_Variations_003.glb';
import talkAnim04 from './assets/avatar_model/animation-library-master/animation-library-master/masculine/glb/expression/M_Talking_Variations_004.glb';
import talkAnim05 from './assets/avatar_model/animation-library-master/animation-library-master/masculine/glb/expression/M_Talking_Variations_005.glb';
import idleAnimUrl from './assets/avatar_model/animation-library-master/animation-library-master/masculine/glb/idle/M_Standing_Idle_001.glb';
import PdfReport from './components/PdfReport';
import { useAuth } from './context/AuthContext';
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
  onOpenRecovery?: () => void;
}

type ModelViewerProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  alt?: string;
  'camera-controls'?: boolean;
  'auto-rotate'?: boolean;
  'camera-orbit'?: string;
  'camera-target'?: string;
  'field-of-view'?: string;
  autoplay?: boolean;
  'animation-loop'?: boolean;
  exposure?: string | number;
  'shadow-intensity'?: string | number;
  'interaction-prompt'?: string;
  'disable-tap'?: boolean;
  'disable-pan'?: boolean;
  'disable-zoom'?: boolean;
  'orbit-sensitivity'?: number;
  'touch-action'?: string;
};

const ModelViewer = (props: ModelViewerProps) => React.createElement('model-viewer', props);

const FitnessApp: React.FC<FitnessAppProps> = ({ userData, onBack, onOpenRecovery }) => {
  const { logout } = useAuth();
  // --- General Stats State ---
  const [isSummarized, setIsSummarized] = useState(false);
  const [editingBio, setEditingBio] = useState(false); // Toggle for bio editing
  const [showBreakdown, setShowBreakdown] = useState(false); // Toggle for calorie breakdown
  const [units, setUnits] = useState<UnitSystem>(userData?.units || 'metric');
  
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAvatar, setShowAvatar] = useState(true);
  const lastSpokenRef = useRef<string | null>(null);

  // --- Animation refs ---
  const avatarContainerRef = useRef<HTMLDivElement>(null);
  const modelViewerElRef = useRef<any>(null);
  const morphMeshesRef = useRef<any[]>([]);
  const forceRenderFnRef = useRef<(() => void) | null>(null);
  const animRafRef = useRef<number | null>(null);
  const animMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animClipsRef = useRef<THREE.AnimationClip[]>([]);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const sceneRootRef = useRef<any>(null);
  const idleClipRef = useRef<THREE.AnimationClip | null>(null);
  const idleRafRef = useRef<number | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);

  // --- Azure TTS refs ---
  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const playerRef = useRef<SpeechSDK.SpeakerAudioDestination | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const speakRecommendation = (text: string) => {
    if (!text.trim()) return;

    stopSpeaking();

    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    if (!speechKey || !speechRegion) {
      console.warn('[FitTrack] Azure Speech credentials missing');
      return;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisVoiceName = 'en-US-GuyNeural';

    const player = new SpeechSDK.SpeakerAudioDestination();
    const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    playerRef.current = player;
    synthesizerRef.current = synthesizer;
    lastSpokenRef.current = text;
    setIsSpeaking(true);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      setIsSpeaking(false);
      synthesizer.close();
      synthesizerRef.current = null;
      playerRef.current = null;
    };

    player.onAudioEnd = () => {
      console.log('[FitTrack] Audio playback ended');
      cleanup();
    };

    synthesizer.speakTextAsync(
      text,
      (result: SpeechSDK.SpeechSynthesisResult) => {
        if (result.reason === SpeechSDK.ResultReason.Canceled) {
          const cancellation = SpeechSDK.CancellationDetails.fromResult(result);
          console.warn('[FitTrack] Azure TTS canceled:', cancellation.reason, cancellation.errorDetails);
          cleanup();
          return;
        }
        // Schedule a fallback stop based on audio duration in case onAudioEnd doesn't fire
        if (result.audioDuration) {
          const durationMs = result.audioDuration / 10000; // audioDuration is in 100ns ticks
          console.log('[FitTrack] Audio duration:', (durationMs / 1000).toFixed(1) + 's');
          setTimeout(() => {
            if (!cleaned) {
              console.log('[FitTrack] Fallback cleanup after audio duration');
              cleanup();
            }
          }, durationMs + 500); // 500ms buffer
        }
      },
      (err: string) => {
        console.error('[FitTrack] Azure TTS error:', err);
        cleanup();
      }
    );
  };

  const stopSpeaking = () => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.close();
      playerRef.current = null;
    }
    if (synthesizerRef.current) {
      synthesizerRef.current.close();
      synthesizerRef.current = null;
    }
    setIsSpeaking(false);
  };

  // --- Discover scene, morph targets, and create AnimationMixer ---
  const initModel = useCallback(() => {
    const mv = modelViewerElRef.current;
    if (!mv) return;

    const meshes: any[] = [];
    let needsRenderFn: (() => void) | null = null;
    let scene: any = null;

    try {
      const allSymbols: symbol[] = [];
      let obj: any = mv;
      while (obj && obj !== HTMLElement.prototype) {
        try { allSymbols.push(...Object.getOwnPropertySymbols(obj)); } catch (_) { /* skip */ }
        obj = Object.getPrototypeOf(obj);
      }

      for (const sym of allSymbols) {
        try {
          const desc = sym.description || sym.toString();
          const val = mv[sym];

          if (!scene && (desc === 'scene' || desc === 'modelScene')) {
            if (val && typeof val.traverse === 'function') scene = val;
            else if (val?.scene && typeof val.scene.traverse === 'function') scene = val.scene;
          }

          if (desc === 'needsRender' && typeof val === 'function') {
            const capturedSym = sym;
            needsRenderFn = () => { try { mv[capturedSym](); } catch (_) {} };
          }
        } catch (_) { /* skip */ }
      }

      if (scene) {
        scene.traverse((node: any) => {
          if (node.isMesh && node.morphTargetInfluences && node.morphTargetDictionary) {
            meshes.push(node);
          }
        });

        // Create AnimationMixer on scene root for skeletal animations
        sceneRootRef.current = scene;
        animMixerRef.current = new THREE.AnimationMixer(scene);
        console.log('[FitTrack] AnimationMixer created on scene root');
      }
    } catch (e) {
      console.warn('[FitTrack] Model init failed:', e);
    }

    morphMeshesRef.current = meshes;
    forceRenderFnRef.current = needsRenderFn;

    if (meshes.length > 0) {
      const names = meshes.flatMap((m: any) => Object.keys(m.morphTargetDictionary));
      console.log('[FitTrack] Found morph targets:', [...new Set(names)]);
    }
  }, []);

  // --- Load animation clips from GLBs (talk + idle) ---
  useEffect(() => {
    const loader = new GLTFLoader();
    const talkUrls = [talkAnim01, talkAnim02, talkAnim03, talkAnim04, talkAnim05];

    // Load talking animations
    Promise.all(
      talkUrls.map(url =>
        new Promise<THREE.AnimationClip[]>((resolve) => {
          loader.load(
            url,
            (gltf) => {
              console.log('[FitTrack] Loaded talk anim', url.slice(-20), '- clips:', gltf.animations.length);
              resolve(gltf.animations);
            },
            undefined,
            (err) => { console.warn('[FitTrack] Failed to load animation:', err); resolve([]); }
          );
        })
      )
    ).then(results => {
      animClipsRef.current = results.flat();
      console.log('[FitTrack] Total talk clips loaded:', animClipsRef.current.length);
    });

    // Load idle animation
    loader.load(
      idleAnimUrl,
      (gltf) => {
        if (gltf.animations.length > 0) {
          idleClipRef.current = gltf.animations[0];
          console.log('[FitTrack] Idle animation loaded:', gltf.animations[0].name, 'duration:', gltf.animations[0].duration.toFixed(1) + 's');
        }
      },
      undefined,
      (err) => console.warn('[FitTrack] Failed to load idle animation:', err)
    );
  }, []);

  // Connect to the model-viewer DOM element and listen for load
  useEffect(() => {
    const container = avatarContainerRef.current;
    if (!container) return;

    const mv = container.querySelector('model-viewer') as any;
    if (!mv) return;

    modelViewerElRef.current = mv;

    const onLoad = () => initModel();
    mv.addEventListener('load', onLoad);
    if (mv.loaded) initModel();

    return () => {
      mv.removeEventListener('load', onLoad);
    };
  }, [showAvatar, isSummarized, recommendation, initModel]);

  // --- Helper: start idle animation loop ---
  const startIdleAnimation = useCallback(() => {
    const mixer = animMixerRef.current;
    const idleClip = idleClipRef.current;
    if (!mixer || !idleClip) return;

    // Stop any current actions first
    mixer.stopAllAction();
    currentActionRef.current = null;

    const action = mixer.clipAction(idleClip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.fadeIn(0.4);
    action.play();
    idleActionRef.current = action;
    console.log('[FitTrack] Playing idle animation');

    // Start a persistent RAF loop for the idle animation
    if (idleRafRef.current) cancelAnimationFrame(idleRafRef.current);
    let lastTime = performance.now();
    const tick = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      mixer.update(delta);
      if (forceRenderFnRef.current) forceRenderFnRef.current();
      idleRafRef.current = requestAnimationFrame(tick);
    };
    idleRafRef.current = requestAnimationFrame(tick);
  }, []);

  // --- Stop idle animation ---
  const stopIdleAnimation = useCallback(() => {
    if (idleActionRef.current) {
      idleActionRef.current.fadeOut(0.3);
      idleActionRef.current = null;
    }
    if (idleRafRef.current) {
      cancelAnimationFrame(idleRafRef.current);
      idleRafRef.current = null;
    }
  }, []);

  // --- Start idle animation when model loads ---
  useEffect(() => {
    if (!showAvatar) return;
    const checkInterval = setInterval(() => {
      if (animMixerRef.current && idleClipRef.current && !isSpeaking) {
        clearInterval(checkInterval);
        startIdleAnimation();
      }
    }, 50);
    return () => clearInterval(checkInterval);
  }, [showAvatar, isSummarized, recommendation, startIdleAnimation]);

  // --- Animate during TTS: skeletal (arms/body) + morph targets (mouth) ---
  useEffect(() => {
    const mixer = animMixerRef.current;
    const clips = animClipsRef.current;
    const meshes = morphMeshesRef.current;

    const resetTalkMorphs = () => {
      meshes.forEach((mesh: any) => {
        if (!mesh.morphTargetInfluences) return;
        for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
          mesh.morphTargetInfluences[i] = 0;
        }
      });
      if (forceRenderFnRef.current) forceRenderFnRef.current();
    };

    if (!isSpeaking || !showAvatar) {
      // Stop talking animations and go back to idle
      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(0.3);
        currentActionRef.current = null;
      }
      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
      resetTalkMorphs();

      // Resume idle when speaking stops (but avatar still visible)
      if (showAvatar && mixer && idleClipRef.current) {
        startIdleAnimation();
      }
      return;
    }

    // --- Speaking started: stop idle, start talk animations ---
    stopIdleAnimation();
    if (mixer) mixer.stopAllAction();

    let clipSwitchTimer: ReturnType<typeof setTimeout> | null = null;

    const playRandomClip = () => {
      if (!mixer || clips.length === 0) return;

      let nextClip = clips[Math.floor(Math.random() * clips.length)];
      if (clips.length > 1 && currentActionRef.current) {
        const currentClipName = currentActionRef.current.getClip().name;
        while (nextClip.name === currentClipName) {
          nextClip = clips[Math.floor(Math.random() * clips.length)];
        }
      }

      const nextAction = mixer.clipAction(nextClip);
      nextAction.reset();
      nextAction.setLoop(THREE.LoopOnce, 1);
      nextAction.clampWhenFinished = false;

      if (currentActionRef.current) {
        nextAction.fadeIn(0.4);
        currentActionRef.current.fadeOut(0.4);
      } else {
        nextAction.fadeIn(0.3);
      }

      nextAction.play();
      currentActionRef.current = nextAction;

      clipSwitchTimer = setTimeout(() => {
        playRandomClip();
      }, nextClip.duration * 1000 - 400);
    };

    playRandomClip();

    // Combined RAF: skeletal mixer + morph mouth
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      const elapsed = (time - startTime) / 1000;

      if (mixer) mixer.update(delta);

      meshes.forEach((mesh: any) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

        const mouthOpenIdx = mesh.morphTargetDictionary['mouthOpen'];
        if (mouthOpenIdx !== undefined) {
          mesh.morphTargetInfluences[mouthOpenIdx] =
            Math.max(0, Math.sin(elapsed * 4.5)) * 0.5 +
            Math.max(0, Math.sin(elapsed * 7.3 + 1.2)) * 0.3;
        }

        const mouthSmileIdx = mesh.morphTargetDictionary['mouthSmile'];
        if (mouthSmileIdx !== undefined) {
          mesh.morphTargetInfluences[mouthSmileIdx] =
            0.1 + Math.max(0, Math.sin(elapsed * 0.8)) * 0.15;
        }
      });

      if (forceRenderFnRef.current) forceRenderFnRef.current();
      animRafRef.current = requestAnimationFrame(animate);
    };

    animRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (clipSwitchTimer) clearTimeout(clipSwitchTimer);
      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(0.3);
        currentActionRef.current = null;
      }
      resetTalkMorphs();
    };
  }, [isSpeaking, showAvatar, startIdleAnimation, stopIdleAnimation]);

  useEffect(() => {
    if (!isSummarized || recommendationLoading || !summary || !showAvatar) return;
    if (lastSpokenRef.current === summary) return;
    speakRecommendation(summary);
    return () => {
      stopSpeaking();
    };
  }, [isSummarized, summary, recommendationLoading, showAvatar]);

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
  const gainTimersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});
  const lostTimersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});
  

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

  const getDailyRecommendation = async (currentGainEntries?: GainEntry[], currentLostEntries?: LostEntry[], currentOtherEntries?: OtherEntry[]) => {
    setRecommendationLoading(true);
    setRecommendation(null);
    
    try {
        const gains = currentGainEntries || gainEntries;
        const losts = currentLostEntries || lostEntries;
        const others = currentOtherEntries || otherEntries;

        // Collect data
        const tdee = metrics.tdee !== '--' ? parseFloat(metrics.tdee) : 2000;
        const totalConsumed = gains.reduce((acc, e) => acc + (e.calories ? parseFloat(e.calories) : 0), 0);
        const totalBurned = losts.reduce((acc, e) => acc + (e.calories ? parseFloat(e.calories) : 0), 0);
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
                notes: others.map(e => `${e.category}: ${e.input}`).join('; ')
            },
            food_summary: gains.filter(e => e.input && e.calories).map(e => `${e.input} (${e.calories} kcal)`),
            activity_summary: losts.filter(e => e.activity && e.calories).map(e => `${e.activity} ${e.duration} (${e.calories} kcal)`)
        };

        const res = await fetch(`${API_BASE_URL}/recommendation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summaryRequest)
        });

        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        setRecommendation(data.recommendation ?? null);
        setSummary(data.summary ?? null);

    } catch (e) {
        console.error("Recommendation failed", e);
        setRecommendation("Could not generate recommendation at this time.");
        setSummary(null);
    } finally {
        setRecommendationLoading(false);
    }
  };


  const generateId = () => Math.random().toString(36).substr(2, 9);

  // --- Handlers ---

  const handleGainEnter = async (index: number) => {
    if (isSummarized) return;
    
    const entryId = gainEntries[index]?.id;
    if (entryId && gainTimersRef.current[entryId]) {
      clearTimeout(gainTimersRef.current[entryId]!);
      gainTimersRef.current[entryId] = null;
    }

    if (!gainEntries[index] || !gainEntries[index].input.trim() || gainEntries[index].loading || gainEntries[index].calories) return;

    setGainEntries((prev) => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], loading: true };
      return newEntries;
    });

    const currentEntry = gainEntries[index];
    // Call API
    const calories = await estimateEntry('food', currentEntry.input);
    
    setGainEntries((prev) => prev.map((entry, i) => 
        i === index ? { ...entry, loading: false, calories: calories } : entry
    ));
  };

  const handleGainInput = (index: number, value: string) => {
    if (isSummarized) return;
    
    setGainEntries((prev) => {
      const newEntries = [...prev];
      if (!newEntries[index]) return prev;
      const oldInput = newEntries[index].input;
      newEntries[index] = { ...newEntries[index], input: value };
      
      // If input changed, clear calories
      if (value !== oldInput) {
        newEntries[index].calories = null;
        newEntries[index].loading = false;
      }
      return newEntries;
    });

    const entryId = gainEntries[index]?.id;
    if (entryId) {
      if (gainTimersRef.current[entryId]) {
        clearTimeout(gainTimersRef.current[entryId]!);
      }
      if (value.trim()) {
        gainTimersRef.current[entryId] = setTimeout(() => {
          handleGainEnter(index);
        }, 1500);
      }
    }
  };

  const handleLostEnter = async (index: number) => {
    if (isSummarized) return;

    const entryId = lostEntries[index]?.id;
    if (entryId && lostTimersRef.current[entryId]) {
      clearTimeout(lostTimersRef.current[entryId]!);
      lostTimersRef.current[entryId] = null;
    }

    if (!lostEntries[index] || !lostEntries[index].activity.trim() || !lostEntries[index].duration.trim() || lostEntries[index].loading || lostEntries[index].calories) return;

    setLostEntries((prev) => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], loading: true };
      return newEntries;
    });

    const currentEntry = lostEntries[index];
    const calories = await estimateEntry('activity', `${currentEntry.activity} for ${currentEntry.duration}`, parseFloat(stats.weight));
    
    setLostEntries((prev) => prev.map((entry, i) => 
        i === index ? { ...entry, loading: false, calories: calories } : entry
    ));
  };

  const handleLostInput = (index: number, field: 'activity' | 'duration', value: string) => {
    if (isSummarized) return;
    
    setLostEntries((prev) => {
      const newEntries = [...prev];
      if (!newEntries[index]) return prev;
      const oldActivity = newEntries[index].activity;
      const oldDuration = newEntries[index].duration;
      newEntries[index] = { ...newEntries[index], [field]: value };

      // If input changed, clear calories
      if (newEntries[index].activity !== oldActivity || newEntries[index].duration !== oldDuration) {
        newEntries[index].calories = null;
        newEntries[index].loading = false;
      }
      return newEntries;
    });

    const entryId = lostEntries[index]?.id;
    if (entryId) {
      if (lostTimersRef.current[entryId]) {
        clearTimeout(lostTimersRef.current[entryId]!);
      }
      
      const currentEntry = lostEntries[index];
      const activity = field === 'activity' ? value : currentEntry.activity;
      const duration = field === 'duration' ? value : currentEntry.duration;

      if (activity.trim() && duration.trim()) {
        lostTimersRef.current[entryId] = setTimeout(() => {
          handleLostEnter(index);
        }, 1500);
      }
    }
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

    // If both fields are empty, clear response
    if (!newEntries[index].input.trim() || !newEntries[index].category.trim()) {
      newEntries[index].response = null;
      newEntries[index].loading = false;
      setOtherEntries(newEntries);
      return;
    }
  };

  const toggleSummarize = async () => {
    if (isSummarized) {
      setIsSummarized(false);
      setRecommendation(null);
      setSummary(null);
      lastSpokenRef.current = null;
      stopSpeaking();
    } else {
      // Clear any pending timers
      Object.values(gainTimersRef.current).forEach(t => t && clearTimeout(t));
      gainTimersRef.current = {};
      Object.values(lostTimersRef.current).forEach(t => t && clearTimeout(t));
      lostTimersRef.current = {};

      // 1. Filter out completely empty entries first
      const validGains = gainEntries.filter(e => e.input.trim() !== '');
      const validLosts = lostEntries.filter(e => e.activity.trim() !== '' && e.duration.trim() !== '');
      const validOthers = otherEntries.filter(e => e.input.trim() !== '' && e.category.trim() !== '');

      // 2. Estimate those that don't have calories yet
      const estimatedGains = await Promise.all(validGains.map(async e => {
        if (e.calories) return e;
        const cals = await estimateEntry('food', e.input);
        return { ...e, calories: cals };
      }));

      const estimatedLosts = await Promise.all(validLosts.map(async e => {
        if (e.calories) return e;
        const cals = await estimateEntry('activity', `${e.activity} for ${e.duration}`, parseFloat(stats.weight));
        return { ...e, calories: cals };
      }));

      // 3. Update state
      setGainEntries(estimatedGains);
      setLostEntries(estimatedLosts);
      setOtherEntries(validOthers);
      setIsSummarized(true);
      
      // Scroll to top to see recommendation
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // 4. Call recommendation with the freshly estimated data
      getDailyRecommendation(estimatedGains, estimatedLosts, validOthers);
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
            {onOpenRecovery ? (
              <button className="fa-header-tag fa-header-tag--button" onClick={onOpenRecovery}>
                Recovery Dashboard
              </button>
            ) : (
              <span className="fa-header-tag">Dashboard</span>
            )}
            {onBack && (
              <button className="fa-back-btn" onClick={onBack}>
                <ArrowLeft size={14} /> Home
              </button>
            )}
            <button className="fa-back-btn" onClick={logout} style={{ marginLeft: '1rem', color: '#ef4444' }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="fa-main">
        
        {/* Recommendation Section (Visible when summarized) */}
        {(recommendation || recommendationLoading) && isSummarized && (
          <section className="fa-card fa-recommendation">
            <div className="fa-recommendation-layout">
              <div className="fa-recommendation-content">
                <div className="fa-recommendation-header">
                  <div className="fa-recommendation-icon">
                    <Check size={20} />
                  </div>
                  <div>
                    <h3 className="fa-recommendation-title">Daily Analysis</h3>
                    <div className="fa-recommendation-subtitle">AI-guided summary based on today&apos;s entries.</div>
                  </div>
                </div>
                {recommendationLoading ? (
                  <div className="fa-recommendation-loading">Analyzing your data with AI...</div>
                ) : (
                  <div className="fa-recommendation-text">
                    {(() => {
                      if (!recommendation) return null;
                      const lines = recommendation.split('\n');
                      const elements: React.ReactNode[] = [];
                      let currentList: React.ReactNode[] = [];

                      lines.forEach((line, i) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('* ')) {
                          currentList.push(
                            <li key={`li-${i}`} style={{ marginLeft: '1.2rem', listStyleType: 'disc', marginBottom: '0.4rem' }}>
                              {trimmed.substring(2)}
                            </li>
                          );
                        } else {
                          if (currentList.length > 0) {
                            elements.push(<ul key={`ul-${i}`} style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>{currentList}</ul>);
                            currentList = [];
                          }
                          if (trimmed) {
                            elements.push(<p key={`p-${i}`} style={{ marginBottom: '0.75rem' }}>{line}</p>);
                          }
                        }
                      });

                      if (currentList.length > 0) {
                        elements.push(<ul key="ul-final" style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>{currentList}</ul>);
                      }

                      return elements;
                    })()}
                  </div>
                )}
                <div className="fa-recommendation-actions">
                  <button
                    className="fa-pill-btn"
                    onClick={() => summary && speakRecommendation(summary)}
                    disabled={recommendationLoading || !summary}
                  >
                    <Volume2 size={14} /> Replay Audio
                  </button>
                  {isSpeaking && (
                    <button className="fa-pill-btn" onClick={stopSpeaking}>
                      <VolumeX size={14} /> Stop
                    </button>
                  )}
                  <button
                    className="fa-pill-btn"
                    onClick={() => {
                      if (showAvatar) stopSpeaking();
                      setShowAvatar(prev => !prev);
                    }}
                  >
                    {showAvatar ? 'Hide Avatar' : 'Show Avatar'}
                  </button>
                </div>
              </div>
              {showAvatar && (
                <div className="fa-recommendation-model" ref={avatarContainerRef}>
                  <ModelViewer
                    src={avatarModelUrl}
                    camera-orbit="0deg 85deg 0.7m"
                    camera-target="0m 1.6m 0m"
                    field-of-view="18deg"
                    interaction-prompt="none"
                    disable-tap
                    disable-pan
                    disable-zoom
                    orbit-sensitivity={0}
                    touch-action="none"
                    exposure="0.9"
                    shadow-intensity="0"
                    alt="FitTrack coach avatar"
                    style={{ pointerEvents: 'none' }}
                  />
                  <div className="fa-recommendation-model-label">{isSpeaking ? 'Speaking...' : 'Coach Avatar'}</div>
                </div>
              )}
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
                    disabled={isSummarized}
                    type="text"
                    placeholder="e.g. 2 eggs..."
                    className="fa-entry-input"
                    value={entry.input}
                    onChange={(e) => {
                      handleGainInput(idx, e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        if (!entry.input.trim()) return;
                        e.preventDefault();
                        handleGainEnter(idx);
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
                  <select
                    ref={el => { lostInputRefs.current[`${entry.id}-act`] = el as any; }}
                    disabled={isSummarized}
                    className="fa-entry-input"
                    value={entry.activity}
                    onChange={(e) => {
                      handleLostInput(idx, 'activity', e.target.value);
                    }}
                  >
                    <option value="" disabled>Select Activity</option>
                    <option value="Walking">Walking</option>
                    <option value="Running">Running</option>
                    <option value="Jumping Jacks">Jumping Jacks</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Swimming">Swimming</option>
                    <option value="Yoga">Yoga</option>
                    <option value="Weightlifting">Weightlifting</option>
                    <option value="HIIT">HIIT</option>
                    <option value="Dancing">Dancing</option>
                    <option value="Hiking">Hiking</option>
                    <option value="Pilates">Pilates</option>
                    <option value="Rowing">Rowing</option>
                  </select>
                  <input
                    disabled={isSummarized}
                    type="text"
                    placeholder="30m"
                    className="fa-entry-input fa-entry-input--sm"
                    value={entry.duration}
                    onChange={(e) => handleLostInput(idx, 'duration', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        if (!entry.activity.trim() || !entry.duration.trim()) return;
                        e.preventDefault();
                        handleLostEnter(idx);
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
                  <select
                    ref={el => { otherInputRefs.current[`${entry.id}-cat`] = el as any; }}
                    disabled={isSummarized}
                    className="fa-entry-input fa-entry-input--cat"
                    value={entry.category}
                    onChange={(e) => {
                      handleOtherInput(idx, 'category', e.target.value);
                    }}
                  >
                    <option value="" disabled>Category</option>
                    <option value="Sleep">Sleep</option>
                    <option value="Stress">Stress</option>
                    <option value="Mood">Mood</option>
                    <option value="Hydration">Hydration</option>
                    <option value="Meditation">Meditation</option>
                    <option value="Screen Time">Screen Time</option>
                    <option value="Caffeine">Caffeine</option>
                    <option value="Alcohol">Alcohol</option>
                    <option value="Supplements">Supplements</option>
                    <option value="Weight">Weight</option>
                  </select>
                  <input
                    disabled={isSummarized}
                    type="text"
                    placeholder="Value / Note"
                    className="fa-entry-input"
                    value={entry.input}
                    onChange={(e) => handleOtherInput(idx, 'input', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSummarized) {
                        if (!entry.category.trim() || !entry.input.trim()) return;
                        e.preventDefault();
                        handleOtherEnter(idx);
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
        <div className="fa-action-area" style={{ flexDirection: 'column', gap: '1rem' }}>
          {isSummarized ? (
            <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
                <button className="fa-unlock-btn" onClick={toggleSummarize}>
                <Unlock size={18} /> Unlock Entries
                </button>
                
                {recommendation && (
                    <PDFDownloadLink
                        document={
                            <PdfReport 
                                userStats={stats}
                                metrics={metrics}
                                gainEntries={gainEntries}
                                lostEntries={lostEntries}
                                recommendation={recommendation}
                                date={new Date().toLocaleDateString()}
                            />
                        }
                        fileName={`FitTrack_Report_${new Date().toISOString().split('T')[0]}.pdf`}
                        style={{ textDecoration: 'none' }}
                    >
                      {({ loading }) => (
                        <button 
                          className="fa-unlock-btn" 
                          disabled={loading}
                          style={{ background: '#ef4444', color: '#ffffff', border: 'none' }}
                        >
                          <Download size={18} />
                          {loading ? 'Preparing...' : 'Download Report'}
                        </button>
                      )}
                    </PDFDownloadLink>
                )}
            </div>
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
