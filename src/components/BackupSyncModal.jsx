import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isSupabaseConfigured } from '../utils/supabase';
import {
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  resetUserPassword,
  SYNC_STATUS,
} from '../utils/syncService';
import { exportTimeFlowBackup, parseAndValidateBackup } from '../utils/backupIO';
import {
  FiCloud, FiDownload, FiUpload, FiX, FiCheckCircle, FiAlertCircle,
  FiRefreshCw, FiLogOut, FiUser, FiLock, FiMail, FiFileText,
  FiHardDrive, FiCheck, FiInfo, FiLayers, FiCalendar
} from 'react-icons/fi';

export default function BackupSyncModal({ isOpen, onClose }) {
  const {
    state,
    authUser,
    syncStatus,
    lastSyncedAt,
    manualSync,
    loadStateSnapshot,
    mergeStateSnapshot,
  } = useApp();

  const [activeTab, setActiveTab] = useState('cloud'); // 'cloud' | 'export_import'
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Import State
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form messages when opening/switching
  useEffect(() => {
    setAuthError('');
    setAuthSuccess('');
  }, [authMode, activeTab, isOpen]);

  if (!isOpen) return null;

  // ----------------------------------------------------------------------
  // Auth Handlers
  // ----------------------------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!isSupabaseConfigured) {
      setAuthError('Cloud sync is not configured on this deployment. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (authMode === 'forgot') {
      setAuthLoading(true);
      const { error } = await resetUserPassword(email);
      setAuthLoading(false);
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthSuccess('Password reset link sent! Check your inbox.');
      }
      return;
    }

    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        const { data, error } = await signInWithEmail(email, password);
        if (error) {
          setAuthError(error.message);
        } else if (data?.user) {
          setAuthSuccess('Signed in successfully! Cloud backup is active.');
          setPassword('');
        }
      } else {
        const { data, error } = await signUpWithEmail(email, password);
        if (error) {
          setAuthError(error.message);
        } else if (data?.user) {
          setAuthSuccess('Account created! If email confirmation is required, please check your inbox.');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await signOutUser();
    setAuthLoading(false);
    setAuthSuccess('Signed out. TimeFlow continues to work offline with local data.');
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await manualSync();
    setIsManualSyncing(false);
  };

  // ----------------------------------------------------------------------
  // Export & Import Handlers
  // ----------------------------------------------------------------------
  const handleExport = () => {
    const res = exportTimeFlowBackup(state);
    if (res.success) {
      setImportSuccess(`Backup exported: ${res.filename}`);
      setTimeout(() => setImportSuccess(''), 4000);
    } else {
      setImportError(res.error || 'Export failed.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setImportError('');
    setImportSuccess('');
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportError('Please select a valid .json backup file.');
      return;
    }

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      const validation = parseAndValidateBackup(content);
      if (!validation.isValid) {
        setImportError(validation.error || 'Invalid backup file structure.');
        setImportPreview(null);
      } else {
        setImportPreview(validation.data);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!importPreview) return;
    setIsImporting(true);

    try {
      if (importMode === 'replace') {
        loadStateSnapshot(importPreview);
        setImportSuccess('Data successfully restored from backup file!');
      } else {
        mergeStateSnapshot(importPreview);
        setImportSuccess('Backup data successfully merged with your current tasks!');
      }
      setImportFile(null);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportError('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Format sync timestamp
  const formatSyncTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-fade-in overflow-hidden border border-slate-200 dark:border-slate-800"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-primary-600 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FiCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                Data & Cloud Sync
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Optional cloud backup, cross-device sync & JSON export/import
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('cloud')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'cloud'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
              <FiCloud className="w-3.5 h-3.5" />
              Cloud Sync {authUser ? '(Active)' : '(Optional)'}
            </button>
            <button
              onClick={() => setActiveTab('export_import')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'export_import'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
              <FiHardDrive className="w-3.5 h-3.5" />
              Export / Import JSON
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: CLOUD SYNC & AUTH */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              {/* Informative banner on local-first policy */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-2.5">
                <FiInfo className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  <strong>No login required:</strong> TimeFlow works completely offline with local storage. Signing in is strictly optional to enable multi-device sync and cloud backup recovery.
                </p>
              </div>

              {!isSupabaseConfigured && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-semibold mb-1">Cloud Sync Not Configured</p>
                    <p className="opacity-90">
                      To enable Supabase cloud sync, set <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> in your environment. Your data continues to be safely saved locally on this device.
                    </p>
                  </div>
                </div>
              )}

              {/* State A: User is Authenticated */}
              {authUser ? (
                <div className="space-y-4">
                  {/* Account Card */}
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center">
                          <FiUser className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Signed In As</p>
                          <p className="text-sm font-bold truncate max-w-[200px] sm:max-w-xs" style={{ color: 'var(--color-text)' }}>
                            {authUser.email}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleSignOut}
                        disabled={authLoading}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <FiLogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>

                    {/* Sync Status Banner */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {syncStatus === SYNC_STATUS.SYNCED && (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                              Synced with Cloud
                            </span>
                          </>
                        )}
                        {syncStatus === SYNC_STATUS.SYNCING && (
                          <>
                            <FiRefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                            <span className="text-xs font-semibold text-blue-500">
                              Syncing changes...
                            </span>
                          </>
                        )}
                        {syncStatus === SYNC_STATUS.OFFLINE && (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span className="text-xs font-semibold text-amber-500">
                              Offline (Saved locally)
                            </span>
                          </>
                        )}
                        {syncStatus === SYNC_STATUS.ERROR && (
                          <>
                            <FiAlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-semibold text-red-500">
                              Sync failed (Will retry)
                            </span>
                          </>
                        )}
                        {syncStatus === SYNC_STATUS.LOCAL_ONLY && (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                            <span className="text-xs font-semibold text-slate-400">
                              Local only
                            </span>
                          </>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400">
                        Last sync: {formatSyncTime(lastSyncedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Manual Sync Trigger */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        Force Cloud Backup
                      </h4>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Push all local tasks, timers, and challenge streaks immediately
                      </p>
                    </div>
                    <button
                      onClick={handleManualSync}
                      disabled={isManualSyncing || syncStatus === SYNC_STATUS.SYNCING}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 flex-shrink-0"
                    >
                      <FiRefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                      {isManualSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>
                </div>
              ) : (
                /* State B: User is NOT Authenticated -> Show Sign In / Sign Up Form */
                <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  {/* Mode Selector */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAuthMode('signin')}
                        className={`text-sm font-bold pb-1 transition-colors ${authMode === 'signin'
                            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className={`text-sm font-bold pb-1 transition-colors ${authMode === 'signup'
                            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        Create Account
                      </button>
                    </div>

                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('forgot')}
                        className="text-xs text-primary-500 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {/* Feedback Alerts */}
                  {authError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                      <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-xs text-green-600 dark:text-green-400 flex items-start gap-2">
                      <FiCheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                        Email Address
                      </label>
                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                          style={{ color: 'var(--color-text)' }}
                        />
                      </div>
                    </div>

                    {authMode !== 'forgot' && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                          Password
                        </label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                            style={{ color: 'var(--color-text)' }}
                          />
                        </div>
                      </div>
                    )}

                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                          Confirm Password
                        </label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                            style={{ color: 'var(--color-text)' }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        {authLoading ? (
                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                        ) : authMode === 'signin' ? (
                          'Sign In & Sync'
                        ) : authMode === 'signup' ? (
                          'Create Account & Backup'
                        ) : (
                          'Send Reset Link'
                        )}
                      </button>
                    </div>

                    {authMode === 'forgot' && (
                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setAuthMode('signin')}
                          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                        >
                          Back to Sign In
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT & IMPORT JSON */}
          {activeTab === 'export_import' && (
            <div className="space-y-5">
              {/* Export Section */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      Export JSON Backup
                    </h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Save an offline copy of your tasks, time logs, 30-day challenge progress, and settings to your device.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center flex-shrink-0">
                    <FiDownload className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleExport}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <FiDownload className="w-3.5 h-3.5" />
                    Download timeflow-backup.json
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {(state.tasks || []).length} tasks · {Object.keys(state.history || {}).length} log days
                  </span>
                </div>
              </div>

              {/* Import Section */}
              <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      Restore from Backup File
                    </h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Upload a previously exported TimeFlow JSON backup to restore your data.
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <FiUpload className="w-4 h-4" />
                  </div>
                </div>

                {importError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-xs text-green-600 dark:text-green-400 flex items-start gap-2">
                    <FiCheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{importSuccess}</span>
                  </div>
                )}

                {/* File picker */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-xs file:font-semibold
                      file:bg-primary-50 file:text-primary-700
                      dark:file:bg-primary-950/40 dark:file:text-primary-400
                      hover:file:bg-primary-100 cursor-pointer"
                  />
                </div>

                {/* Backup Validation Preview */}
                {importPreview && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                        <FiCheck className="w-3.5 h-3.5" />
                        Valid Backup Found
                      </span>
                      <span className="text-slate-400">
                        {importFile?.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-700/60 border border-slate-100 dark:border-slate-600">
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                          {(importPreview.tasks || []).length}
                        </p>
                        <p className="text-[10px] text-slate-400">Tasks</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-700/60 border border-slate-100 dark:border-slate-600">
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                          {Object.keys(importPreview.history || {}).length}
                        </p>
                        <p className="text-[10px] text-slate-400">Log Days</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-700/60 border border-slate-100 dark:border-slate-600">
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                          {(importPreview.challenges || []).length}
                        </p>
                        <p className="text-[10px] text-slate-400">Challenges</p>
                      </div>
                    </div>

                    {/* Import Strategy Mode */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Import Strategy
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setImportMode('merge')}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${importMode === 'merge'
                              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          <p className="font-bold">Merge (Recommended)</p>
                          <p className="text-[10px] opacity-75 mt-0.5">Combines backup with current data</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportMode('replace')}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${importMode === 'replace'
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          <p className="font-bold">Replace Everything</p>
                          <p className="text-[10px] opacity-75 mt-0.5">Overwrites all current local data</p>
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5"
                    >
                      <FiUpload className="w-3.5 h-3.5" />
                      {isImporting ? 'Restoring...' : `Proceed with ${importMode === 'merge' ? 'Merge' : 'Replace'}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

