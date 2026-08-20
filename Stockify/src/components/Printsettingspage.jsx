import React, { useState, useEffect } from 'react';
import { usePrintSettings } from '../context/PrintSettingsContext';

const paperOptions = [
  { value: 'A4', label: ' A4 (Standard)' },
  { value: 'A5', label: ' A5 (Half Page)' },
  { value: 'Thermal58', label: 'Thermal(58mm)' },
];

const Printsettingspage = () => {
  const { settings, updatePrintSettings, loading } = usePrintSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ================= HANDLE SAVE (WITH TOKEN) =================
  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrintSettings(form);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
          Loading print settings...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>
            Print Paper Size
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Select the paper size for your invoices and reports.
          </p>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          
          {/* === PAPER FORMAT === */}
          <div style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{
              fontSize: '14px', fontWeight: 700, color: 'var(--text-main)',
              margin: '0 0 var(--space-md) 0', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              Paper Size
            </h3>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              {paperOptions.map((opt) => {
                const isActive = form.paperSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      flex: 1, minWidth: '140px', padding: '12px var(--space-md)',
                      justifyContent: 'center', fontWeight: 600,
                      ...(isActive ? { backgroundColor: 'var(--primary)', color: '#ffffff' } : {})
                    }}
                    onClick={() => handleChange('paperSize', opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* === ACTIONS / FOOTER === */}
          <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              {message && (
                <div style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, display: 'inline-block',
                  backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}>
                  {message.text}
                </div>
              )}
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={handleSave} 
              disabled={saving} 
              style={{ padding: '10px 24px' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Printsettingspage;