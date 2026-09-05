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
import TimeFlowLogo from './TimeFlowLogo';
import {
  FiCloud, FiDownload, FiUpload, FiX, FiCheckCircle, FiAlertCircle,
  FiRefreshCw, FiLogOut, FiUser, FiLock, FiMail, FiArrowLeft,
  FiHardDrive, FiCheck, FiShield,
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

  // Active primary tab: 'cloud' | 'export_import'
  const [activeTab, setActiveTab] = useState('cloud');

  // Cloud auth sub-views when not logged in: 'overview' | 'signin' | 'signup' | 'forgot'
  const [authSubView, setAuthSubView] = useState('overview');

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

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset transient feedback messages when switching views
  useEffect(() => {
    setAuthError('');
    setAuthSuccess('');
    setImportError('');
    setImportSuccess('');
  }, [authSubView, activeTab, isOpen]);

  if (!isOpen) return null;

  // ----------------------------------------------------------------------
  // Auth Handlers
  // ----------------------------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!isSupabaseConfigured) {
      setAuthError('Cloud Backup is currently unavailable. Your data is safely stored locally.');
      return;
    }

    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (authSubView === 'forgot') {
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

    if (authSubView === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    try {
      if (authSubView === 'signin') {
        const { data, error } = await signInWithEmail(email, password);
        if (error) {
          setAuthError(error.message);
        } else if (data?.user) {
          setAuthSuccess('Signed in! Cloud backup is active.');
          setPassword('');
          setAuthSubView('overview');
        }
      } else {
        const { data, error } = await signUpWithEmail(email, password);
        if (error) {
          setAuthError(error.message);
        } else if (data?.user) {
          setAuthSuccess('Account created! Existing local data backed up.');
          setPassword('');
          setConfirmPassword('');
          setAuthSubView('overview');
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
    setAuthSubView('overview');
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
        setImportSuccess('Backup data successfully merged with current tasks!');
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

  const historyDaysCount = Object.keys(state.history || {}).length;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card: Responsive calc(100vw - 24px) on mobile, max 520px on desktop, max-h 90dvh */}
      <div
        className="relative w-[calc(100vw-24px)] sm:w-full sm:max-w-[520px] max-h-[90dvh] flex flex-col rounded-3xl shadow-2xl animate-fade-in overflow-hidden border border-slate-200 dark:border-slate-800"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Subtle Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-primary-600 flex-shrink-0" />

        {/* Modal Header: Stable, Non-scrolling with TimeFlow Logo */}
        <div className="flex items-start justify-between px-5 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Transparent TimeFlow Logo (with fallback) */}
            <TimeFlowLogo className="w-10 h-10 sm:w-11 sm:h-11" iconSize="w-5 h-5" />

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                Data & Cloud Sync
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                Keep your TimeFlow data safe across devices.
              </p>
              <span className="text-[10px] sm:text-xs font-medium text-primary-600 dark:text-primary-400">
                Optional — TimeFlow works without an account.
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Tabs: Exactly 2 tabs (Cloud Sync & Export / Import) */}
        <div className="px-5 sm:px-6 pt-3 flex-shrink-0">
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('cloud')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all min-h-[40px] ${activeTab === 'cloud'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
              <FiCloud className="w-4 h-4" />
              <span>Cloud Sync {authUser ? '(Active)' : ''}</span>
            </button>

            <button
              onClick={() => setActiveTab('export_import')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all min-h-[40px] ${activeTab === 'export_import'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
              <FiHardDrive className="w-4 h-4" />
              <span>Export / Import</span>
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* TAB 1: CLOUD SYNC */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              {/* If Supabase is unconfigured, show friendly user notice without raw env variable names */}
              {!isSupabaseConfigured && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                  <FiAlertCircle className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Cloud Backup is currently unavailable.</p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">Your data is safely stored on this device. You can export a JSON backup at any time.</p>
                  </div>
                </div>
              )}

              {/* Case 1: USER IS SIGNED IN -> SIMPLE DASHBOARD */}
              {authUser ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center">
                          <FiCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {syncStatus === SYNC_STATUS.SYNCED && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
                                  Synced
                                </span>
                              </>
                            )}
                            {syncStatus === SYNC_STATUS.SYNCING && (
                              <>
                                <FiRefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                                <span className="text-xs sm:text-sm font-bold text-blue-500">
                                  Syncing...
                                </span>
                              </>
                            )}
                            {syncStatus === SYNC_STATUS.OFFLINE && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-xs sm:text-sm font-bold text-amber-500">
                                  Offline (Saved locally)
                                </span>
                              </>
                            )}
                            {syncStatus === SYNC_STATUS.ERROR && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-xs sm:text-sm font-bold text-red-500">
                                  Sync issue (Will retry)
                                </span>
                              </>
                            )}
                            {syncStatus === SYNC_STATUS.LOCAL_ONLY && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                <span className="text-xs sm:text-sm font-bold text-slate-400">
                                  Local
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Last sync: {formatSyncTime(lastSyncedAt)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleManualSync}
                        disabled={isManualSyncing || syncStatus === SYNC_STATUS.SYNCING}
                        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 min-h-[38px]"
                      >
                        <FiRefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                        <span>{isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Card */}
                  <div className="p-4 rounded-2xl border flex items-center justify-between gap-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                        <FiUser className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Account</p>
                        <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                          {authUser.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      disabled={authLoading}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 min-h-[38px] flex-shrink-0"
                    >
                      <FiLogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Case 2: USER IS NOT SIGNED IN */
                <div>
                  {/* Feedback Messages */}
                  {authError && (
                    <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                      <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="mb-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 text-xs text-green-600 dark:text-green-400 flex items-start gap-2">
                      <FiCheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  {/* Subview A: OVERVIEW / BENEFITS (Default simplified screen) */}
                  {authSubView === 'overview' && (
                    <div className="space-y-4">
                      {/* Small benefits area */}
                      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 space-y-2.5 text-xs sm:text-sm">
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                          <span className="text-base text-blue-500">☁</span>
                          <span>Access your data on any device</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                          <span className="text-base text-indigo-500">↻</span>
                          <span>Automatic backup & sync</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                          <span className="text-base text-purple-500">🛡</span>
                          <span>Restore data after reinstalling TimeFlow</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                          <span className="text-base">✓</span>
                          <span>Completely optional</span>
                        </div>
                      </div>

                      {/* Main Action Buttons: Touch-friendly (min-h-[44px]) */}
                      <div className="space-y-2.5 pt-1">
                        <button
                          onClick={() => setAuthSubView('signup')}
                          className="w-full btn-primary text-xs sm:text-sm font-semibold py-3 px-4 min-h-[44px] flex items-center justify-center gap-2 shadow-md shadow-primary-500/20"
                        >
                          <FiShield className="w-4 h-4" />
                          <span>Create Backup Account</span>
                        </button>

                        <div className="text-center pt-1">
                          <p className="text-xs text-slate-400 mb-1.5">Already have an account?</p>
                          <button
                            onClick={() => setAuthSubView('signin')}
                            className="w-full btn-secondary text-xs sm:text-sm font-semibold py-2.5 px-4 min-h-[44px] flex items-center justify-center gap-2"
                          >
                            <FiUser className="w-4 h-4" />
                            <span>Sign In</span>
                          </button>
                        </div>
                      </div>

                      {/* Reassurance note */}
                      <p className="text-[11px] sm:text-xs text-center text-slate-400 dark:text-slate-500 pt-1 leading-relaxed">
                        Your data is currently stored on this device.<br />
                        TimeFlow works offline and without an account.
                      </p>
                    </div>
                  )}

                  {/* Subview B: SIGN IN VIEW */}
                  {authSubView === 'signin' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Back Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setAuthSubView('overview')}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 py-1"
                        >
                          <FiArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sign In</span>
                      </div>

                      <form onSubmit={handleAuthSubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            Email
                          </label>
                          <div className="relative">
                            <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="student@example.com"
                              className="w-full pl-10 pr-3 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                              style={{ color: 'var(--color-text)' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            Password
                          </label>
                          <div className="relative">
                            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="password"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Your password"
                              className="w-full pl-10 pr-3 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                              style={{ color: 'var(--color-text)' }}
                            />
                          </div>

                          {/* Forgot Password Text Link */}
                          <div className="text-right mt-1.5">
                            <button
                              type="button"
                              onClick={() => setAuthSubView('forgot')}
                              className="text-xs text-primary-500 hover:underline font-medium"
                            >
                              Forgot password?
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={authLoading}
                          className="w-full btn-primary min-h-[44px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 mt-2"
                        >
                          {authLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : 'Sign In'}
                        </button>

                        <p className="text-center text-xs text-slate-400 pt-1">
                          Don't have an account?{' '}
                          <button
                            type="button"
                            onClick={() => setAuthSubView('signup')}
                            className="text-primary-500 hover:underline font-semibold"
                          >
                            Create Backup Account
                          </button>
                        </p>
                      </form>
                    </div>
                  )}

                  {/* Subview C: CREATE ACCOUNT VIEW */}
                  {authSubView === 'signup' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Back Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setAuthSubView('overview')}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 py-1"
                        >
                          <FiArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Create Account</span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Create an optional account to protect your TimeFlow data and restore it after reinstalling the app.
                      </p>

                      <form onSubmit={handleAuthSubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            Email
                          </label>
                          <div className="relative">
                            <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="student@example.com"
                              className="w-full pl-10 pr-3 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                              style={{ color: 'var(--color-text)' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            Password
                          </label>
                          <div className="relative">
                            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="password"
                              required
                              minLength={6}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="At least 6 characters"
                              className="w-full pl-10 pr-3 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                              style={{ color: 'var(--color-text)' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            Confirm Password
                          </label>
                          <div className="relative">
                            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="password"
                              required
                              minLength={6}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm password"
                              className="w-full pl-10 pr-3 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                              style={{ color: 'var(--color-text)' }}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={authLoading}
                          className="w-full btn-primary min-h-[44px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 mt-2"
                        >
                          {authLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : 'Create Account & Backup'}
                        </button>

                        <p className="text-center text-xs text-slate-400 pt-1">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => setAuthSubView('signin')}
                            className="text-primary-500 hover:underline font-semibold"
                          >
                            Sign In
                          </button>
                        </p>
                      </form>
                    </div>
                  )}

                  {/* Subview D: FORGOT PASSWORD VIEW */}
                  {authSubView === 'forgot' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Back Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setAuthSubView('signin')}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 py-1"
                        >
                          <FiArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to Sign In</span>
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Password Reset</span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>

                      <form onSubmit={handleAuthSubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            Email Address
                          </label>
                          <div className="relative">
                            <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="student@example.com"
                              className="w-full pl-10 pr-3 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-primary-500"
                              style={{ color: 'var(--color-text)' }}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={authLoading}
                          className="w-full btn-primary min-h-[44px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 mt-2"
                        >
                          {authLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT / IMPORT (CLEAN 2-CARD LAYOUT) */}
          {activeTab === 'export_import' && (
            <div className="space-y-4">
              {/* Feedback messages */}
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

              {/* Card 1: Export Your Data */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    Export Your Data
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Download a backup of your TimeFlow data.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                  <button
                    onClick={handleExport}
                    className="btn-primary text-xs sm:text-sm font-semibold py-2.5 px-4 min-h-[44px] flex items-center justify-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    <span>Export Backup</span>
                  </button>

                  <span className="text-[11px] text-slate-400 text-center sm:text-right">
                    {(state.tasks || []).length} tasks · {historyDaysCount} days
                  </span>
                </div>
              </div>

              {/* Card 2: Restore From Backup */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    Restore From Backup
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Restore data from a previous TimeFlow backup.
                  </p>
                </div>

                {/* File picker */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500
                      file:mr-3 file:py-2.5 file:px-4
                      file:rounded-xl file:border-0
                      file:text-xs file:font-semibold
                      file:bg-primary-50 file:text-primary-700
                      dark:file:bg-primary-950/40 dark:file:text-primary-400
                      hover:file:bg-primary-100 cursor-pointer min-h-[44px]"
                  />
                </div>

                {/* Validation Preview & Strategy Selection */}
                {importPreview && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                        <FiCheck className="w-3.5 h-3.5" />
                        Valid Backup: {importFile?.name}
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

                    {/* Import Strategy Options */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-2.5 rounded-xl border text-left text-xs min-h-[44px] transition-all ${importMode === 'merge'
                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <p className="font-bold">Merge (Safe)</p>
                        <p className="text-[10px] opacity-75">Combines with current data</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-2.5 rounded-xl border text-left text-xs min-h-[44px] transition-all ${importMode === 'replace'
                            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <p className="font-bold">Replace</p>
                        <p className="text-[10px] opacity-75">Overwrites all current data</p>
                      </button>
                    </div>

                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="w-full btn-primary text-xs sm:text-sm py-2.5 min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                      <FiUpload className="w-4 h-4" />
                      <span>{isImporting ? 'Restoring...' : `Import with ${importMode === 'merge' ? 'Merge' : 'Replace'}`}</span>
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
