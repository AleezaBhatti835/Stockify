import { useState } from 'react';
import Login from './components/login';
import Dashboard from './components/dashboard';
import { PrintSettingsProvider } from './context/PrintSettingsContext';

function App() {
  // 1. Initialize state from localStorage so it survives refresh
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 2. Save user to localStorage on login
  const handleLogin = (user) => {
    setLoggedInUser(user);
    localStorage.setItem('loggedInUser', JSON.stringify(user));
  };

  // 3. Clear user from localStorage on logout
  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('loggedInUser');
  };

  return (
    <PrintSettingsProvider>
      {loggedInUser ? (
        <Dashboard user={loggedInUser} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLogin} />
      )}
    </PrintSettingsProvider>
  );
}

export default App;