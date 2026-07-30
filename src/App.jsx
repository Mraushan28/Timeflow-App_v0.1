import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
import Analytics from './components/Analytics';
import Footer from './components/Footer';
import InstallPrompt from './components/InstallPrompt';
import { FiLayers, FiPieChart, FiClock } from 'react-icons/fi';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiClock },
    { id: 'tasks', label: 'Tasks', icon: FiLayers },
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
                transition-all duration-300
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'tasks' && <TaskManager />}
        {activeTab === 'analytics' && <Analytics />}
      </main>

      {/* Footer */}
      <Footer />

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

