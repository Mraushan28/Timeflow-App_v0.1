import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
import Analytics from './components/Analytics';
import ScheduledReminders from './components/ScheduledReminders';
import Challenge30 from './components/Challenge30';
import ReminderAlarmManager from './components/ReminderAlarmManager';
import Footer from './components/Footer';
import InstallPrompt from './components/InstallPrompt';
import { FiLayers, FiPieChart, FiClock, FiBell, FiZap } from 'react-icons/fi';

function AppContent() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  const pendingRemindersCount = (state.scheduledReminders || []).filter(
    r => r.status === 'PENDING' && r.isEnabled !== false
  ).length;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiClock },
    { id: 'tasks', label: 'Tasks', icon: FiLayers },
    { id: 'scheduled', label: 'Scheduled', icon: FiBell, count: pendingRemindersCount },
    { id: 'challenge', label: '30-Day Challenge', icon: FiZap },
    { id: 'analytics', label: 'Analytics', icon: FiPieChart },
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: 'var(--color-bg)' }}>
      <Navbar />

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
        <div className="flex space-x-1 glass rounded-2xl p-1.5 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm
                transition-all duration-300 relative
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }
              `}
            >
              <div className="relative flex items-center justify-center">
                <tab.icon className="w-4 h-4" />
                {tab.count > 0 && activeTab !== tab.id && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-500" />
                )}
              </div>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'tasks' && <TaskManager />}
        {activeTab === 'scheduled' && <ScheduledReminders />}
        {activeTab === 'challenge' && <Challenge30 />}
        {activeTab === 'analytics' && <Analytics />}
      </main>

      {/* Footer */}
      <Footer />

      {/* Global scheduled-reminder alarm manager (fires on any tab) */}
      <ReminderAlarmManager />

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

