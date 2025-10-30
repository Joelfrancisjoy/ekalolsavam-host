import React, { useEffect, useState } from 'react';
import Toast from './Toast';

// Placeholder system settings with local storage persistence.
const STORAGE_KEY = 'system_settings';

const defaultSettings = {
  maintenance_mode: false,
  site_title: 'E-Kalolsavam Portal',
  default_language: 'en',
  registration_enabled: true,
  max_file_size: '5MB',
  session_timeout: '30',
  email_notifications: true,
  sms_notifications: false,
  auto_approve_students: false,
  result_publication_delay: '0',
  backup_frequency: 'daily',
};

const SystemSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(raw) });
      } catch (_) {}
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    showToast('System settings saved successfully!', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    showToast('Settings reset to defaults', 'info');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">System Settings</h2>
            <p className="text-lg text-gray-600 mt-1">Configure portal preferences and system behavior</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                General Settings
              </h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Portal Title */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">Portal Title</label>
                <input
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  value={settings.site_title}
                  onChange={e => setSettings(s => ({ ...s, site_title: e.target.value }))}
                  placeholder="Enter portal title"
                />
              </div>

              {/* Default Language */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">Default Language</label>
                <select
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  value={settings.default_language}
                  onChange={e => setSettings(s => ({ ...s, default_language: e.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ml">Malayalam</option>
                </select>
              </div>

              {/* Max File Size */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">Maximum File Upload Size</label>
                <select
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  value={settings.max_file_size}
                  onChange={e => setSettings(s => ({ ...s, max_file_size: e.target.value }))}
                >
                  <option value="2MB">2 MB</option>
                  <option value="5MB">5 MB</option>
                  <option value="10MB">10 MB</option>
                  <option value="20MB">20 MB</option>
                </select>
              </div>

              {/* Session Timeout */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">Session Timeout (minutes)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  value={settings.session_timeout}
                  onChange={e => setSettings(s => ({ ...s, session_timeout: e.target.value }))}
                  min="5"
                  max="120"
                />
              </div>
            </div>
          </div>

          {/* Registration & Participation */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Registration & Participation
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-1">Enable Student Registration</label>
                  <p className="text-sm text-gray-600">Allow new students to register</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.registration_enabled}
                    onChange={e => setSettings(s => ({ ...s, registration_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-1">Auto-Approve Students</label>
                  <p className="text-sm text-gray-600">Automatically approve student registrations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto_approve_students}
                    onChange={e => setSettings(s => ({ ...s, auto_approve_students: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">Result Publication Delay (hours)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  value={settings.result_publication_delay}
                  onChange={e => setSettings(s => ({ ...s, result_publication_delay: e.target.value }))}
                  min="0"
                  max="168"
                />
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Maintenance & System Status
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border-2 border-red-200">
                <div>
                  <label className="block text-lg font-semibold text-red-800 mb-1">Maintenance Mode</label>
                  <p className="text-sm text-red-600">Disable portal access for maintenance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={e => setSettings(s => ({ ...s, maintenance_mode: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notifications Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notifications
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-lg font-medium text-gray-700">Email Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={e => setSettings(s => ({ ...s, email_notifications: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-lg font-medium text-gray-700">SMS Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sms_notifications}
                    onChange={e => setSettings(s => ({ ...s, sms_notifications: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Backup
              </h3>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">Backup Frequency</label>
                <select
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                  value={settings.backup_frequency}
                  onChange={e => setSettings(s => ({ ...s, backup_frequency: e.target.value }))}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
            <div className="space-y-4">
              <button
                onClick={save}
                className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                💾 Save All Settings
              </button>

              <button
                onClick={resetToDefaults}
                className="w-full px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
              >
                🔄 Reset to Defaults
              </button>

              {saved && (
                <div className="flex items-center justify-center text-green-600 font-semibold text-lg">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Settings Saved!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-6">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-base font-semibold text-blue-900">Settings Storage</p>
            <p className="text-sm text-blue-700 mt-1">Settings are currently stored locally. Connect to backend API when available.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
