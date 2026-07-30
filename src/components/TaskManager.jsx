import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import TimerCard from './TimerCard';
import { FiPlus, FiX, FiSave, FiAlertTriangle, FiUser, FiFilter } from 'react-icons/fi';

const TASK_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

const TASK_ICONS = ['💼', '📚', '🏋️', '😴', '📱', '🎮', '🎵', '🍳', '🚗', '✍️', '🧘', '🎨'];

export default function TaskManager() {
  const { state, workers, addTask, renameTask, deleteTask, setSelectedWorker } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ name: '', worker: '', color: TASK_COLORS[0], icon: TASK_ICONS[0] });
  const [editName, setEditName] = useState('');
  const [showRestricted, setShowRestricted] = useState(false);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!state.appActive) {
      setShowRestricted(true);
      setTimeout(() => setShowRestricted(false), 3000);
      return;
    }
    if (!newTask.name.trim() || !newTask.worker.trim()) return;
    addTask({
      name: newTask.name.trim(),
      worker: newTask.worker.trim(),
      color: newTask.color,
      icon: newTask.icon,
    });
    setNewTask({ name: '', worker: '', color: TASK_COLORS[0], icon: TASK_ICONS[0] });
    setShowAddForm(false);
  };

  const handleRename = (taskId) => {
    if (editName.trim()) {
      renameTask(taskId, editName.trim());
    }
    setEditingTask(null);
    setEditName('');
  };

  const handleStartTask = (e, taskId, mode, targetSeconds) => {
    if (!state.appActive) {
      setShowRestricted(true);
      setTimeout(() => setShowRestricted(false), 3000);
      return;
    }
    // Will be handled by TimerCard
  };

  const runningTimerIds = Object.keys(state.activeTimers);

  // Filter tasks based on selectedWorker
  const filteredTasks = state.selectedWorker === 'All Workers'
    ? state.tasks
    : state.tasks.filter(t => t.worker === state.selectedWorker);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Task Manager
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Start, pause, and manage your time tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Worker Filter Dropdown */}
          {workers.length > 1 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
              <FiFilter className="w-4 h-4 text-slate-400" />
              <select
                value={state.selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="text-sm font-medium bg-transparent outline-none cursor-pointer"
                style={{ color: 'var(--color-text)' }}
              >
                {workers.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => {
              if (!state.appActive) {
                setShowRestricted(true);
                setTimeout(() => setShowRestricted(false), 3000);
                return;
              }
              setShowAddForm(!showAddForm);
            }}
            className="btn-primary flex items-center gap-2"
          >
            {showAddForm ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Add Task'}
          </button>
        </div>
      </div>

      {/* Restricted Toast */}
      {showRestricted && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-pulse">
          <FiAlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Action Restricted
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Please turn ON the Master Active Switch at the top to start tracking activities.
            </p>
          </div>
        </div>
      )}

      {/* Add Task Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Create New Task
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Task Name
                </label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="e.g., Study, Coding, Gym..."
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Worker/Person Name
                </label>
                <input
                  type="text"
                  value={newTask.worker}
                  onChange={(e) => setNewTask({ ...newTask, worker: e.target.value })}
                  placeholder="e.g., Rahul, Amit, Priya..."
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {TASK_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTask({ ...newTask, color })}
                    className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                      newTask.color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                    }`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Icon
              </label>
              <div className="flex gap-2 flex-wrap">
                {TASK_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewTask({ ...newTask, icon })}
                    className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all duration-200 ${
                      newTask.icon === icon
                        ? 'ring-2 ring-offset-2 ring-primary-500 scale-110 bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <FiSave className="w-4 h-4" />
              Create Task
            </button>
          </div>
        </form>
      )}

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map(task => (
          <TimerCard
            key={task.id}
            task={task}
            isEditing={editingTask === task.id}
            editName={editName}
            onStartEditing={() => {
              setEditingTask(task.id);
              setEditName(task.name);
            }}
            onEditNameChange={setEditName}
            onSaveRename={() => handleRename(task.id)}
            onCancelEditing={() => {
              setEditingTask(null);
              setEditName('');
            }}
            onDelete={() => deleteTask(task.id)}
            isTimerRunning={runningTimerIds.includes(task.id)}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
            {state.selectedWorker === 'All Workers'
              ? 'No tasks yet'
              : `No tasks for ${state.selectedWorker}`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {state.selectedWorker === 'All Workers'
              ? 'Click "Add Task" to create your first activity tracker'
              : 'Switch to "All Workers" or create a task for this worker'}
          </p>
        </div>
      )}
    </div>
  );
}

