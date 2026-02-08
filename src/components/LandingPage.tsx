import { useState, useEffect } from "react";
import "./LandingPage.css";
import heroImg from "../assets/David_goggins.png";
import formBgImg from "../assets/goggins_signinpage.jpg";
import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";

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

const INITIAL_DATA: UserData = {
  name: "",
  age: "",
  sex: "",
  heightCm: "",
  heightFt: "",
  heightIn: "",
  weight: "",
  targetweight: "",
  activityLevel: "",
  fitnessGoal: "",
  workoutFrequency: "",
  experienceLevel: "",
};

const QUOTES = [
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
];

interface LandingPageProps {
  onComplete?: (data: UserData & { units: UnitSystem }) => void;
  onStart?: () => void;
  initialStep?: number;
}

export default function LandingPage({ onComplete, onStart, initialStep = 0 }: LandingPageProps) {
  const { logout, user } = useAuth();
  // 0 = hero, 1 = transition, 2 = form, 3 = done
  const [step, setStep] = useState(initialStep);
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [data, setData] = useState<UserData>(INITIAL_DATA);
  const [formSection, setFormSection] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState(0); // 0=hidden, 1=line1, 2=line2, 3=fade-out

  const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

  // stagger hero entrance
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // transition auto‑advance
  useEffect(() => {
    if (step !== 1) return;
    const t1 = setTimeout(() => setTransitionPhase(1), 100);
    const t2 = setTimeout(() => setTransitionPhase(2), 1400);
    const t3 = setTimeout(() => setTransitionPhase(3), 3200);
    const t4 = setTimeout(() => {
      setStep(2);
      setTransitionPhase(0);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [step]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const nextSection = () => {
    if (formSection < 2) setFormSection((s) => s + 1);
    else {
      setStep(3);
      onComplete?.({ ...data, units });
    }
  };

  const prevSection = () => {
    if (formSection > 0) setFormSection((s) => s - 1);
    else setStep(0);
  };

  const handleJoinClick = () => {
    if (user) {
      setStep(1);
      setTransitionPhase(0);
    } else if (onStart) {
      onStart();
    }
  };

  return (
    <div className="lp-root">
      {/* abstract bg shapes */}
      <div className="lp-bg">
        <div className="lp-bg-grain" />
        <div className="lp-bg-gradient" />
        <div className="lp-bg-line lp-bg-line--1" />
        <div className="lp-bg-line lp-bg-line--2" />
        <div className="lp-bg-line lp-bg-line--3" />
        <div className="lp-bg-circle lp-bg-circle--1" />
        <div className="lp-bg-circle lp-bg-circle--2" />
      </div>

      {/* =============== HERO =============== */}
      <div className={`lp-screen lp-welcome ${step === 0 ? "active" : "exit"}`}>
        {/* hero portrait */}
        <div className={`lp-hero-img ${heroVisible ? "show" : ""}`}>
          <img src={heroImg} alt="" />
          <div className="lp-hero-img-fade" />
        </div>

        {/* nav bar */}
        <header className={`lp-nav-bar ${heroVisible ? "show" : ""}`}>
          <span className="lp-logo">
            FIT<span className="lp-logo-accent">TRACK</span>
          </span>
          <nav className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
            {user && (
              <button 
                onClick={logout} 
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <LogOut size={16} /> Logout
              </button>
            )}
          </nav>
          <button className="lp-nav-join" onClick={handleJoinClick}>
            {user ? 'Onboarding' : 'Join Now'}
          </button>
        </header>

        <div className={`lp-hero ${heroVisible ? "visible" : ""}`}>
          <p className="lp-hero-tag">Start your transformation</p>
          <h1 className="lp-headline">
            <span className="lp-headline-line">IT'S NOT FITNESS.</span>
            <span className="lp-headline-line lp-headline-accent">IT'S A LIFESTYLE.</span>
          </h1>
          <p className="lp-hero-sub">
            Track every rep, every mile, every goal — and watch yourself evolve.
          </p>
          <button className="lp-cta" onClick={handleJoinClick}>
            Get Started
          </button>
        </div>

        {/* quote bar at bottom */}
        <div className={`lp-quote-bar ${heroVisible ? "show" : ""}`}>
          <p className="lp-quote-text">"{quote.text}"</p>
          <span className="lp-quote-author">— {quote.author}</span>
        </div>
      </div>

      {/* =============== TRANSITION =============== */}
      <div className={`lp-screen lp-transition ${step === 1 ? "active" : ""}`}>
        <div className="lp-transition-box">
          <h2 className={`lp-trans-line lp-trans-1 ${transitionPhase >= 1 ? "show" : ""}`}>
            Welcome to <span className="lp-headline-accent">FitTrack</span>.
          </h2>
          <p className={`lp-trans-line lp-trans-2 ${transitionPhase >= 2 ? "show" : ""}`}>
            Let's get to know you before we begin.
          </p>
        </div>
      </div>

      {/* =============== FORM =============== */}
      <div className={`lp-screen lp-form-screen ${step === 2 ? "active" : step === 3 ? "exit" : ""}`}>
        {/* form bg image */}
        <div className="lp-form-bg">
          <img src={formBgImg} alt="" />
          <div className="lp-form-bg-overlay" />
        </div>
        <div className="lp-form-card">
          {/* progress */}
          <div className="lp-progress-track">
            <div className="lp-progress-fill" style={{ width: `${((formSection + 1) / 3) * 100}%` }} />
          </div>
          <div className="lp-steps-row">
            {["Personal Info", "Body Stats", "Fitness Goals"].map((label, i) => (
              <button
                key={label}
                className={`lp-step-label ${i === formSection ? "current" : ""} ${i < formSection ? "done" : ""}`}
                onClick={() => i <= formSection && setFormSection(i)}
              >
                <span className="lp-step-num">{i + 1}</span>
                {label}
              </button>
            ))}
          </div>

          {/* ---- SECTION 0 ---- */}
          <div className={`lp-sec ${formSection === 0 ? "active" : formSection > 0 ? "left" : "right"}`}>
            <h2 className="lp-form-heading">Tell us about yourself</h2>
            <div className="lp-field">
              <label htmlFor="name">Full Name</label>
              <input id="name" name="name" value={data.name} onChange={handleChange} placeholder="e.g. Alex Rivera" />
            </div>
            <div className="lp-field">
              <label htmlFor="age">Age</label>
              <input id="age" name="age" type="number" min={13} max={120} value={data.age} onChange={handleChange} placeholder="25" />
            </div>
            <div className="lp-field">
              <label htmlFor="sex">Sex</label>
              <select id="sex" name="sex" value={data.sex} onChange={handleChange}>
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* ---- SECTION 1 ---- */}
          <div className={`lp-sec ${formSection === 1 ? "active" : formSection > 1 ? "left" : "right"}`}>
            <div className="lp-heading-row">
              <h2 className="lp-form-heading">Body measurements</h2>
              <button
                className="lp-unit-pill"
                onClick={() => setUnits((u) => (u === "metric" ? "imperial" : "metric"))}
              >
                {units === "metric" ? "Metric" : "Imperial"}
                <span className="lp-unit-swap">⇄</span>
              </button>
            </div>

            {units === "metric" ? (
              <div className="lp-field">
                <label htmlFor="heightCm">Height (cm)</label>
                <input id="heightCm" name="heightCm" type="number" value={data.heightCm} onChange={handleChange} placeholder="175" />
              </div>
            ) : (
              <div className="lp-field-row">
                <div className="lp-field lp-field--half">
                  <label htmlFor="heightFt">Feet</label>
                  <input id="heightFt" name="heightFt" type="number" value={data.heightFt} onChange={handleChange} placeholder="5" />
                </div>
                <div className="lp-field lp-field--half">
                  <label htmlFor="heightIn">Inches</label>
                  <input id="heightIn" name="heightIn" type="number" value={data.heightIn} onChange={handleChange} placeholder="9" />
                </div>
              </div>
            )}

            <div className="lp-field">
              <label htmlFor="weight">Weight ({units === "metric" ? "kg" : "lbs"})</label>
              <input id="weight" name="weight" type="number" value={data.weight} onChange={handleChange} placeholder={units === "metric" ? "70" : "154"} />
            </div>

            <div className="lp-field">
              <label htmlFor="targetweight">Target Weight ({units === "metric" ? "kg" : "lbs"})</label>
              <input
                id="targetweight"
                name="targetweight"
                type="number"
                value={data.targetweight}
                onChange={handleChange}
                placeholder={units === "metric" ? "70" : "154"}
              />
            </div>
          </div>

          {/* ---- SECTION 2 ---- */}
          <div className={`lp-sec ${formSection === 2 ? "active" : formSection > 2 ? "left" : "right"}`}>
            <h2 className="lp-form-heading">Your fitness profile</h2>

            <div className="lp-field">
              <label htmlFor="activityLevel">Activity Level</label>
              <select id="activityLevel" name="activityLevel" value={data.activityLevel} onChange={handleChange}>
                <option value="" disabled>Select</option>
                <option value="sedentary">Sedentary — little or no exercise</option>
                <option value="light">Lightly active — 1‑3 days / week</option>
                <option value="moderate">Moderately active — 3‑5 days / week</option>
                <option value="active">Very active — 6‑7 days / week</option>
                <option value="extreme">Athlete — twice per day</option>
              </select>
            </div>

            <div className="lp-field">
              <label htmlFor="fitnessGoal">Primary Goal</label>
              <select id="fitnessGoal" name="fitnessGoal" value={data.fitnessGoal} onChange={handleChange}>
                <option value="" disabled>Select</option>
                <option value="lose-fat">Lose fat Agressively</option>
                <option value="lose-fat-gradual">Lose fat Moderately</option>
                <option value="lose fat moderately">Lose fat Gradually</option>
                <option value="build-muscle">Build muscle</option>
                <option value="maintain">Maintain weight</option>
                <option value="endurance">Improve endurance</option>
                <option value="flexibility">Increase flexibility</option>
                <option value="general">General fitness</option>
              </select>
            </div>

            <div className="lp-field">
              <label htmlFor="workoutFrequency">Workouts per week</label>
              <input id="workoutFrequency" name="workoutFrequency" type="number" min={0} max={7} value={data.workoutFrequency} onChange={handleChange} placeholder="4" />
            </div>

            {/*
            <div className="lp-field">
              <label htmlFor="experienceLevel">Experience</label>
              <select id="experienceLevel" name="experienceLevel" value={data.experienceLevel} onChange={handleChange}>
                <option value="" disabled>Select</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            */}
          </div> 
          

          {/* nav */}
          <div className="lp-form-nav">
            <button className="lp-btn lp-btn--ghost" onClick={prevSection}>
              ← Back
            </button>
            <button className="lp-btn lp-btn--fill" onClick={nextSection}>
              {formSection < 2 ? "Continue" : "Finish"}
            </button>
          </div>
        </div>
      </div>

      {/* =============== DONE =============== */}
      <div className={`lp-screen lp-done ${step === 3 ? "active" : ""}`}>
        <div className="lp-done-inner">
          <div className="lp-check-anim">
            <svg viewBox="0 0 52 52">
              <circle className="lp-chk-circ" cx="26" cy="26" r="25" fill="none" />
              <path className="lp-chk-mark" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h2 className="lp-done-heading">
            You're all set{data.name ? `, ${data.name}` : ""}.
          </h2>
          <p className="lp-done-sub">Your personalised dashboard is ready.</p>
          <button className="lp-cta" onClick={() => onComplete?.({ ...data, units })}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
