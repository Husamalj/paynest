import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';
import clsx from 'clsx';

function getStatusColor(status) {
  const map = {
    pending: 'badge-yellow',
    in_progress: 'badge-blue',
    completed: 'badge-green',
  };
  return map[status] || 'badge-gray';
}

function getStatusLabel(status, t) {
  const map = {
    pending: t('pending'),
    in_progress: t('inProgress') || 'In Progress',
    completed: t('completed') || 'Completed',
  };
  return map[status] || status;
}

function daysUntilDeadline(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getDeadlineColor(days) {
  if (days === null) return 'text-slate-400';
  if (days < 0) return 'text-red-600';
  if (days === 0) return 'text-orange-600';
  if (days <= 3) return 'text-orange-500';
  return 'text-slate-600';
}

export default function Tasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    task_name: '',
    employee_id: '',
    deadline: '',
    status: 'pending',
  });

  useEffect(() => {
    Promise.all([loadTasks(), loadEmployees()]);
  }, []);

  const loadTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Error loading employees:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.task_name.trim() || !form.employee_id) {
      setError(t('fillRequired'));
      return;
    }

    try {
      await api.post('/tasks', {
        task_name: form.task_name,
        employee_id: form.employee_id,
        deadline: form.deadline || null,
        status: form.status,
      });
      setSuccess(t('taskAdded'));
      setForm({ task_name: '', employee_id: '', deadline: '', status: 'pending' });
      setShowAdd(false);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setSuccess('Task deleted successfully');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
        <span className="spinner spinner-dark w-5 h-5" />
        {t('loadingData')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('tasks')}</h2>
          <p className="page-subtitle">Manage employee tasks and deadlines</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> {t('addTask')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="ml-auto opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'in_progress', 'completed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors',
              filterStatus === st
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {st === 'in_progress' ? t('inProgress') || 'In Progress' : t(st) || st}
            {' '}
            <span className="ml-1 opacity-70">({statusCounts[st]})</span>
          </button>
        ))}
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-slate-400 text-sm">{t('noTasks')}</div>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const days = daysUntilDeadline(task.deadline);
            const emp = employees.find((e) => e.employee_id === task.employee_id);
            return (
              <div key={task.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <CheckSquare size={20} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-1">{task.task_name}</h3>
                    <div className="flex items-center gap-4 flex-wrap text-sm text-slate-600">
                      {emp && (
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          {emp.name}
                        </div>
                      )}
                      {task.deadline && (
                        <div className={clsx('flex items-center gap-1', getDeadlineColor(days))}>
                          <Calendar size={14} />
                          {new Date(task.deadline).toLocaleDateString()}
                          {days !== null && (
                            <span className="ml-1">
                              ({days < 0 ? `${Math.abs(days)} ${t('days')} overdue` : `${days} ${t('days')} left`})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className={clsx(
                        'form-input py-1 px-2 text-sm',
                        getStatusColor(task.status)
                      )}
                    >
                      <option value="pending">{t('pending')}</option>
                      <option value="in_progress">{t('inProgress') || 'In Progress'}</option>
                      <option value="completed">{t('completed') || 'Completed'}</option>
                    </select>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add task modal */}
      {showAdd && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{t('addTask')}</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="form-label">{t('taskName')} *</label>
                <input
                  className="form-input"
                  value={form.task_name}
                  onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
                  placeholder="Enter task name"
                />
              </div>
              <div>
                <label className="form-label">{t('assignTo')} *</label>
                <select
                  className="form-input"
                  value={form.employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                >
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.employee_id}>
                      {emp.name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">{t('deadline')}</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">{t('taskStatus')}</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="pending">{t('pending')}</option>
                  <option value="in_progress">{t('inProgress') || 'In Progress'}</option>
                  <option value="completed">{t('completed') || 'Completed'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
