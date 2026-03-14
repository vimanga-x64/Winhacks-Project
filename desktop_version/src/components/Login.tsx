import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Flame } from 'lucide-react';

const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="fa-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="fa-bg">
        <div className="fa-bg-grain" />
        <div className="fa-bg-gradient" />
        <div className="fa-bg-circle fa-bg-circle--1" />
        <div className="fa-bg-circle fa-bg-circle--2" />
      </div>

      <div className="fa-card" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="fa-logo" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Flame className="fa-logo-icon" size={40} />
          <span className="fa-logo-text" style={{ fontSize: '2rem' }}>FIT<span className="fa-logo-accent">TRACK</span></span>
        </div>
        
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Welcome Back</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
          Track your fitness journey with AI-powered insights.
        </p>

        <button 
          onClick={signInWithGoogle}
          className="fa-summarize-btn"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;
