import React, { useState, useEffect } from 'react';
import { usePrintSettings } from '../context/PrintSettingsContext';

const paperOptions = [
  { value: 'A4', label: '📄 A4 (Standard)' },
  { value: 'A5', label: '📝 A5 (Half Page)' },
  { value: 'Thermal58', label: '🧾 Thermal (58mm)' },
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

  const handleSave = async () => {
    setSaving(true);
    console.log("Saving this data to DB:", form); 
    try {
      await updatePrintSettings(form);
      console.log("Context updated with:", settings); 
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>
        Loading print settings...
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <h2 style={styles.pageTitle}>Print Paper Size</h2>
        <p style={styles.pageSubtitle}>
          Select the paper size for your invoices and reports.
        </p>
      </div>

      <div style={styles.card}>
        {/* === PAPER FORMAT === */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Paper Size</h3>
          <div style={styles.buttonGroup}>
            {paperOptions.map((opt) => {
              const isActive = form.paperSize === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  style={isActive ? { ...styles.pillBtn, ...styles.pillBtnActive } : styles.pillBtn}
                  onClick={() => handleChange('paperSize', opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* === ACTIONS === */}
        <div style={styles.footer}>
          <div style={{ flex: 1 }}>
            {message && (
              <div style={message.type === 'success' ? styles.msgSuccess : styles.msgError}>
                {message.text}
              </div>
            )}
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            style={saving ? { ...styles.saveBtn, opacity: 0.7 } : styles.saveBtn}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px 20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textAlign: 'left',
    color: '#0f172a',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  section: {
    padding: '32px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#334155',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  pillBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: '1',
    minWidth: '140px',
    textAlign: 'center',
  },
  pillBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    color: '#1d4ed8',
    boxShadow: '0 1px 2px rgba(59, 130, 246, 0.1)',
  },
  footer: {
    padding: '16px 32px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '16px',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  msgSuccess: {
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
  },
  msgError: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
  }
};

// Inject simple focus styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    button:hover {
      opacity: 0.85;
    }
  `;
  document.head.appendChild(style);
}

export default Printsettingspage;