import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Yahan name EXACTLY PrintSettingsContext hona zaroori hai
const PrintSettingsContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEFAULT_SETTINGS = {
  paperSize: 'A4',
  printerName: '',
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10,
  showLogo: true,
  showCompanyName: true,
  footerText: 'Thank you for your business!',
  defaultCopies: 1,
  thermalFontSize: 10,
};

export const PrintSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchPrintSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/print-settings`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (err) {
      console.error('Failed to load print settings, using defaults:', err);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePrintSettings = async (updates) => {
    const res = await fetch(`${API_BASE}/print-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update print settings');
    }
    const data = await res.json();
    setSettings({ ...DEFAULT_SETTINGS, ...data });
    return data;
  };

  useEffect(() => {
    fetchPrintSettings();
  }, [fetchPrintSettings]);

  return (
    <PrintSettingsContext.Provider
      value={{
        settings,
        paperSize: settings.paperSize,
        loading,
        updatePrintSettings,
        refreshPrintSettings: fetchPrintSettings,
      }}
    >
      {children}
    </PrintSettingsContext.Provider>
  );
};

export const usePrintSettings = () => {
  const ctx = useContext(PrintSettingsContext);
  if (!ctx) {
    throw new Error('usePrintSettings must be used within a PrintSettingsProvider');
  }
  return ctx;
};

export default PrintSettingsContext;