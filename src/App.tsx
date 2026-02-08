import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import FitnessApp from "./FitnessApp";
import Login from "./components/Login";
import RecoveryDashboard from "./components/RecoveryDashboard";
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
  const [showRecovery, setShowRecovery] = useState(false);
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);
  const [userData, setUserData] = useState<(UserData & { units: UnitSystem }) | null>(null);

  // Load data from LocalStorage when user logs in
  useEffect(() => {
    if (user) {
      const savedData = localStorage.getItem(`fittrack_user_${user.uid}`);
      if (savedData) {
        setUserData(JSON.parse(savedData));
        setShowDashboard(true);
        setIsAttemptingLogin(false);
      } else if (isAttemptingLogin) {
        // If they just logged in from the "Get Started" flow, 
        // they don't have saved data, so we don't need to do anything
        // The render logic below will naturally show LandingPage step 1
      }
    } else {
      // Reset state on logout
      setUserData(null);
      setShowDashboard(false);
      setShowRecovery(false);
      setIsAttemptingLogin(false);
    }
  }, [user]);

  const handleComplete = (data: UserData & { units: UnitSystem }) => {
    setUserData(data);
    setShowDashboard(true);
    setShowRecovery(false);
    setIsAttemptingLogin(false);
    
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

  // 1. If we are in the recovery dashboard and have data, show it
  if (user && showDashboard && showRecovery && userData) {
    return (
      <RecoveryDashboard
        onBack={() => setShowRecovery(false)}
        userProfile={{
          name: userData.name,
          goal: userData.fitnessGoal,
          activityLevel: userData.activityLevel,
          targetWeight: userData.targetweight
        }}
      />
    );
  }

  // 2. If we are in the main dashboard and have data, show it
  if (user && showDashboard && userData) {
    return (
      <FitnessApp
        userData={userData}
        onBack={() => setShowDashboard(false)}
        onOpenRecovery={() => setShowRecovery(true)}
      />
    );
  }

  // 3. If user clicked "Get Started" but isn't logged in, show login
  if (!user && isAttemptingLogin) {
    return <Login />;
  }

  // 4. Default: Show Landing Page
  return (
    <LandingPage 
      onComplete={handleComplete} 
      onStart={handleStart}
      onDashboard={() => setShowDashboard(true)}
      hasUserData={!!userData}
      initialStep={user && isAttemptingLogin ? 1 : 0} 
    />
  );
}

export default App;
