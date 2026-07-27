// settings/Settings.jsx
import React from 'react';

function Settings() {
  return (
    <div style={{ padding: '20px' }}>
      <div className="panel" style={{ padding: '30px', borderRadius: '12px', backgroundColor: '#fff' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>⚙️ Settings</h2>
        <p style={{ color: '#64748b' }}>Manage your system settings here.</p>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e2e8f0', 
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            ':hover': {
              borderColor: '#3b82f6',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏷️</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Designations</h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Manage employee designations</p>
          </div>
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e2e8f0', 
            borderRadius: '10px',
            opacity: 0.5,
            cursor: 'not-allowed'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔐</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Permissions</h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Coming soon...</p>
          </div>
          <div style={{ 
            padding: '20px', 
            border: '1px solid #e2e8f0', 
            borderRadius: '10px',
            opacity: 0.5,
            cursor: 'not-allowed'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎨</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Theme Settings</h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;