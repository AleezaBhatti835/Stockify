import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faRightToBracket, faBoxesStacked, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // --- FORGOT PASSWORD NAYI STATES ---
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }) 
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);

        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email.trim());
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        localStorage.removeItem('activeModule');
        localStorage.removeItem('activeTab');
        localStorage.removeItem('currentModule');

        if (data.user && data.user.employeeId && data.user.email !== 'admin@gmail.com') {
           localStorage.setItem('activeTab', 'employee-dashboard');
        } else {
           localStorage.setItem('activeTab', 'overview');
        }

        window.history.replaceState({}, document.title, "/");

        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMessage({ text: '', type: '' });

    if (!forgotEmail.trim()) {
      return setForgotMessage({ text: 'Please enter your email address.', type: 'error' });
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setForgotMessage({ text: 'Reset link sent to your email!', type: 'success' });
        setForgotEmail('');
      } else {
        setForgotMessage({ text: data.message || 'Error sending email.', type: 'error' });
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      backgroundColor: 'var(--bg-app)', padding: '20px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden'
    }}>
      <style>{`
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleInCenter { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes floatSlow { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-12px) rotate(2deg); } }
        @keyframes floatFast { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-16px) rotate(-2deg); } }
        @keyframes floatGlow { 0% { transform: translateY(0px); box-shadow: 0 0 20px rgba(255,255,255,0.05); } 50% { transform: translateY(-8px); box-shadow: 0 0 35px rgba(255,255,255,0.25); } 100% { transform: translateY(0px); box-shadow: 0 0 20px rgba(255,255,255,0.05); } }

        .brand-stagger-1 { animation: slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        .brand-stagger-2 { animation: slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
        .brand-stagger-3 { animation: scaleInCenter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
        .brand-stagger-4 { animation: slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both; }
        .animate-stagger-1 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .animate-stagger-2 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
        .animate-stagger-3 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both; }
        .animate-stagger-4 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both; }

        .interactive-group { transition: transform 0.3s ease; }
        .interactive-group:focus-within { transform: translateX(3px); }
        .password-toggle-btn:hover { color: var(--primary) !important; }

        input.clean-input, input.clean-input:hover, input.clean-input:focus, input.clean-input:active {
          background-color: #ffffff !important; color: #1e293b !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; transition: border-color 0.2s, box-shadow 0.2s;
        }
        input.clean-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important; outline: none !important; }
        input.clean-input:-webkit-autofill, input.clean-input:-webkit-autofill:hover, input.clean-input:-webkit-autofill:focus, input.clean-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #ffffff inset !important; -webkit-text-fill-color: #1e293b !important; transition: background-color 5000s ease-in-out 0s !important;
        }
        input.clean-input::placeholder { color: #94a3b8 !important; opacity: 1 !important; }
      `}</style>

      {/* --- WIDGETS OUTSIDE THE CARD --- */}
      <div style={{ position: 'absolute', left: '3%', top: '18%', animation: 'floatSlow 6s infinite ease-in-out', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 0.5, pointerEvents: 'none' }}>
        <div style={{ width: '45px', height: '14px', background: 'var(--primary)', borderRadius: '3px', transform: 'skewX(-15deg)' }}></div>
        <div style={{ width: '60px', height: '14px', background: 'var(--primary)', borderRadius: '3px', transform: 'skewX(-15deg)', opacity: 0.8 }}></div>
        <div style={{ width: '50px', height: '14px', background: 'var(--primary)', borderRadius: '3px', transform: 'skewX(-15deg)', opacity: 0.6 }}></div>
      </div>

      <div style={{ position: 'absolute', left: '4%', bottom: '18%', animation: 'floatFast 6.5s infinite ease-in-out', display: 'flex', alignItems: 'flex-end', gap: '6px', opacity: 0.5, height: '40px', pointerEvents: 'none' }}>
        <div style={{ width: '8px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }}></div>
        <div style={{ width: '8px', height: '32px', background: 'var(--primary)', borderRadius: '2px' }}></div>
        <div style={{ width: '8px', height: '22px', background: 'var(--primary)', borderRadius: '2px' }}></div>
        <div style={{ width: '8px', height: '40px', background: 'var(--primary)', borderRadius: '2px' }}></div>
      </div>

      <div style={{ position: 'absolute', right: '3%', top: '20%', animation: 'floatFast 5.5s infinite ease-in-out', width: '55px', height: '45px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', opacity: 0.6, pointerEvents: 'none' }}>
        <div style={{ background: 'var(--primary)', borderRadius: '2px' }}></div>
        <div style={{ background: '#cbd5e1', borderRadius: '2px' }}></div>
        <div style={{ background: '#cbd5e1', borderRadius: '2px' }}></div>
        <div style={{ background: 'var(--primary)', borderRadius: '2px' }}></div>
      </div>

      <div style={{ position: 'absolute', right: '4%', bottom: '20%', animation: 'floatSlow 7s infinite ease-in-out', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5, pointerEvents: 'none' }}>
        <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%' }}></div>
        <div style={{ width: '40px', height: '2px', background: 'var(--primary)' }}></div>
        <div style={{ width: '16px', height: '16px', background: 'var(--primary)', borderRadius: '4px' }}></div>
      </div>

      {/* --- MAIN CARD --- */}
      <div className="card" style={{
        display: 'flex', flexWrap: 'wrap', width: '100%', maxWidth: '960px', minHeight: '520px', 
        padding: 0, overflow: 'hidden', animation: 'slideUpFade 0.6s ease-out', border: '2px solid #cbd5e1',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', position: 'relative', zIndex: 1
      }}>
        
        <div style={{
          flex: '1 1 420px', backgroundColor: 'var(--primary)', color: '#ffffff', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '50px 30px', textAlign: 'center', position: 'relative'
        }}>
          <h1 className="brand-stagger-1" style={{ margin: '0 0 14px 0', fontSize: '28px', fontWeight: '800', letterSpacing: '0.5px' }}>
            Welcome to Stockify
          </h1>
          <p className="brand-stagger-2" style={{ margin: '0 0 35px 0', fontSize: '14px', lineHeight: '1.6', opacity: 0.9, maxWidth: '300px' }}>
            Discover interactive tools and modules designed to make your daily tasks easier, faster, and more efficient.
          </p>
          <div className="brand-stagger-3" style={{
            width: '90px', height: '90px', borderRadius: '50%', border: '1px solid rgba(255, 255, 255, 0.3)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '35px', backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)', animation: 'floatGlow 4s ease-in-out infinite'
          }}>
            <FontAwesomeIcon icon={faBoxesStacked} style={{ color: '#ffffff' }} />
          </div>
          <p className="brand-stagger-4" style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>
            Start your journey with <strong style={{ color: '#ffffff', fontWeight: '600' }}>Stockify</strong> today!
          </p>
        </div>

        <div style={{ flex: '1 1 420px', padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'var(--bg-surface)' }}>
          <div className="animate-stagger-1" style={{ marginBottom: '24px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', color: 'var(--text-main)', fontWeight: '700' }}>
              {isForgotMode ? 'Reset Password' : 'Welcome Back'}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              {isForgotMode ? 'Enter your email to receive a reset link' : 'Sign in to continue to your dashboard'}
            </p>
          </div>

          {isForgotMode ? (
            <form onSubmit={handleForgotPassword}>
              {forgotMessage.text && (
                <div className="animate-stagger-2" style={{
                  padding: '10px 14px', marginBottom: '18px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: forgotMessage.type === 'error' ? 'var(--danger-bg)' : '#f0fdf4',
                  color: forgotMessage.type === 'error' ? 'var(--danger)' : '#15803d',
                  border: `1px solid ${forgotMessage.type === 'error' ? 'var(--danger)' : '#15803d'}`,
                  fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <span>{forgotMessage.type === 'error' ? '⚠️' : '✅'}</span>
                  <span>{forgotMessage.text}</span>
                </div>
              )}
              <div className="form-group interactive-group animate-stagger-2" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ color: 'var(--text-muted)' }} /> Email Address
                </label>
                <input type="email" className="form-input clean-input" placeholder="admin@stockify.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary animate-stagger-3" style={{ width: '100%', padding: '12px', fontSize: '14px', marginBottom: '16px' }} disabled={forgotLoading}>
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div className="animate-stagger-4" style={{ textAlign: 'center' }}>
                <button type="button" onClick={() => { setIsForgotMode(false); setForgotMessage({text:'', type:''}); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  &larr; Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              {error && (
                <div className="animate-stagger-2" style={{
                  padding: '10px 14px', marginBottom: '18px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)',
                  fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              <div className="form-group interactive-group animate-stagger-2" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ color: 'var(--text-muted)' }} /> Email Address
                </label>
                <input type="email" className="form-input clean-input" placeholder="admin@stockify.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>

              <div className="form-group interactive-group animate-stagger-3" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faLock} style={{ color: 'var(--text-muted)' }} /> Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} className="form-input clean-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: '40px' }} />
                  <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                    title={showPassword ? "Hide password" : "Show password"}>
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="animate-stagger-3" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '4px', border: `1px solid ${rememberMe ? 'var(--primary)' : 'var(--border-color)'}`,
                    backgroundColor: rememberMe ? 'var(--primary)' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease'
                  }}>
                    {rememberMe && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ display: 'none' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>Remember me</span>
                </label>

                <button type="button" onClick={() => setIsForgotMode(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: 0 }}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="btn btn-primary animate-stagger-4"
                style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', transform: loading ? 'scale(0.98)' : 'scale(1)' }}
                disabled={loading}>
                {loading ? 'Authenticating...' : <> <FontAwesomeIcon icon={faRightToBracket} /> Sign In </>}
              </button>
            </form>
          )}

          <div className="animate-stagger-4" style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} Stockify. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;