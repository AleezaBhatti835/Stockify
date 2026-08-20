import { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import Login from './components/login';
import Dashboard from './components/dashboard';
import './global-theme.css';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);

const handleLoginSuccess = (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setUserData(user);          
    setIsAuthenticated(true);    
  };
  const handleLogout = () => {
    setUserData(null);
    setIsAuthenticated(false);
  };

  if (showWelcome) {
    return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
  }

  if (isAuthenticated) {
    return <Dashboard user={userData} onLogout={handleLogout} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}

export default App;