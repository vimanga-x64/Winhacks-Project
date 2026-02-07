import { useState } from "react";
import LandingPage from "./components/LandingPage";
import FitnessApp from "./FitnessApp";

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
  const [showDashboard, setShowDashboard] = useState(false);
  const [userData, setUserData] = useState<(UserData & { units: UnitSystem }) | null>(null);

  const handleComplete = (data: UserData & { units: UnitSystem }) => {
    setUserData(data);
    setShowDashboard(true);
  };

  if (showDashboard && userData) {
    return <FitnessApp userData={userData} onBack={() => setShowDashboard(false)} />;
  }

  return <LandingPage onComplete={handleComplete} />;
}

export default App;