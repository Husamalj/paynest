import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import api from '../utils/api';

export default function Remote() {
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employee_id: '', start_date: '', end_date: '', label: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([api.get('/remote_assignments'), api.get('/employees')]);
      // Deduplicate by employee_id+start_date+end_date on the frontend as a safety net
      const seen = new Set();
      const unique = (aRes.data || []).filter((a) => {
        const key = `${a.employee_id}|${a.start_date}|${a.end_date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setAssignments(unique);
      setEmployees(eRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (!form.employee_id || !form.start_date || !form.end_date) {
        setError('Please fill required fields');
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      await api.post(`/employees/${form.employee_id}/remote_assignments`, {
        start_date: form.start_date,
        end_date: form.end_date,
        label: form.label,
      });
      setSuccess('Remote assignment added');
      setShowAdd(false);
      setForm({ employee_id: '', start_date: '', end_date: '', label: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await api.delete(`/employees/${a.employee_id}/remote_assignments/${a.id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('remoteMenu')}</h2>
          <p className="page-subtitle">Manage remote assignments for employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setSuccess(''); setError(''); }}>
          <Plus size={14} /> Add Remote
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle /> {error}</div>}
      {success && <div className="alert alert-success"><CheckCircle2 /> {success}</div>}

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('loadingData')}</div>
      ) : assignments.length === 0 ? (
        <div className="card text-center py-12">No remote assignments</div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="card flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-semibold">{a.name?.[0]}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900 truncate">{a.name} <span className="text-neutral">•</span> <span className="font-mono text-xs text-slate-500">{a.emp_id}</span></div>
                    </div>
                    <div className="text-sm text-slate-600 mt-1 truncate">
                      <span className="badge badge-blue mr-2">{a.label || 'Working Remotely'}</span>
                      {new Date(a.start_date).toLocaleDateString()} — {new Date(a.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Remote Assignment</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="form-label">Employee *</label>
                <select className="form-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}>
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.employee_id}>{emp.name} ({emp.employee_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Label</label>
                <input className="form-input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. WFH, Client Visit" />
              </div>
              <div>
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-input" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">End Date *</label>
                <input type="date" className="form-input" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
