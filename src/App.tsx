import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import FitnessApp from "./FitnessApp";
import Login from "./components/Login";
import { useAuth } from "./context/AuthContext";

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

function App() {
  const { user } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);
  const [userData, setUserData] = useState<(UserData & { units: UnitSystem }) | null>(null);

  // Load data from LocalStorage when user logs in
  useEffect(() => {
    if (user) {
      const savedData = localStorage.getItem(`fittrack_user_${user.uid}`);
      if (savedData) {
        setUserData(JSON.parse(savedData));
        setShowDashboard(true);
      }
    } else {
      // Reset state on logout
      setUserData(null);
      setShowDashboard(false);
      setIsAttemptingLogin(false);
    }
  }, [user]);

  const handleComplete = (data: UserData & { units: UnitSystem }) => {
    setUserData(data);
    setShowDashboard(true);
    
    // Save to LocalStorage
    if (user) {
      localStorage.setItem(`fittrack_user_${user.uid}`, JSON.stringify(data));
    }
  };

  const handleStart = () => {
    if (!user) {
      setIsAttemptingLogin(true);
    }
  };

  // 1. If we are in the dashboard and have data, show it
  if (user && showDashboard && userData) {
    return <FitnessApp userData={userData} onBack={() => setShowDashboard(false)} />;
  }

  // 2. If user clicked "Get Started" but isn't logged in, show login
  if (!user && isAttemptingLogin) {
    return <Login />;
  }

  // 3. Default: Show Landing Page
  return <LandingPage onComplete={handleComplete} onStart={handleStart} />;
}

export default App;
