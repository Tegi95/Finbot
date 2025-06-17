import React, { useState } from 'react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  soundEnabled: boolean;
  compactView: boolean;
  showPercentageChanges: boolean;
  currency: 'USD' | 'EUR' | 'GBP';
  language: 'en' | 'de';
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  if (!isOpen) return null;

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: AppSettings = {
      theme: 'light',
      autoRefresh: true,
      refreshInterval: 60,
      soundEnabled: false,
      compactView: false,
      showPercentageChanges: true,
      currency: 'USD',
      language: 'de'
    };
    setLocalSettings(defaultSettings);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Einstellungen</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>Erscheinungsbild</h3>
            
            <div className="setting-item">
              <label>Theme</label>
              <select 
                value={localSettings.theme} 
                onChange={(e) => handleSettingChange('theme', e.target.value)}
              >
                <option value="light">Hell</option>
                <option value="dark">Dunkel</option>
              </select>
            </div>

            <div className="setting-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={localSettings.compactView}
                  onChange={(e) => handleSettingChange('compactView', e.target.checked)}
                />
                Kompakte Ansicht
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={localSettings.showPercentageChanges}
                  onChange={(e) => handleSettingChange('showPercentageChanges', e.target.checked)}
                />
                Prozentuale Änderungen anzeigen
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Daten & Updates</h3>
            
            <div className="setting-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={localSettings.autoRefresh}
                  onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                />
                Automatische Aktualisierung
              </label>
            </div>

            <div className="setting-item">
              <label>Aktualisierungsintervall (Sekunden)</label>
              <select 
                value={localSettings.refreshInterval} 
                onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
                disabled={!localSettings.autoRefresh}
              >
                <option value={30}>30 Sekunden</option>
                <option value={60}>1 Minute</option>
                <option value={300}>5 Minuten</option>
                <option value={900}>15 Minuten</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Währung</label>
              <select 
                value={localSettings.currency} 
                onChange={(e) => handleSettingChange('currency', e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Benachrichtigungen</h3>
            
            <div className="setting-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={localSettings.soundEnabled}
                  onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                />
                Sounds aktiviert
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Sprache</h3>
            
            <div className="setting-item">
              <label>Interface-Sprache</label>
              <select 
                value={localSettings.language} 
                onChange={(e) => handleSettingChange('language', e.target.value)}
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="reset-btn" onClick={handleReset}>
            Zurücksetzen
          </button>
          <div className="footer-actions">
            <button className="cancel-btn" onClick={onClose}>
              Abbrechen
            </button>
            <button className="save-btn" onClick={handleSave}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 