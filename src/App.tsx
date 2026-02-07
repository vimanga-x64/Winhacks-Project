import { useState } from "react";
import LandingPage from "./components/LandingPage";
import FitnessApp from "./FitnessApp";

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  if (showDashboard) {
    return <FitnessApp />;
  }

  return <LandingPage onComplete={() => setShowDashboard(true)} />;
}

export default App;