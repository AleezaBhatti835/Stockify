import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function ResetPassword() {
  const { token } = useParams(); // URL se token pakadne ke liye
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (password.length < 8) {
      return setMessage({ text: 'Password must be at least 8 characters long.', type: 'error' });
    }
    if (password !== confirmPassword) {
      return setMessage({ text: 'Passwords do not match.', type: 'error' });
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ text: 'Password reset successful! Redirecting to login...', type: 'success' });
        setTimeout(() => navigate('/login'), 3000); // 3 seconds baad login par bhej dega
      } else {
        setMessage({ text: data.message || 'Failed to reset password.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '40px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '24px' }}>Create New Password</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Please enter your new password below.</p>
        </div>

        {message.text && (
          <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
            color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
            border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`
          }}>
            <span>{message.type === 'error' ? '⚠️' : '✅'}</span> {message.text}
          </div>
        )}

        <form onSubmit={handleReset}>
          {/* New Password */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faLock} style={{ color: 'var(--text-muted)' }} /> New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '40px', backgroundColor: '#fff' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FontAwesomeIcon icon={faLock} style={{ color: 'var(--text-muted)' }} /> Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ backgroundColor: '#fff' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} disabled={loading}>
            {loading ? 'Saving...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;