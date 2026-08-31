import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './components/WelcomeScreen';
import Login from './components/login';
import Dashboard from './components/dashboard';
import ResetPassword from './components/ResetPassword'; 

import './global-theme.css';

function App() {
  const isTabInitialized = sessionStorage.getItem('appInitialized') === 'true';
  
  const isResetLink = window.location.pathname.startsWith('/reset-password');

  const [showWelcome, setShowWelcome] = useState(!isTabInitialized && !isResetLink);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (isTabInitialized) {
      return !!localStorage.getItem('token');
    }
    return false; 
  });
  
  const [userData, setUserData] = useState(() => {
     if (isTabInitialized) {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
     }
     return null;
  });

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    sessionStorage.setItem('appInitialized', 'true'); 
  };

  const handleLoginSuccess = (user) => {
    sessionStorage.setItem('appInitialized', 'true'); 
    setUserData(user);          
    setIsAuthenticated(true);    
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    localStorage.removeItem('activeModule');
    localStorage.removeItem('activeTab');
    localStorage.removeItem('currentModule');
    
    setUserData(null);
    setIsAuthenticated(false);

    window.history.replaceState({}, document.title, "/login");
  };

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" /> : <Login onLoginSuccess={handleLoginSuccess} />
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? <Dashboard user={userData} onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;