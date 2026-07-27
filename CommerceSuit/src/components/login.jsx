import { useState } from 'react';
import './login.css';

function Login({ onLoginSuccess }) {
  const [email, setemail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // You can save token to localStorage here if rememberMe is true in the future
        onLoginSuccess(data.user);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-box">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Please enter your details to sign in.</p>

        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-success">{message}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setemail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="login-form-group">
            <label className="login-label">Password</label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* New Remember Me & Forgot Password Section */}
          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
            <a href="#forgot" className="forgot-password" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button type="submit" className="login-button">Sign In</button>
          
          {/* New Sign Up Section */}
          <div className="signup-prompt">
            Don't have an account?{' '}
            <a href="#signup" className="signup-link" onClick={(e) => e.preventDefault()}>
              Sign up
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;